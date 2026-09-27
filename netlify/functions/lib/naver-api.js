// 네이버 검색광고 API 연동 헬퍼.
//
// 서명(인증 헤더) 생성 방식: timestamp + method + uri 를 SECRET_KEY로 HMAC-SHA256 서명
// (네이버 공식 파이썬/자바 샘플 코드의 signaturehelper와 동일한 방식).
//
// "노출 제한 IP 등록" 엔드포인트는 네이버 공식 API 문서 저장소
// (github.com/naver/searchad-apidoc, gh-pages 브랜치의 swagger 스펙 원본)를 직접 확인해서
// 찾은 값입니다: IpExclusion 리소스, POST /tool/ip-exclusions.
const crypto = require("crypto");
const https = require("https");

// 공식 파이썬 샘플 코드 기준 실제 운영 서버 주소입니다 (문서 사이트의 데모 호스트가 아님).
const BASE_HOST = "api.searchad.naver.com";

const IP_EXCLUSIONS_PATH = "/tool/ip-exclusions";

function sign(timestamp, method, uri, secretKey) {
  const message = `${timestamp}.${method}.${uri}`;
  return crypto.createHmac("sha256", secretKey).update(message).digest("base64");
}

function request(method, uri, body) {
  return new Promise((resolve, reject) => {
    const timestamp = Date.now().toString();
    // 환경변수를 Netlify에 붙여넣는 과정에서 앞뒤 공백이나 줄바꿈이 섞여 들어가는 경우가 있어서,
    // HTTP 헤더에 넣기 전에 항상 trim() 해서 정리합니다.
    const apiKey = (process.env.NAVER_API_KEY || "").trim();
    const secretKey = (process.env.NAVER_SECRET_KEY || "").trim();
    const customerId = (process.env.NAVER_CUSTOMER_ID || "").trim();

    if (!apiKey || !secretKey || !customerId) {
      return reject(new Error("네이버 API 키가 설정되지 않았습니다 (환경변수 확인 필요)"));
    }

    const signature = sign(timestamp, method, uri, secretKey);
    const payload = body ? JSON.stringify(body) : undefined;

    const options = {
      hostname: BASE_HOST,
      path: uri,
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

// 이미 등록된 제외 IP 목록을 가져옵니다 (중복 등록 방지용).
async function listExcludedIps() {
  const result = await request("GET", IP_EXCLUSIONS_PATH);
  return Array.isArray(result) ? result : [];
}

async function registerExcludedIp(ip) {
  const existing = await listExcludedIps();
  const already = existing.some((e) => e.filterIp === ip);
  if (already) {
    return { skipped: true, reason: "already registered" };
  }

  return request("POST", IP_EXCLUSIONS_PATH, {
    filterIp: ip,
    memo: "부정클릭 자동 탐지 (사이트 방문 로그 기반)",
  });
}

module.exports = { registerExcludedIp, listExcludedIps, sign };
