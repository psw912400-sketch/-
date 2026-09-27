// 1시간마다 자동 실행됩니다 (netlify.toml의 schedule 설정).
// 최근 방문 로그를 분석해서 "짧은 시간에 반복 방문하는 IP"를 찾아 flagged.json에 기록합니다.
//
// [다음 단계 - 네이버 API 키 발급 후 진행]
// 지금은 의심 IP를 찾아서 목록에 "기록"만 합니다.
// 네이버 검색광고 API 키를 발급받으시면, 이 목록을 실제로 네이버의
// "노출 제한 IP" 설정에 자동으로 등록하는 코드를 추가로 연동해드릴 수 있습니다.
// (naver-api.js에 자리를 마련해뒀습니다)
const { getBlobStore } = require("./lib/blob-store");
const { registerExcludedIp } = require("./lib/naver-api");

const WINDOW_MS = 3 * 60 * 60 * 1000; // 최근 3시간
const THRESHOLD = 5; // 3시간 내 5회 이상이면 의심
const RETENTION_MS = 7 * 24 * 60 * 60 * 1000; // 7일 지난 로그는 삭제

exports.handler = async () => {
  const store = getBlobStore("click-logs");
  const now = Date.now();
  const { blobs } = await store.list({ prefix: "visits/" });

  const counts = {}; // ip -> [timestamps]
  const toDelete = [];

  for (const b of blobs) {
    const record = await store.get(b.key, { type: "json" });
    if (!record) continue;

    if (now - record.ts > RETENTION_MS) {
      toDelete.push(b.key);
      continue;
    }
    if (now - record.ts <= WINDOW_MS) {
      counts[record.ip] = counts[record.ip] || [];
      counts[record.ip].push(record.ts);
    }
  }

  // 오래된 로그 정리 (계속 쌓이지 않도록)
  await Promise.all(toDelete.map((k) => store.delete(k)));

  const flagged = Object.entries(counts)
    .filter(([, ts]) => ts.length >= THRESHOLD)
    .map(([ip, ts]) => ({ ip, count: ts.length, lastSeen: Math.max(...ts) }));

  const flagStore = getBlobStore("abuse-flags");
  const existing = (await flagStore.get("flagged.json", { type: "json" })) || [];
  const byIp = Object.fromEntries(existing.map((f) => [f.ip, f]));

  for (const f of flagged) {
    byIp[f.ip] = {
      ip: f.ip,
      count: f.count,
      lastSeen: f.lastSeen,
      firstFlaggedAt: (byIp[f.ip] && byIp[f.ip].firstFlaggedAt) || now,
      status: (byIp[f.ip] && byIp[f.ip].status) || "pending", // pending | submitted | ignored
    };
  }

  const allFlagged = Object.values(byIp);
  await flagStore.setJSON("flagged.json", allFlagged);

  // 네이버 API 키가 등록되어 있으면, 신규로 의심된 IP를 자동 차단 시도
  let submitted = 0;
  if (process.env.NAVER_API_KEY && process.env.NAVER_SECRET_KEY && process.env.NAVER_CUSTOMER_ID) {
    for (const f of allFlagged) {
      if (f.status === "pending") {
        try {
          await registerExcludedIp(f.ip);
          f.status = "submitted";
          submitted++;
        } catch (e) {
          f.status = "pending"; // 실패하면 다음 시간에 재시도
        }
      }
    }
    await flagStore.setJSON("flagged.json", allFlagged);
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ checked: blobs.length, newlyFlagged: flagged.length, submitted }),
  };
};
