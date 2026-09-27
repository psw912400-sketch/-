// 네이버 검색광고 관리용 관리자 도구 (입찰가 조회/변경, 순위별 예상 입찰가, 시간대 설정).
//
// ADMIN_TOKEN으로 보호되는 GET 엔드포인트입니다. action 파라미터로 동작을 고릅니다.
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
//   ?action=schedule&ownerId=...
//     → 캠페인/광고그룹의 현재 요일·시간 타겟팅 설정 조회 (TIME_WEEKLY_TARGET)
//   ?action=set-schedule&ownerId=...&days=MON,TUE,WED,THU,FRI&startHour=9&endHour=18
//     → 요일·시간 타겟팅 설정 (startHour~endHour 시간대만 노출, endHour는 미포함:
//        예) startHour=9&endHour=18 => 09시~17시59분까지 노출)
//   ?action=set-schedule&ownerId=...&days=MON,TUE,WED,THU,FRI&ranges=9-12,13-18
//     → 여러 시간대(예: 점심시간 12시~13시 제외) 설정. ranges는 "시작-끝" 구간을
//        콤마로 나열 (각 구간의 끝 시간은 미포함). startHour/endHour 대신 사용 가능.
//        ※ 네이버는 요일·시간 타겟팅을 캠페인이 아니라 "광고그룹" 단위로만 지원합니다.
//        ownerId에 캠페인 ID(cmp-...)를 넣으면 그 캠페인 산하 모든 광고그룹에
//        자동으로 같은 설정을 적용합니다. 광고그룹 ID(grp-...)를 넣으면 그 그룹에만 적용됩니다.
const { request } = require("./lib/naver-api");

const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body, null, 2),
  };
}

// startHour(포함) ~ endHour(미포함) 사이의 시간대만 켜진 24비트 마스크를 만듭니다.
// 비트 순서: bit 0 = 0시, bit 23 = 23시 (네이버 공식 예시로 확인된 순서).
function buildHourMask(startHour, endHour) {
  let mask = 0;
  for (let h = startHour; h < endHour; h++) {
    mask += Math.pow(2, h);
  }
  return mask;
}

