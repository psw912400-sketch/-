# 올바른종합환경 홈페이지 + 부정클릭 방지 기능

## 배포하기 (Netlify 연결)

1. Netlify 프로젝트 설정에서 이 저장소를 "Continuous deployment"로 연결하면, 이후부터는
   여기에 코드가 올라올 때마다 Netlify가 자동으로 배포합니다.
2. Netlify 사이트 설정 > **Environment variables**에서 아래 값을 등록해주세요.

| 변수명 | 설명 | 필수 여부 |
|---|---|---|
| `ADMIN_TOKEN` | 의심 IP 리포트 페이지를 볼 때 쓰는 비밀 토큰 (직접 아무 문자열이나 정하시면 됩니다, 예: 랜덤 영문+숫자 20자) | 필수 |
| `NAVER_API_KEY` | 네이버 검색광고 API 키 (도구 > API 사용 관리에서 발급) | 자동 IP 차단을 원하시면 필요 |
| `NAVER_SECRET_KEY` | 네이버 검색광고 API 시크릿 키 | 자동 IP 차단을 원하시면 필요 |
| `NAVER_CUSTOMER_ID` | 네이버 검색광고 계정 고객 ID (CUST_ID) | 자동 IP 차단을 원하시면 필요 |

## 지금 작동하는 기능

- 네이버(search.naver.com)에서 유입된 방문자의 IP·시간·유입경로를 자동 기록합니다.
- 1시간마다(`netlify/functions/check-abuse.js`) 최근 3시간 내 같은 IP가 5번 이상 방문했는지
  자동으로 확인해서 의심 목록에 올립니다.
- 아래 주소로 접속하면 의심 IP 리포트를 볼 수 있습니다 (URL 자체가 비밀번호 역할을 하니
  남에게 공유하지 마세요):

  ```
  https://올바른종합환경.com/.netlify/functions/abuse-report?token=여기에_ADMIN_TOKEN
  ```

## 아직 안 된 부분 (다음 단계)

`NAVER_API_KEY` 등을 등록해도, "의심 IP를 네이버 노출제한 목록에 자동으로 등록"하는 부분은
아직 완성되지 않았습니다. 네이버 검색광고 API 키를 발급받으시면 함께 제공되는 공식 문서에서
정확한 "노출 제한 IP 등록" API 경로를 확인한 뒤 `netlify/functions/lib/naver-api.js` 파일의
`NAVER_EXCLUDE_IP_PATH` 값만 바꿔주면 자동 차단까지 완성됩니다. (API 키 발급받으시면 말씀해주세요,
그 문서 보고 마무리해드리겠습니다.)

그 전까지는 위 리포트 페이지에서 의심 IP를 직접 확인하고, 네이버 광고 시스템의
"도구 > 광고노출 제한 관리"에서 수동으로 등록하시면 됩니다.
