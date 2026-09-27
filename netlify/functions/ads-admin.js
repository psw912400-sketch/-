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
//   ?action=schedule&ownerId=...
//     → 캠페인/광고그룹의 현재 요일·시간 타겟팅 설정 조회 (TIME_WEEKLY_TARGET)
//   ?action=set-schedule&ownerId=...&days=MON,TUE,WED,THU,FRI&startHour=9&endHour=18
//     → 요일·시간 타겟팅 설정 (startHour~endHour 시간대만 노출, endHour는 미포함:
//        예) startHour=9&endHour=18 => 09시~17시59분까지 노출)
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

exports.handler = async (event) => {
  const q = event.queryStringParameters || {};
  if (!process.env.ADMIN_TOKEN || q.token !== process.env.ADMIN_TOKEN) {
    return json(401, { error: "Unauthorized" });
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

      case "stats": {
        if (!q.ids) return json(400, { error: "ids 파라미터가 필요합니다 (콤마로 구분된 캠페인/그룹/키워드 ID)" });
        const fields = q.fields || "impCnt,clkCnt,ctr,avgRnk,salesAmt";
        const fieldsArr = fields.split(",").map((f) => f.trim());
        const datePreset = q.datePreset || "last30days";
        const idsArr = JSON.stringify(q.ids.split(",").map((s) => s.trim()));
        const fieldsJson = JSON.stringify(fieldsArr);
        const uri = `/stats?ids=${encodeURIComponent(idsArr)}&fields=${encodeURIComponent(
          fieldsJson
        )}&datePreset=${encodeURIComponent(datePreset)}`;
        const result = await request("GET", uri);
        return json(200, result);
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
        if (!q.ownerId || !q.days || !q.startHour || !q.endHour) {
          return json(400, { error: "ownerId, days(예: MON,TUE), startHour, endHour 파라미터가 필요합니다" });
        }
        const startHour = Number(q.startHour);
        const endHour = Number(q.endHour);
        const activeDays = q.days.split(",").map((d) => d.trim().toUpperCase());
        const mask = buildHourMask(startHour, endHour);

        const target = {};
        for (const d of DAYS) {
          target[d] = activeDays.includes(d) ? mask : 0;
        }

        // 기존 타겟(nccTargetId)을 먼저 찾아서 업데이트해야 합니다 (새로 만드는 게 아니라 수정).
        const existing = await request(
          "GET",
          `/ncc/targets?ownerId=${encodeURIComponent(q.ownerId)}&types=TIME_WEEKLY_TARGET`
        );
        if (!existing || !existing.length) {
          return json(404, {
            error: "이 owner에 대한 TIME_WEEKLY_TARGET이 없습니다. campaignId/adgroupId가 맞는지 확인해주세요.",
          });
        }
        const targetId = existing[0].nccTargetId;

        const result = await request("PUT", `/ncc/targets/${encodeURIComponent(targetId)}`, {
          nccTargetId: targetId,
          ownerId: q.ownerId,
          targetTp: "TIME_WEEKLY_TARGET",
          target,
        });
        return json(200, { appliedMask: mask, activeDays, result });
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
          ],
        });
    }
  } catch (e) {
    return json(500, { error: String(e.message || e) });
  }
};
