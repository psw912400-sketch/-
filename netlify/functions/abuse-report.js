// 의심 IP 리포트를 보는 페이지입니다.
// 아래 주소로 접속하면 확인할 수 있습니다 (URL은 비밀번호처럼 취급해서 남에게 공유하지 마세요):
//   https://올바른종합환경.com/.netlify/functions/abuse-report?token=여기에_ADMIN_TOKEN_값
//
// ADMIN_TOKEN은 Netlify 사이트 설정 > Environment variables 에서 직접 정하시면 됩니다.
const { getBlobStore } = require("./lib/blob-store");

exports.handler = async (event) => {
  const token = event.queryStringParameters && event.queryStringParameters.token;
  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
    return { statusCode: 401, body: "Unauthorized" };
  }

  const flagStore = getBlobStore("abuse-flags");
  const flagged = (await flagStore.get("flagged.json", { type: "json" })) || [];
  flagged.sort((a, b) => b.count - a.count);

  const rows = flagged
    .map(
      (f) => `<tr>
        <td>${f.ip}</td>
        <td>${f.count}</td>
        <td>${new Date(f.lastSeen).toLocaleString("ko-KR")}</td>
        <td>${f.status}</td>
      </tr>`
    )
    .join("");

  const html = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <title>부정클릭 의심 IP 리포트</title>
  <style>
    body { font-family: -apple-system, sans-serif; padding: 24px; color: #222; }
    table { border-collapse: collapse; width: 100%; margin-top: 16px; }
    td, th { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
    th { background: #f5f5f5; }
    caption { text-align: left; color: #666; margin-bottom: 8px; }
  </style>
</head>
<body>
  <h1>부정클릭 의심 IP 리포트</h1>
  <p>네이버(search.naver.com)에서 유입된 방문 중, 최근 3시간 이내 같은 IP가 5회 이상 접속한 경우를 자동으로 표시합니다.</p>
  <table>
    <caption>총 ${flagged.length}건</caption>
    <tr><th>IP 주소</th><th>3시간 내 방문 횟수</th><th>마지막 방문 시각</th><th>상태</th></tr>
    ${rows || '<tr><td colspan="4">아직 의심되는 IP가 없습니다.</td></tr>'}
  </table>
</body>
</html>`;

  return {
    statusCode: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
    body: html,
  };
};
