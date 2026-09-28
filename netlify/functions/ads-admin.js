// 네이버 검색광고 관리용 관리자 도구 (입찰가 조회/변경, 순위별 예상 입찰가, 시간대 설정).
//
// ADMIN_TOKEN으로 보호되는 GET 엔드포인트입니다. action 파라미터로 동작을 고릅니다.
// (2026-09-29: ADMIN_TOKEN 값 갱신에 따른 재배포 트리거)
//
//   ?action=campaigns
//     → 캠페인 목록 (id, 이름, 상태)
//   ?action=adgroups&campaignId=...
//     → 특정 캠페인의 광고그룹 목록 (id, 이름, 상태, 기본입찰가)
//   ?action=keywords&adgroupId=...
//     → 특정 광고그룹의 키워드 목록 (id, 키워드, 입찰가, 상태)
//   ?action=estimate&keyword=...&position=3&device=PC
//     → 특정 순위(1~10 PC, 1~5 MOBILE)에 필요한 예상 평균 입찰가 조회
//   ?action=set-bid&keywordId=...&adgroupId=...&bidAmt=650
//     → 키워드 입찰가 변경 (70~100000원, 실제로는 100~1000원 사이가 흔함)
//   ?action=estimate-bulk&type=id&position=3&device=PC&keysB64=...
//     → 최대 200개 키워드(id 또는 keyword 텍스트)의 순위별 예상 입찰가를 한 번에 조회
//   ?action=set-bid-bulk&itemsB64=...
//     → 최대 200개 키워드의 입찰가를 한 번에 변경 ([{nccKeywordId,bidAmt}] 배열을 base64)
//   (요일·시간/지역 타겟팅은 2022년 네이버 API 개편으로 Criterion 방식으로 동작합니다)
//   ?action=criterion-dictionary&type=RL|SD
//     → 타게팅 코드 사전 조회 (RL=지역, SD=요일·시간)
//   ?action=schedule&ownerId=... / ?action=region&ownerId=...
//     → 광고그룹의 현재 요일·시간 / 지역 타겟팅 설정 조회
//   ?action=set-schedule&ownerId=...&days=MON,TUE,WED,THU,FRI&ranges=9-12,13-18
//     → 요일·시간 타겟팅 설정 (여러 시간대를 콤마로 나열, 예: 점심시간 제외)
//   ?action=set-region&ownerId=...&codes=RL09,RL02,RL11
//     → 지역 타겟팅 설정 (코드는 criterion-dictionary?type=RL 조회 결과 사용,
//        예: RL09=서울특별시, RL02=경기도, RL11=인천광역시)
//        ※ set-schedule, set-region 모두 ownerId에 캠페인 ID(cmp-...)를 넣으면
//        그 캠페인 산하 모든 광고그룹에 자동으로 같은 설정을 적용합니다.
//        광고그룹 ID(grp-...)를 넣으면 그 그룹에만 적용됩니다.
const { request } = require("./lib/naver-api");

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body, null, 2),
  };
}

