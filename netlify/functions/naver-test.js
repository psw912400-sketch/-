// 네이버 API 키(NAVER_API_KEY / NAVER_SECRET_KEY / NAVER_CUSTOMER_ID)가 제대로
// 연결되는지만 바로 확인해보는 테스트 페이지입니다. 실제 의심 IP가 잡히기를 기다리지 않고도
// "현재 등록된 노출 제한 IP 목록"을 가져와보면서 연결 여부를 바로 알 수 있습니다.
//
// 접속 주소 (ADMIN_TOKEN은 abuse-report와 동일한 값 사용):
//   https://올바른종합환경.com/.netlify/functions/naver-test?token=여기에_ADMIN_TOKEN
const { listExcludedIps } = require("./lib/naver-api");

exports.handler = async (event) => {
  const token = event.queryStringParameters && event.queryStringParameters.token;
  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
    return { statusCode: 401, body: "Unauthorized" };
  }

  if (!process.env.NAVER_API_KEY || !process.env.NAVER_SECRET_KEY || !process.env.NAVER_CUSTOMER_ID) {
    return {
      statusCode: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
      body: `<p>❌ 네이버 API 환경변수(NAVER_API_KEY / NAVER_SECRET_KEY / NAVER_CUSTOMER_ID)가 아직 등록되지 않았습니다.</p>`,
    };
  }

  try {
    const list = await listExcludedIps();
    const rows = list
      .map((e) => `<tr><td>${e.filterIp}</td><td>${e.memo || ""}</td><td>${e.regTm || ""}</td></tr>`)
      .join("");

    return {
      statusCode: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
      body: `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><title>네이버 API 연결 테스트</title>
<style>body{font-family:-apple-system,sans-serif;padding:24px;} table{border-collapse:collapse;width:100%;margin-top:16px;} td,th{border:1px solid #ddd;padding:8px 12px;text-align:left;} th{background:#f5f5f5;}</style>
</head><body>
<h1>✅ 네이버 API 연결 성공</h1>
<p>인증에 성공했고, 현재 네이버에 등록된 노출 제한 IP 목록을 정상적으로 가져왔습니다 (총 ${list.length}건).</p>
<table><tr><th>IP</th><th>메모</th><th>등록 시각</th></tr>${rows || '<tr><td colspan="3">아직 등록된 IP가 없습니다.</td></tr>'}</table>
</body></html>`,
    };
  } catch (e) {
    return {
      statusCode: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
      body: `<p>❌ 네이버 API 호출에 실패했습니다: ${String(e.message || e).replace(/</g, "&lt;")}</p>
<p>API 키/시크릿 키/고객 ID 값이 정확한지, Netlify 환경변수에 오타 없이 들어갔는지 확인해주세요.</p>`,
    };
  }
};
