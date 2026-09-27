// Netlify Blobs 저장소를 안전하게 여는 헬퍼.
//
// 원래는 Netlify가 함수 실행 시 siteID/token을 자동으로 넣어주지만,
// 일부 배포 환경에서는 이 자동 연결이 되지 않아 "MissingBlobsEnvironmentError"가
// 발생할 수 있습니다. 그래서 아래처럼 직접 siteID와 토큰을 넘겨주는 방식으로
// 항상 확실하게 동작하도록 만들었습니다.
//
// 필요한 환경변수 (Netlify 사이트 설정 > Environment variables):
//   BLOBS_SITE_ID    - Site configuration > General > Site details 에 있는 "Site ID"
//   BLOBS_AUTH_TOKEN - 우측 상단 프로필 > User settings > Applications > Personal access tokens 에서 새로 발급한 토큰
const { getStore } = require("@netlify/blobs");

function getBlobStore(name) {
  const siteID = process.env.BLOBS_SITE_ID;
  const token = process.env.BLOBS_AUTH_TOKEN;

  if (siteID && token) {
    return getStore({ name, siteID, token });
  }

  // 수동 값이 없으면 기존 방식(자동 연결)으로 시도
  return getStore(name);
}

module.exports = { getBlobStore };