// "9-12,13-18" 같은 문자열을 받아 여러 구간을 합친 마스크를 만듭니다
// (각 구간 끝 시간은 미포함, 예: 9-12 => 9,10,11시).
function buildHourMaskFromRanges(rangesStr) {
  let mask = 0;
  const parts = rangesStr.split(",").map((s) => s.trim()).filter(Boolean);
  for (const part of parts) {
    const m = part.match(/^(\d{1,2})-(\d{1,2})$/);
    if (!m) throw new Error(`ranges 형식이 올바르지 않습니다: "${part}" (예: 9-12,13-18)`);
    const start = Number(m[1]);
    const end = Number(m[2]);
    mask |= buildHourMask(start, end);
  }
  return mask;
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
      //   body: {"items": [{"nccKeywordId":"nkw-...","bidAmt":650}, ...]}   (최대 200개)
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
          if (!it.nccKeywordId || typeof it.bidAmt !== "number") {
            return json(400, { error: "각 항목은 nccKeywordId, bidAmt(숫자)가 필요합니다" });
          }
          if (it.bidAmt < 70 || it.bidAmt > 100000) {
            return json(400, { error: `bidAmt는 70~100000 사이여야 합니다: ${it.nccKeywordId}=${it.bidAmt}` });
          }
          body.push({ nccKeywordId: it.nccKeywordId, bidAmt: it.bidAmt, useGroupBidAmt: false });
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

      case "schedule": {
        if (!q.ownerId) return json(400, { error: "ownerId 파라미터가 필요합니다 (캠페인 또는 광고그룹 ID)" });
        const list = await request(
          "GET",
          `/ncc/targets?ownerId=${encodeURIComponent(q.ownerId)}&types=TIME_WEEKLY_TARGET`
        );
        return json(200, list);
      }

      case "set-schedule": {
        if (!q.ownerId || !q.days || !(q.ranges || (q.startHour && q.endHour))) {
          return json(400, {
            error:
              "ownerId, days(예: MON,TUE) 파라미터와, startHour+endHour 또는 ranges(예: 9-12,13-18) 파라미터가 필요합니다",
          });
        }
        const activeDays = q.days.split(",").map((d) => d.trim().toUpperCase());
        let mask;
        try {
          mask = q.ranges ? buildHourMaskFromRanges(q.ranges) : buildHourMask(Number(q.startHour), Number(q.endHour));
        } catch (e) {
          return json(400, { error: String(e.message || e) });
        }

        const target = {};
        for (const d of DAYS) {
          target[d] = activeDays.includes(d) ? mask : 0;
        }

        // 네이버 API에는 TIME_WEEKLY_TARGET을 "새로 만드는" 엔드포인트가 따로 없습니다
        // (targets 리소스는 GET/PUT만 있고, 기존 타겟이 있어야 PUT으로 수정 가능).
        // 그리고 요일·시간 타겟팅은 캠페인이 아니라 "광고그룹" 단위로만 걸 수 있습니다
        // (캠페인 PUT은 userLock/budget/period만 지원, targetTime은 광고그룹 PUT에만 있음).
        // 그래서 처음 설정하는 경우엔 광고그룹을 PUT(?fields=targetTime)해서 만들어야 합니다.
        async function applyToAdgroup(adgroupId) {
          const existing = await request(
            "GET",
            `/ncc/targets?ownerId=${encodeURIComponent(adgroupId)}&types=TIME_WEEKLY_TARGET`
          );
          if (existing && existing.length) {
            const targetId = existing[0].nccTargetId;
            return {
              adgroupId,
              created: false,
              result: await request("PUT", `/ncc/targets/${encodeURIComponent(targetId)}`, {
                nccTargetId: targetId,
                ownerId: adgroupId,
                targetTp: "TIME_WEEKLY_TARGET",
                target,
              }),
            };
          }
          return {
            adgroupId,
            created: true,
            result: await request(
              "PUT",
              `/ncc/adgroups/${encodeURIComponent(adgroupId)}?fields=targetTime`,
              {
                nccAdgroupId: adgroupId,
                targets: [{ targetTp: "TIME_WEEKLY_TARGET", target }],
              }
            ),
          };
        }

        const isCampaign = q.ownerId.startsWith("cmp-");
        if (!isCampaign) {
          const r = await applyToAdgroup(q.ownerId);
          return json(200, { appliedMask: mask, activeDays, ...r });
        }

        // 캠페인 ID가 들어오면, 그 캠페인의 모든 광고그룹에 동일하게 적용합니다.
        const adgroups = await request(
          "GET",
          `/ncc/adgroups?nccCampaignId=${encodeURIComponent(q.ownerId)}`
        );
        const results = [];
        for (const g of adgroups) {
          try {
            results.push(await applyToAdgroup(g.nccAdgroupId));
          } catch (e) {
            results.push({ adgroupId: g.nccAdgroupId, error: String(e.message || e) });
          }
        }
        return json(200, {
          appliedMask: mask,
          activeDays,
          campaignId: q.ownerId,
          adgroupCount: adgroups.length,
          results,
        });
      }

      case "adgroup-targets": {
        if (!q.adgroupId) return json(400, { error: "adgroupId 파라미터가 필요합니다" });
        const result = await request("GET", `/ncc/adgroups/${encodeURIComponent(q.adgroupId)}/targets`);
        return json(200, result);
      }

      default:
        return json(400, {
          error: "알 수 없는 action입니다.",
          available: [
            "campaigns",
            "adgroups",
            "keywords",
            "estimate",
            "set-bid",
            "stats",
            "schedule",
            "set-schedule",
            "adgroup-targets",
            "estimate-bulk",
            "set-bid-bulk",
          ],
        });
    }
  } catch (e) {
    return json(500, { error: String(e.message || e) });
  }
};
