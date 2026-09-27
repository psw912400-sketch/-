// 네이버 검색광고 API 연동 헬퍼.
//
// 서명(인증 헤더) 생성 방식은 네이버 검색광고 API의 표준 인증 방식입니다
// (timestamp + method + path 를 SECRET_KEY로 HMAC-SHA256 서명).
//
// ⚠️ 중요: registerExcludedIp() 함수의 실제 엔드포인트(URL)는 아직 확인되지 않았습니다.
// 네이버 검색광고 관리 시스템에서 API 키를 발급받으시면(도구 > API 사용 관리),
// 함께 제공되는 API 문서에서 "노출 제한 IP 등록" 엔드포인트를 확인한 뒤
// 아래 NAVER_EXCLUDE_IP_PATH 부분만 정확한 경로로 바꿔주면 바로 작동합니다.
// 그 전까지는 이 함수는 에러를 던지고, check-abuse.js가 이를 "pending" 상태로
// 남겨두고 다음 시간에 다시 시도합니다 (즉, 사이트나 다른 기능에는 영향 없음).

const crypto = require("crypto");
const https = require("https");

const BASE_HOST = "api.naver.com";

// TODO(확인 필요): 실제 "노출 제한 IP 등록/수정" API 경로로 교체
const NAVER_EXCLUDE_IP_PATH = "/ncc/restricted-ips"; // 플레이스홀더

function sign(timestamp, method, path, secretKey) {
  const message = `${timestamp}.${method}.${path}`;
  return crypto.createHmac("sha256", secretKey).update(message).digest("base64");
}

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const timestamp = Date.now().toString();
    const apiKey = process.env.NAVER_API_KEY;
    const secretKey = process.env.NAVER_SECRET_KEY;
    const customerId = process.env.NAVER_CUSTOMER_ID;

    if (!apiKey || !secretKey || !customerId) {
      return reject(new Error("네이버 API 키가 설정되지 않았습니다 (환경변수 확인 필요)"));
    }

    const signature = sign(timestamp, method, path, secretKey);
    const payload = body ? JSON.stringify(body) : undefined;

    const options = {
      hostname: BASE_HOST,
      path,
      method,
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
        "X-Timestamp": timestamp,
        "X-API-KEY": apiKey,
        "X-Customer": customerId,
        "X-Signature": signature,
        ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data ? JSON.parse(data) : null);
        } else {
          reject(new Error(`네이버 API 오류 ${res.statusCode}: ${data}`));
        }
      });
    });
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function registerExcludedIp(ip) {
  // 실제 엔드포인트가 확인되기 전까지는 호출을 시도하되,
  // 잘못된 경로라면 자연스럽게 실패하고 다음 주기에 재시도됩니다.
  return request("POST", NAVER_EXCLUDE_IP_PATH, { ip });
}

module.exports = { registerExcludedIp, sign };