exports.handler = async (event) => {
  const q = event.queryStringParameters || {};
  if (!process.env.ADMIN_TOKEN || q.token !== process.env.ADMIN_TOKEN) {
    return json(401, { error: "Unauthorized" });
  }

  // 대량 배열(estimate-bulk, set-bid-bulk)은 URL 길이 제한을 피하려고 POST 본문으로 받습니다.
  let parsedBody = null;
  if (event.body) {
    try {
      const raw = event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf8") : event.body;
      parsedBody = JSON.parse(raw);
    } catch (e) {
      return json(400, { error: "요청 본문(JSON) 파싱 실패: " + String(e.message || e) });
    }
  }

  try {
    switch (q.action) {
      case "campaigns": {
        const list = await request("GET", "/ncc/campaigns");
        return json(
          200,
          list.map((c) => ({ id: c.nccCampaignId, name: c.name, status: c.status, userLock: c.userLock }))
        );
      }

      // 캠페인 전체를 켜고/끕니다 (userLock). 광고를 잠시 전체 중지하고 싶을 때 사용.
      //   ?action=set-campaign-lock&campaignId=cmp-...&lock=true (중지) 또는 lock=false (재개)
      case "set-campaign-lock": {
        if (!q.campaignId || !q.lock) return json(400, { error: "campaignId, lock(true/false) 파라미터가 필요합니다" });
        const result = await request("PUT", `/ncc/campaigns/${encodeURIComponent(q.campaignId)}?fields=userLock`, {
          nccCampaignId: q.campaignId,
          userLock: q.lock === "true",
        });
        return json(200, result);
      }

      case "adgroups": {
        if (!q.campaignId) return json(400, { error: "campaignId 파라미터가 필요합니다" });
        const list = await request("GET", `/ncc/adgroups?nccCampaignId=${encodeURIComponent(q.campaignId)}`);
        return json(
          200,
          list.map((g) => ({
            id: g.nccAdgroupId,
            name: g.name,
            status: g.status,
            statusReason: g.statusReason,
            bidAmt: g.bidAmt,
          }))
        );
      }

      case "keywords": {
        if (!q.adgroupId) return json(400, { error: "adgroupId 파라미터가 필요합니다" });
        const list = await request("GET", `/ncc/keywords?nccAdgroupId=${encodeURIComponent(q.adgroupId)}`);
        return json(
          200,
          list.map((k) => ({
            id: k.nccKeywordId,
            keyword: k.keyword,
            bidAmt: k.bidAmt,
            useGroupBidAmt: k.useGroupBidAmt,
            status: k.status,
            statusReason: k.statusReason,
          }))
        );
      }

      // 광고그룹의 실제 소재(제목/설명/URL) 목록 조회 - 파워링크 미리보기용
      case "ads": {
        if (!q.adgroupId) return json(400, { error: "adgroupId 파라미터가 필요합니다" });
        const list = await request("GET", `/ncc/ads?nccAdgroupId=${encodeURIComponent(q.adgroupId)}`);
        return json(200, list);
      }

      // 광고그룹에 기본 광고(반응형 검색광고, RSA_AD)를 새로 만듭니다.
      // POST 본문: {"nccAdgroupId":"grp-...","finalUrl":"https://...","headlines":["...", ...],"descriptions":["...", ...]}
      case "create-ad": {
        if (!parsedBody || !parsedBody.nccAdgroupId || !parsedBody.finalUrl) {
          return json(400, { error: "POST 본문에 nccAdgroupId, finalUrl이 필요합니다" });
        }
        const headlines = Array.isArray(parsedBody.headlines) ? parsedBody.headlines : [];
        const descriptions = Array.isArray(parsedBody.descriptions) ? parsedBody.descriptions : [];
        if (!headlines.length || !descriptions.length) {
          return json(400, { error: "headlines, descriptions 배열이 각각 최소 1개 이상 필요합니다" });
        }
        const assets = [
          ...headlines.map((text) => ({ assetType: "TEXT", assetData: { text }, linkType: "HEADLINE" })),
          ...descriptions.map((text) => ({ assetType: "TEXT", assetData: { text }, linkType: "DESCRIPTION" })),
        ];
        const body = {
          nccAdgroupId: parsedBody.nccAdgroupId,
          type: "RSA_AD",
          ad: {
            pc: { final: parsedBody.finalUrl },
            mobile: { final: parsedBody.finalUrl },
          },
          assets,
        };
        const result = await request("POST", "/ncc/ads", body);
        return json(200, result);
      }

      // 특정 광고(소재)를 잠궈서(userLock) 노출을 멈춥니다 - 오래된/일괄 등록된 광고 정리용.
      // ?action=pause-ad&adId=nad-...
      case "pause-ad": {
        if (!q.adId) return json(400, { error: "adId 파라미터가 필요합니다" });
        const result = await request("PUT", `/ncc/ads/${encodeURIComponent(q.adId)}?fields=userLock`, {
          nccAdId: q.adId,
          userLock: true,
        });
        return json(200, result);
      }

      case "estimate": {
        if (!q.keyword || !q.position) {
          return json(400, { error: "keyword, position 파라미터가 필요합니다" });
        }
        const device = (q.device || "PC").toUpperCase();
        const result = await request("POST", "/estimate/average-position-bid/keyword", {
          device,
          items: [{ key: q.keyword, position: Number(q.position) }],
        });
        return json(200, result);
      }

      case "set-bid": {
        if (!q.keywordId || !q.adgroupId || !q.bidAmt) {
          return json(400, { error: "keywordId, adgroupId, bidAmt 파라미터가 필요합니다" });
        }
        const bidAmt = Number(q.bidAmt);
        if (!Number.isFinite(bidAmt) || bidAmt < 70 || bidAmt > 100000) {
          return json(400, { error: "bidAmt는 70~100000 사이 숫자여야 합니다" });
        }
        const result = await request("PUT", `/ncc/keywords/${encodeURIComponent(q.keywordId)}?fields=bidAmt`, {
          nccKeywordId: q.keywordId,
          nccAdgroupId: q.adgroupId,
          bidAmt,
          useGroupBidAmt: false,
        });
        return json(200, result);
      }

      // 한 번에 최대 200개 키워드까지 순위별 예상 입찰가를 조회합니다 (네이버 API 자체 제한).
      // 최대 200개 키워드까지 순위별 예상 입찰가를 한 번에 조회합니다 (네이버 API 자체 제한).
      // URL 길이 제한을 피하려고 keys 배열은 POST 요청 본문(JSON)으로 받습니다:
      //   POST ?action=estimate-bulk&type=id&position=3&device=PC
      //   body: {"keys": ["nkw-...", "nkw-...", ...]}   (최대 200개)
      // type=id면 keys 안의 값은 nccKeywordId, type=keyword면 키워드 텍스트입니다.
      // (레거시: GET + keysB64=base64(JSON배열) 쿼리파라미터도 계속 지원합니다.)
      case "estimate-bulk": {
        if (!q.type || !q.position) {
          return json(400, { error: "type(id|keyword), position 파라미터가 필요합니다" });
        }
        if (!["id", "keyword"].includes(q.type)) {
          return json(400, { error: "type은 id 또는 keyword여야 합니다" });
        }
        let keys;
        if (parsedBody && Array.isArray(parsedBody.keys)) {
          keys = parsedBody.keys;
        } else if (q.keysB64) {
          try {
            keys = JSON.parse(Buffer.from(q.keysB64, "base64").toString("utf8"));
          } catch (e) {
            return json(400, { error: "keysB64 디코딩 실패: " + String(e.message || e) });
          }
        } else {
          return json(400, { error: "POST 본문의 keys 배열 또는 keysB64 파라미터가 필요합니다" });
        }
        if (!Array.isArray(keys) || !keys.length) {
          return json(400, { error: "keys는 비어있지 않은 배열이어야 합니다" });
        }
        if (keys.length > 200) {
          return json(400, { error: "한 번에 최대 200개까지만 가능합니다 (네이버 API 제한)" });
        }
        const device = (q.device || "PC").toUpperCase();
        const position = Number(q.position);
        const items = keys.map((k) => ({ key: k, position }));
        const result = await request("POST", `/estimate/average-position-bid/${q.type}`, { device, items });
        return json(200, result);
      }

      // 최대 200개 키워드까지 입찰가를 한 번에 변경합니다 (네이버 API 자체 제한).
      // URL 길이 제한을 피하려고 items 배열은 POST 요청 본문(JSON)으로 받습니다:
      //   POST ?action=set-bid-bulk
      //   body: {"items": [{"nccKeywordId":"nkw-...","nccAdgroupId":"grp-...","bidAmt":650}, ...]}   (최대 200개)
      // nccAdgroupId는 네이버 bulk 수정 API가 필수로 요구합니다.
      // (레거시: GET + itemsB64=base64(JSON배열) 쿼리파라미터도 계속 지원합니다.)
      case "set-bid-bulk": {
        let items;
        if (parsedBody && Array.isArray(parsedBody.items)) {
          items = parsedBody.items;
        } else if (q.itemsB64) {
          try {
            items = JSON.parse(Buffer.from(q.itemsB64, "base64").toString("utf8"));
          } catch (e) {
            return json(400, { error: "itemsB64 디코딩 실패: " + String(e.message || e) });
          }
        } else {
          return json(400, { error: "POST 본문의 items 배열 또는 itemsB64 파라미터가 필요합니다" });
        }
        if (!Array.isArray(items) || !items.length) {
          return json(400, { error: "items는 비어있지 않은 배열이어야 합니다" });
        }
        if (items.length > 200) {
          return json(400, { error: "한 번에 최대 200개까지만 가능합니다 (네이버 API 제한)" });
        }
        const body = [];
        for (const it of items) {
          if (!it.nccKeywordId || !it.nccAdgroupId || typeof it.bidAmt !== "number") {
            return json(400, { error: "각 항목은 nccKeywordId, nccAdgroupId, bidAmt(숫자)가 필요합니다" });
          }
          if (it.bidAmt < 70 || it.bidAmt > 100000) {
            return json(400, { error: `bidAmt는 70~100000 사이여야 합니다: ${it.nccKeywordId}=${it.bidAmt}` });
          }
          body.push({
            nccKeywordId: it.nccKeywordId,
            nccAdgroupId: it.nccAdgroupId,
            bidAmt: it.bidAmt,
            useGroupBidAmt: false,
          });
        }
        const result = await request("PUT", "/ncc/keywords?fields=bidAmt", body);
        return json(200, result);
      }

      case "stats": {
        if (!q.ids) return json(400, { error: "ids 파라미터가 필요합니다 (콤마로 구분된 캠페인/그룹/키워드 ID)" });
        const fields = q.fields || "impCnt,clkCnt,ctr,avgRnk,salesAmt";
        const fieldsArr = fields.split(",").map((f) => f.trim());
        const datePreset = q.datePreset || "last30days";
        const idsJson = JSON.stringify(q.ids.split(",").map((s) => s.trim()));
        const fieldsJson = JSON.stringify(fieldsArr);
        const uri = `/stats?ids=${encodeURIComponent(idsJson)}&fields=${encodeURIComponent(
          fieldsJson
        )}&datePreset=${encodeURIComponent(datePreset)}`;
        try {
          const result = await request("GET", uri);
          return json(200, result);
        } catch (e1) {
          // 일부 계정/버전은 ids를 콤마 구분 문자열 그대로 요구합니다 - 폴백 시도.
          const uri2 = `/stats?ids=${encodeURIComponent(q.ids)}&fields=${encodeURIComponent(
            fieldsJson
          )}&datePreset=${encodeURIComponent(datePreset)}`;
          const result2 = await request("GET", uri2);
          return json(200, result2);
        }
      }

      // 디버그/탐색용: 임의의 targetTp로 /ncc/targets 조회 (지역 타겟팅 타입명을 확인하기 위함)
      //   ?action=raw-targets&ownerId=grp-...&types=REGION
      case "raw-targets": {
        if (!q.ownerId) return json(400, { error: "ownerId 파라미터가 필요합니다" });
        const typesParam = q.types ? `&types=${encodeURIComponent(q.types)}` : "";
        try {
          const list = await request("GET", `/ncc/targets?ownerId=${encodeURIComponent(q.ownerId)}${typesParam}`);
          return json(200, list);
        } catch (e) {
          return json(200, { error: String(e.message || e) });
        }
      }

      // 디버그/탐색용: 임의의 GET 요청 (path에 쿼리스트링 포함 가능).
      //   ?action=raw-get&path=/ncc/criterion-dictionary/RL
      case "raw-get": {
        if (!q.path) return json(400, { error: "path 파라미터가 필요합니다" });
        try {
          const result = await request("GET", q.path);
          return json(200, result);
        } catch (e) {
          return json(200, { error: String(e.message || e) });
        }
      }

      // 디버그/탐색용: 임의의 PUT 요청을 보냅니다 (지역 타겟팅 필드명을 확인하기 위함).
      //   ?action=raw-put&path=/ncc/adgroups/grp-...&fields=region
      //   POST body: 실제로 보낼 JSON
      case "raw-put": {
        if (!q.path) return json(400, { error: "path 파라미터가 필요합니다" });
        const fieldsQ = q.fields ? `?fields=${encodeURIComponent(q.fields)}` : "";
        try {
          const result = await request("PUT", `${q.path}${fieldsQ}`, parsedBody || {});
          return json(200, result);
        } catch (e) {
          return json(200, { error: String(e.message || e) });
        }
      }

      // 2022년 네이버 API 개편으로 요일·시간/지역 타겟팅은 예전 targets(TIME_WEEKLY_TARGET) 방식이
      // 폐기되고 새로운 Criterion 방식(/ncc/criterion, /ncc/criterion-dictionary)으로 이전되었습니다.
      // 공통 헬퍼: 선택한 dictionaryCode 목록으로 광고그룹의 해당 타입 타겟팅을 "전체 교체"합니다
      // (PUT 요청 바디에 없는 코드는 자동으로 사용안함 처리됨 - 네이버 API 사양).
      async function putCriterion(adgroupId, type, dictionaryCodes) {
        const clean = (v) => (v || "").replace(/\s+/g, "");
        const customerId = Number(clean(process.env.NAVER_CUSTOMER_ID));
        const body = dictionaryCodes.map((code) => ({
          dictionaryCode: code,
          ownerId: adgroupId,
          customerId,
          type,
          value: null,
          bidWeight: 100,
          negative: false,
          enable: true,
        }));
        return request("PUT", `/ncc/criterion/${encodeURIComponent(adgroupId)}/${type}`, body);
      }

      async function forEachAdgroup(ownerId, fn) {
        const isCampaign = ownerId.startsWith("cmp-");
        if (!isCampaign) {
          return [{ adgroupId: ownerId, result: await fn(ownerId) }];
        }
        const adgroups = await request("GET", `/ncc/adgroups?nccCampaignId=${encodeURIComponent(ownerId)}`);
        const results = [];
        for (const g of adgroups) {
          try {
            results.push({ adgroupId: g.nccAdgroupId, result: await fn(g.nccAdgroupId) });
          } catch (e) {
            results.push({ adgroupId: g.nccAdgroupId, error: String(e.message || e) });
          }
        }
        return results;
      }

      // 타게팅 코드 사전 조회 (예: 지역 코드, 요일·시간 코드 목록)
      //   ?action=criterion-dictionary&type=RL (지역) 또는 type=SD (요일/시간)
      case "criterion-dictionary": {
        if (!q.type) return json(400, { error: "type 파라미터가 필요합니다 (예: RL, SD)" });
        const result = await request("GET", `/ncc/criterion-dictionary/${encodeURIComponent(q.type)}`);
        return json(200, result);
      }

      // 광고그룹에 현재 설정된 타게팅 조회 (지역/요일시간/성별/연령 등)
      //   ?action=criterion&adgroupId=grp-...&type=RL
      case "criterion": {
        if (!q.adgroupId || !q.type) return json(400, { error: "adgroupId, type 파라미터가 필요합니다" });
        const result = await request(
          "GET",
          `/ncc/criterion/${encodeURIComponent(q.adgroupId)}?type=${encodeURIComponent(q.type)}`
        );
        return json(200, result);
      }

      // 요일·시간 타겟팅 조회 (호환용 - 실제로는 SD 타입 criterion 조회)
      //   ?action=schedule&ownerId=grp-...
      case "schedule": {
        if (!q.ownerId) return json(400, { error: "ownerId 파라미터가 필요합니다" });
        const list = await request(
          "GET",
          `/ncc/criterion/${encodeURIComponent(q.ownerId)}?type=SD`
        );
        return json(200, list);
      }

      // 요일·시간 타겟팅 설정 (Criterion API, SD 타입).
      //   ?action=set-schedule&ownerId=grp-... 또는 cmp-...&days=MON,TUE,WED,THU,FRI&ranges=9-12,13-18
      // ownerId에 캠페인 ID를 넣으면 산하 모든 광고그룹에 동일 적용됩니다.
      // 주의: 지정 안 한 요일은 "종일 노출"로 남습니다 (요일 자체를 끄는 옵션은 해당 요일의
      // 모든 시간대를 negative:true로 등록해야 하므로, 완전히 끄고 싶은 요일이 있으면 별도 요청하세요).
      case "set-schedule": {
        if (!q.ownerId || !q.days || !q.ranges) {
          return json(400, {
            error: "ownerId, days(예: MON,TUE) 와 ranges(예: 9-12,13-18) 파라미터가 필요합니다",
          });
        }
        const activeDays = q.days.split(",").map((d) => d.trim().toUpperCase());
        const ranges = q.ranges.split(",").map((s) => s.trim());
        const codes = [];
        for (const day of activeDays) {
          for (const r of ranges) {
            const m = r.match(/^(\d{1,2})-(\d{1,2})$/);
            if (!m) return json(400, { error: `ranges 형식이 올바르지 않습니다: "${r}" (예: 9-12,13-18)` });
            const start = m[1].padStart(2, "0");
            const end = m[2].padStart(2, "0");
            codes.push(`SD${day}${start}${end}`);
          }
        }
        const results = await forEachAdgroup(q.ownerId, (adgroupId) => putCriterion(adgroupId, "SD", codes));
        return json(200, { codes, activeDays, ranges, results });
      }

      // 지역 타겟팅 조회 (호환용 - RL 타입 criterion 조회)
      case "region": {
        if (!q.ownerId) return json(400, { error: "ownerId 파라미터가 필요합니다" });
        const list = await request("GET", `/ncc/criterion/${encodeURIComponent(q.ownerId)}?type=RL`);
        return json(200, list);
      }

      // 지역 타겟팅 설정 (Criterion API, RL 타입).
      //   ?action=set-region&ownerId=grp-... 또는 cmp-...&codes=RL09,RL02,RL11
      // 코드는 criterion-dictionary?type=RL 조회 결과의 dictionaryCode를 사용합니다.
      // (예: RL09=서울특별시, RL02=경기도, RL11=인천광역시 - 시/도 단위)
      // ownerId에 캠페인 ID를 넣으면 산하 모든 광고그룹에 동일 적용됩니다.
      case "set-region": {
        if (!q.ownerId || !q.codes) {
          return json(400, { error: "ownerId, codes(예: RL09,RL02,RL11) 파라미터가 필요합니다" });
        }
        const codes = q.codes.split(",").map((c) => c.trim());
        const results = await forEachAdgroup(q.ownerId, (adgroupId) => putCriterion(adgroupId, "RL", codes));
        return json(200, { codes, results });
      }

      case "adgroup-targets": {
        if (!q.adgroupId) return json(400, { error: "adgroupId 파라미터가 필요합니다" });
        const result = await request("GET", `/ncc/adgroups/${encodeURIComponent(q.adgroupId)}/targets`);
        return json(200, result);
      }

      // 비즈채널(사이트/전화번호/주소 등) 목록 조회. channelTp로 필터 가능 (SITE, PHONE, ADDRESS, ...).
      case "channels": {
        const uri = q.channelTp ? `/ncc/channels?channelTp=${encodeURIComponent(q.channelTp)}` : "/ncc/channels";
        const result = await request("GET", uri);
        return json(200, result);
      }

      // 확장소재 목록 조회 (ownerId = 캠페인 또는 광고그룹 ID)
      case "ad-extensions": {
        if (!q.ownerId) return json(400, { error: "ownerId 파라미터가 필요합니다" });
        const result = await request("GET", `/ncc/ad-extensions?ownerId=${encodeURIComponent(q.ownerId)}`);
        return json(200, result);
      }

      // 확장소재를 최대 50개까지 한 번에 생성합니다. URL 길이 제한을 피하려고 POST 본문으로 받습니다.
      //   POST ?action=create-ad-extensions
      //   body: {"items": [
      //     {"ownerId":"grp-...","type":"PHONE","pcChannelId":"bsn-...","mobileChannelId":"bsn-...","adExtension":null},
      //     {"ownerId":"grp-...","type":"PROMOTION","pcChannelId":"bsn-...","mobileChannelId":"bsn-...",
      //      "adExtension":{"basicText":"...","additionalText":"..."}},
      //     {"ownerId":"grp-...","type":"SUB_LINKS","pcChannelId":"bsn-...","mobileChannelId":"bsn-...",
      //      "adExtension":[{"name":"...","final":"https://..."}, ...]}
      //   ]}
      // 각 항목은 네이버 API에 개별 POST /ncc/ad-extensions 호출로 순서대로 생성됩니다 (이 엔드포인트는 벌크 생성 자체를 지원하지 않음).
      case "create-ad-extensions": {
        if (!parsedBody || !Array.isArray(parsedBody.items) || !parsedBody.items.length) {
          return json(400, { error: "POST 본문에 비어있지 않은 items 배열이 필요합니다" });
        }
        if (parsedBody.items.length > 50) {
          return json(400, { error: "한 번에 최대 50개까지만 가능합니다" });
        }
        const results = [];
        for (const it of parsedBody.items) {
          if (!it.ownerId || !it.type || !it.pcChannelId || !it.mobileChannelId) {
            results.push({ error: "ownerId, type, pcChannelId, mobileChannelId가 필요합니다", item: it });
            continue;
          }
          try {
            const created = await request("POST", "/ncc/ad-extensions", {
              ownerId: it.ownerId,
              type: it.type,
              pcChannelId: it.pcChannelId,
              mobileChannelId: it.mobileChannelId,
              adExtension: it.adExtension != null ? it.adExtension : undefined,
              userLock: false,
            });
            results.push({ ok: true, ownerId: it.ownerId, type: it.type, result: created });
          } catch (e) {
            results.push({ ok: false, ownerId: it.ownerId, type: it.type, error: String(e.message || e) });
          }
        }
        return json(200, { results });
      }

      // 확장소재는 내용(adExtension) 자체는 수정이 안 되고(네이버 API 제약, 실측 확인됨),
      // userLock(끄기/켜기)만 변경 가능합니다. 내용을 바꾸려면 새로 만들고 기존 것은 꺼야 합니다.
      //   ?action=pause-ad-extension&adExtensionId=ext-...
      case "pause-ad-extension": {
        if (!q.adExtensionId) return json(400, { error: "adExtensionId 파라미터가 필요합니다" });
        const result = await request(
          "PUT",
          `/ncc/ad-extensions/${encodeURIComponent(q.adExtensionId)}?fields=userLock`,
          {
            nccAdExtensionId: q.adExtensionId,
            userLock: true,
          }
        );
        return json(200, result);
      }

      default:
        return json(400, {
          error: "알 수 없는 action입니다.",
          available: [
            "campaigns",
            "adgroups",
            "keywords",
            "ads",
            "estimate",
            "set-bid",
            "stats",
            "schedule",
            "set-schedule",
            "region",
            "set-region",
            "criterion",
            "criterion-dictionary",
            "adgroup-targets",
            "estimate-bulk",
            "set-bid-bulk",
            "channels",
            "ad-extensions",
            "create-ad-extensions",
            "pause-ad-extension",
            "set-campaign-lock",
          ],
        });
    }
  } catch (e) {
    return json(500, { error: String(e.message || e) });
  }
};
