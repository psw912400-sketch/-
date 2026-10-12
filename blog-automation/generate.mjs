// 네이버 블로그용 글 초안을 Claude로 생성해 GitHub Issue로 올립니다.
// 사용: node blog-automation/generate.mjs [주제번호]
// 환경변수: ANTHROPIC_API_KEY(필수), GITHUB_TOKEN + GITHUB_REPOSITORY(없으면 콘솔에만 출력), BLOG_MODEL(선택)
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "blog-automation");
const MODEL = process.env.BLOG_MODEL || "claude-sonnet-5-5";

const topics = JSON.parse(readFileSync(join(dir, "topics.json"), "utf8"));

// 주제 선택: 인자 > 주 2회 실행 기준 자동 순환
function pickIndex() {
  const arg = process.argv[2];
  if (arg !== undefined && /^\d+$/.test(arg)) return Number(arg) % topics.length;
  const now = new Date();
  const week = Math.floor((now - new Date(now.getUTCFullYear(), 0, 1)) / (7 * 86400000));
  const slot = now.getUTCDay() >= 4 ? 1 : 0; // 월=0, 목=1
  return (week * 2 + slot) % topics.length;
}
const topic = topics[pickIndex()];

// 홈페이지 텍스트를 사실 자료로 사용 (홈페이지를 고치면 자동 반영)
const facts = readFileSync(join(root, "index.html"), "utf8")
  .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;/g, " ")
  .replace(/\s+/g, " ")
  .trim()
  .slice(0, 14000);

// 사용자의 기존 블로그 글 (말투·구조 참고용)
const samplesDir = join(dir, "style-samples");
const samples = existsSync(samplesDir)
  ? readdirSync(samplesDir)
      .filter((f) => /\.(md|txt)$/i.test(f) && f.toLowerCase() !== "readme.md")
      .sort()
      .map((f) => `<sample file="${f}">\n${readFileSync(join(samplesDir, f), "utf8").slice(0, 6000)}\n</sample>`)
      .join("\n")
  : "";

const system = `당신은 '올바른종합환경'(B2B 건물위생관리·청소 전문 업체)의 네이버 블로그 담당자입니다.
<style_samples> 안의 기존 글의 말투, 문단 길이, 소제목 방식, 마무리 문구를 최대한 비슷하게 따라 쓰세요.
규칙:
- 사실 근거는 <homepage_facts>에 있는 내용으로만 씁니다. 가격, 숫자, 고객명, 실적, 자격은 거기에 없으면 절대 지어내지 마세요.
- 과장·허위 표현(최고, 100% 보장 등)과 타사 비방은 쓰지 않습니다.
- 사진이 들어갈 자리는 [사진: 어떤 사진인지 설명] 형태로 표시합니다.
- 키워드를 억지로 반복하지 말고 읽는 사람(시설 담당자·기관 관리자)에게 도움이 되는 정보 위주로 씁니다.
- 출력 형식: 첫 줄은 "# 제목", 이어서 본문(소제목은 ##), 마지막 줄은 해시태그 7~10개(공백으로 구분). 그 외 설명은 쓰지 마세요.`;

const user = `<style_samples>
${samples || "(아직 샘플 없음 - 친근하고 전문적인 존댓말, 짧은 문단으로 작성)"}
</style_samples>

<homepage_facts>
${facts}
</homepage_facts>

이번 글의 주제: ${topic.title}
핵심 포인트: ${topic.points.join(" / ")}
분량: 공백 포함 1,500~2,000자`;

async function generate() {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({ model: MODEL, max_tokens: 4000, system, messages: [{ role: "user", content: user }] }),
  });
  if (!res.ok) throw new Error(`Claude API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.content.filter((b) => b.type === "text").map((b) => b.text).join("").trim();
}

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("ANTHROPIC_API_KEY가 필요합니다.");
  process.exit(1);
}

const draft = await generate();
const title = (draft.match(/^#\s+(.+)$/m) || [, topic.title])[1].trim();
const body = `> 자동 생성된 초안입니다. 사진을 넣고 내용을 확인한 뒤 네이버 블로그에 붙여넣어 발행하세요.\n> 주제: ${topic.title}\n\n${draft}`;

const { GITHUB_TOKEN, GITHUB_REPOSITORY } = process.env;
if (!GITHUB_TOKEN || !GITHUB_REPOSITORY) {
  console.log(body);
  process.exit(0);
}

const res = await fetch(`https://api.github.com/repos/${GITHUB_REPOSITORY}/issues`, {
  method: "POST",
  headers: {
    authorization: `Bearer ${GITHUB_TOKEN}`,
    accept: "application/vnd.github+json",
    "content-type": "application/json",
  },
  body: JSON.stringify({ title: `[블로그 초안] ${title}`, body, labels: ["blog-draft"] }),
});
if (!res.ok) throw new Error(`GitHub API ${res.status}: ${await res.text()}`);
console.log("초안 이슈 생성:", (await res.json()).html_url);
