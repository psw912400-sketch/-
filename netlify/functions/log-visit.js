// 네이버(검색결과)에서 들어온 방문을 기록하는 함수.
// 방문자 경험에는 전혀 영향을 주지 않도록, 어떤 경우에도 빠르게 응답합니다.
//
// 이 함수는 광고 자동화 도구 프로젝트(chimerical-mandazi-8f1c1f)에 배포되지만,
// 실제로 이 함수를 호출하는 곳은 다른 도메인(www.올바른종합환경.com, 드래그앤드롭 배포라
// Functions가 없음)이기 때문에 CORS(다른 도메인 간 요청 허용) 헤더가 필요합니다.
const { getBlobStore } = require("./lib/blob-store");

const ALLOWED_ORIGINS = [
  "https://www.올바른종합환경.com",
  "https://올바른종합환경.com",
];

function corsHeaders(origin) {
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

exports.handler = async (event) => {
  const origin = event.headers.origin || event.headers.Origin || "";
  const headers = corsHeaders(origin);

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: "Method Not Allowed" };
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

    return { statusCode: 204, headers, body: "" };
  } catch (e) {
    // 로깅 실패가 사이트 이용에 영향을 주면 안 되므로 조용히 200 처리
    return { statusCode: 200, headers, body: "" };
  }
};
