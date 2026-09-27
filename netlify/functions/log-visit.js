// 네이버(검색결과)에서 들어온 방문을 기록하는 함수.
// 방문자 경험에는 전혀 영향을 주지 않도록, 어떤 경우에도 빠르게 응답합니다.
const { getBlobStore } = require("./lib/blob-store");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const ip =
      event.headers["x-nf-client-connection-ip"] ||
      (event.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
      "unknown";

    let body = {};
    try {
      body = JSON.parse(event.body || "{}");
    } catch (_) {
      // sendBeacon으로 온 Blob 본문도 event.body에 문자열로 들어오므로 위에서 대부분 처리됨
    }

    const record = {
      ip,
      ref: String(body.ref || "").slice(0, 300),
      page: String(body.page || "").slice(0, 300),
      ua: String(event.headers["user-agent"] || "").slice(0, 200),
      ts: Date.now(),
    };

    const store = getBlobStore("click-logs");
    const key = `visits/${record.ts}-${Math.random().toString(36).slice(2, 8)}.json`;
    await store.setJSON(key, record);

    return { statusCode: 204, body: "" };
  } catch (e) {
    // 로깅 실패가 사이트 이용에 영향을 주면 안 되므로 조용히 200 처리
    return { statusCode: 200, body: "" };
  }
};
