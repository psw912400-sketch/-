# 블로그 초안 자동 생성

매주 월·목 오전 9시(KST)에 Claude가 글 초안을 써서 이 저장소의 **Issues**(라벨 `blog-draft`)로 올립니다.
GitHub 앱/이메일 알림으로 받아서, 사진을 넣고 네이버 블로그에 붙여넣어 발행하세요.
(네이버 블로그 글쓰기 공식 API가 종료되어 발행 단계는 직접 하셔야 합니다.)

## 설정 (한 번만)
1. 저장소 **Settings > Secrets and variables > Actions**에 `ANTHROPIC_API_KEY` 등록
2. `blog-automation/style-samples/`에 기존 블로그 글 5~10개를 `.txt`로 붙여넣기
3. `blog-automation/topics.json`에서 주제 추가·수정
4. **Actions > Blog draft > Run workflow**로 바로 시험 실행 가능

## 참고
- 사실 정보(서비스·실적)는 `index.html` 텍스트에서 자동으로 가져옵니다. 홈페이지에 없는 숫자·실적은 쓰지 않도록 지시되어 있습니다.
- 로컬 시험: `ANTHROPIC_API_KEY=... node blog-automation/generate.mjs 0` (콘솔에 출력)
- 모델 변경: 환경변수 `BLOG_MODEL`
