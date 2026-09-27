# 올바른종합환경 홈페이지 + 부정클릭 방지 기능

## 배포하기 (Netlify 연결)

1. Netlify 프로젝트 설정에서 이 저장소를 "Continuous deployment"로 연결하면, 이후부터는
   여기에 코드가 올라올 때마다 Netlify가 자동으로 배포합니다.
2. Netlify 사이트 설정 > **Environment variables**에서 아래 값을 등록해주세요.

| 변수명 | 설명 | 필수 여부 |
|---|---|---|
| `ADMIN_TOKEN` | 의심 IP 리포트 페이지를 볼 때 쓰는 비밀 토큰 (직접 아무 문자열이나 정하시면 됩니다, 예: 랜덤 영문+숫자 20자) | 필수 |
| `BLOBS_SITE_ID` | Netlify **Project configuration > General > Project details**에 있는 "Project ID"(=Site ID) 값 | 필수 |
| `BLOBS_AUTH_TOKEN` | Netlify 우측 상단 프로필 아이콘 > **User settings > Applications > Personal access tokens > New access token**에서 새로 발급한 토큰 | 필수 |
| `NAVER_API_KEY` | 네이버 검색광고 API 키 (도구 > API 사용 관리에서 발급) | 자동 IP 차단을 원하시면 필요 |
| `NAVER_SECRET_KEY` | 네이버 검색광고 API 시크릿 키 | 자동 IP 차단을 원하시면 필요 |
| `NAVER_CUSTOMER_ID` | 네이버 검색광고 계정 고객 ID (CUST_ID) | 자동 IP 차단을 원하시면 필요 |

> `BLOBS_SITE_ID`/`BLOBS_AUTH_TOKEN`는 방문 기록 저장(Netlify Blobs)이 일부 배포 환경에서
> 자동으로 연결되지 않는 문제 때문에 직접 지정해주는 값입니다. ("This function has crashed -
> MissingBlobsEnvironmentError" 오류가 났다면 이 두 값이 빠졌거나 잘못된 것입니다.)

## 지금 작동하는 기능

- 네이버(search.naver.com)에서 유입된 방문자의 IP·시간·유입경로를 자동 기록합니다.
- 1시간마다(`netlify/functions/check-abuse.js`) 최근 3시간 내 같은 IP가 5번 이상 방문했는지
  자동으로 확인해서 의심 목록에 올립니다.
- `NAVER_API_KEY`/`NAVER_SECRET_KEY`/`NAVER_CUSTOMER_ID`가 등록되어 있으면, 새로 의심된 IP를
  네이버 검색광고의 "노출 제한 IP" 목록에 **자동으로 등록**합니다 (이미 등록된 IP는 중복 등록하지
  않습니다).
- 아래 주소로 접속하면 의심 IP 리포트를 볼 수 있습니다 (URL 자체가 비밀번호 역할을 하니
  남에게 공유하지 마세요):

  ```
  https://올바른종합환경.com/.netlify/functions/abuse-report?token=여기에_ADMIN_TOKEN
  ```

  리포트의 "상태" 칸이 `submitted`면 네이버에 자동 등록까지 완료된 IP이고, `pending`이면
  아직(키 미등록 또는 일시적 오류로) 등록 대기 중인 IP입니다 — 다음 시간에 자동으로 재시도합니다.

## 확인 방법

네이버 검색광고 관리 시스템(manage.searchad.naver.com) > **도구 > 광고노출 제한 관리**에서
자동 등록된 IP가 실제로 목록에 올라오는지 확인해보시면 됩니다.
