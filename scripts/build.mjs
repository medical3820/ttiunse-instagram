#!/usr/bin/env node
// inbox/<날짜>.json(예약 작업이 쓴 운세 문장) → posts/<ID>/data.json·post.json
// 사용:
//   node scripts/build.mjs 2026-11-11 pm   → 전날 밤 9시 '내일의 띠별 운세 순위' 1개 (TP20261111)
//   node scripts/build.mjs 2026-11-11 am   → 당일 아침 6시 년생별 상세 2개 (TA20261111_1 쥐~뱀, TA20261111_2 말~돼지)
// 검사에 걸리면(띠·년생 누락, 너무 긴 문장, 금지 표현) 실패한다 — 이상한 운세를 공개 계정에 올리지 않기 위해서다.

import { readFileSync, writeFileSync, mkdirSync, appendFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { CONFIG, TTI, yearsFor, luckyFor, stars, dateLabel, ganji } from "./zodiac.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const [date, mode = "am"] = process.argv.slice(2);
if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "") || !["am", "pm"].includes(mode)) {
  console.error("사용: node scripts/build.mjs YYYY-MM-DD am|pm"); process.exit(1);
}
const src = process.env.INBOX || join(ROOT, "inbox", `${date}.json`);
const inbox = JSON.parse(readFileSync(src, "utf8"));

// ---- 검사 ------------------------------------------------------------------
const errs = [];
const BANNED = /사망|죽음|죽을|큰 ?사고|수술|암 ?진단|이혼|파산|매수|매도|코인|로또|복권 번호|주식을 사|투자하세요|부적|굿을|천도재/;
const base = +date.slice(0, 4);
const len = (s) => [...(s || "")].length;
if (inbox.date && inbox.date !== date) errs.push(`inbox.date(${inbox.date})가 파일 날짜와 다름`);
const scores = [];
const rows = TTI.map((t, i) => {
  const v = inbox.tti?.[t.key];
  if (!v) { errs.push(`${t.key}띠 없음`); return null; }
  const sc = Math.round(Number(v.score));
  if (!(sc >= 40 && sc <= 99)) errs.push(`${t.key}띠 점수 ${v.score} (40~99)`);
  scores.push(sc);
  if (!v.total || len(v.total) > 34) errs.push(`${t.key}띠 총운 길이 ${len(v.total)}자 (1~34자)`);
  if (!v.summary || len(v.summary) < 30 || len(v.summary) > 75) errs.push(`${t.key}띠 총평 길이 ${len(v.summary)}자 (30~75자, 한두 문장)`);
  if (!v.word || len(v.word) > 4) errs.push(`${t.key}띠 키워드 '${v.word}' (1~4자)`);
  const years = yearsFor(i, base).map((y) => {
    const txt = v.years?.[y];
    if (!txt) errs.push(`${t.key}띠 ${y}년생 문장 없음`);
    else if (len(txt) > 48) errs.push(`${t.key}띠 ${y}년생 ${len(txt)}자 (48자 이하)`);
    return { year: y, text: txt || "" };
  });
  for (const s of [v.total, v.summary, v.word, ...years.map((y) => y.text)]) if (BANNED.test(s || "")) errs.push(`${t.key}띠 금지 표현: "${s}"`);
  return { ...t, idx: i, score: sc, stars: stars(sc), total: v.total, summary: v.summary, word: v.word, years };
});
if (new Set(scores).size !== scores.length) errs.push("띠 점수가 겹침 (순위를 매길 수 있게 모두 달라야 함)");
if (errs.length) { console.error("검사 실패:\n - " + errs.join("\n - ")); process.exit(2); }

const lucky = luckyFor(date);
rows.forEach((r) => (r.lucky = lucky[r.idx]));
const rank = [...rows].sort((a, b) => b.score - a.score);
rank.forEach((r, i) => (r.rank = i + 1));

const D = dateLabel(date);
const gj = ganji(base);
const ymd = date.replace(/-/g, "");
const NOTE = "재미로 보는 운세예요. 좋은 말은 챙기고, 아쉬운 말은 조심하는 정도로만 봐 주세요.\n띠는 설(음력 1월 1일) 기준이라 1~2월 초 생일이면 앞 띠를 함께 보세요.";
const dayN = Math.max(1, Math.round((Date.parse(date) - Date.parse(CONFIG.startDate)) / 86400000) + 1);
const head = { dayN, brand: CONFIG.brand, handle: CONFIG.handle, md: D.md, wd: D.wd, long: D.long, ganji: gj.ko };

function write(id, cards, caption, firstComment, alts) {
  const dir = join(ROOT, "posts", id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "data.json"), JSON.stringify({ id, head, cards }, null, 2));
  const n = cards.length;
  writeFileSync(join(dir, "post.json"), JSON.stringify({
    id, caption, first_comment: firstComment,
    slides: cards.map((c, i) => ({ file: `${String(i + 1).padStart(2, "0")}.jpg`, alt_text: `${i + 1}/${n}장. ${alts[i]}` })),
  }, null, 2));
  console.log(`만듦: posts/${id} (${n}장)`);
  return id;
}

const ids = [];
// 스토리(9:16 한 장): 피드 맨 위 동그라미로 '지금 올라왔다'는 신호를 같은 시각에 준다
function story(id, card) {
  const dir = join(ROOT, "posts", id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "data.json"), JSON.stringify({ id, head, cards: [{ type: "story", ...card }] }, null, 2));
  writeFileSync(join(dir, "post.json"), JSON.stringify({ id, story: true, image: "01.jpg" }, null, 2));
  console.log(`만듦: posts/${id} (스토리)`);
  return id;
}
// ---- 해시태그: 인스타는 게시물당 5개까지 → 브랜드 1 + 검색어 2 + 띠 2 (자세한 근거는 HASHTAGS.md) ----
const dayNo = Math.round(Date.parse(date + "T00:00:00Z") / 86400000);
const ttiTag = (r) => `#${r.key}띠운세`;
function tagsFor(part, lead) {
  const best = [...part].sort((a, b) => b.score - a.score)[0];
  const others = part.filter((r) => r !== best);
  const rot = others[dayNo % others.length]; // 나머지 띠는 날마다 돌아가며 노출
  return [lead[0], lead[1], lead[2], ttiTag(best), ttiTag(rot)].join(" ");
}
// ---- 팔로우 이유: 모든 카드 아래 한 줄 + 마지막 카드 '팔로우하면 매일 받는 것' + 캡션 첫 줄 ----
const PERKS = [
  ["아침 6시", "내 년생 한 줄 운세"],
  ["밤 9시", "내일 띠 순위 미리보기"],
  ["매일", "바뀌는 행운의 색·물건·숫자"],
  ["1분", "출근길에 넘겨 보면 끝"],
];
const FOLLOW_LINE = "📌 팔로우하면 매일 아침 6시, 내 띠·내 년생 운세가 피드에 먼저 떠요.";
const SAVE_LINE = "저장해 두면 하루 중 언제든 내 행운의 색·물건을 다시 볼 수 있어요.\n가족·친구 띠도 있으니 공유해서 알려 주세요.";
const kw = (part) => part.map((r) => `${r.key}띠 운세`).join(" · ");

if (mode === "pm") {
  const top = rank.slice(0, 3).map((r) => `${r.key}띠`).join("·");
  const cards = [
    { type: "cover", kicker: "내일의 띠별 운세", title: `내일 운이 좋은 띠\n1위는 ${rank[0].key}띠`, sub: `${D.long} · 12띠 순위와 행운의 색`, tti: rank[0] },
    { type: "rank", title: "띠별 운세 순위 1~6위", list: rank.slice(0, 6) },
    { type: "rank", title: "띠별 운세 순위 7~12위", list: rank.slice(6) },
    { type: "lucky", title: "띠별 행운의 색·물건", list: rows },
    { type: "outro", title: "팔로우하면\n매일 받는 것", perks: PERKS, teaser: "내일 아침 6시, 내 년생 운세 공개" },
  ];
  const caption = `${D.long} 내일의 띠별 운세 순위 · 1위 ${rank[0].key}띠\n${FOLLOW_LINE}\n\n1~3위: ${top}\n12위까지 내 띠 순위와 내일 행운의 색·물건을 미리 확인하세요.\n내일 아침 6시에는 년생별 운세가 올라와요.\n\n${SAVE_LINE}\n\n${NOTE}\n\n${tagsFor(rows, ["#오늘의띠운세", "#내일의운세", "#띠별운세"])}`;
  ids.push(write(`TP${ymd}`, cards, caption, `✅ ${dayN}일째 밤 출석 체크! 내일 내 띠는 몇 위였나요? 띠와 순위를 남겨 주세요 (예: 말띠 6위)`, [
    `${D.long} 내일의 띠별 운세. 1위 ${rank[0].key}띠`,
    "띠별 운세 순위 1~6위. " + rank.slice(0, 6).map((r) => `${r.rank}위 ${r.key}띠`).join(", "),
    "띠별 운세 순위 7~12위. " + rank.slice(6).map((r) => `${r.rank}위 ${r.key}띠`).join(", "),
    "띠별 행운의 색과 물건. " + rows.map((r) => `${r.key}띠 ${r.lucky.color.name} ${r.lucky.item}`).join(", "),
    "팔로우하면 매일 아침 6시 년생별 운세, 밤 9시 내일 띠 순위를 받아 볼 수 있습니다.",
  ]));
  ids.push(story(`TP${ymd}_S`, { clock: "21:00", kicker: "밤 9시 · 내일 순위 도착", title: `내일 1위는
${rank[0].key}띠`, tti: rank[0], line: "내 띠는 몇 위? 피드에서 확인", next: "내일 아침 6시 · 년생별 운세" }));
} else {
  [rows.slice(0, 6), rows.slice(6)].forEach((part, k) => {
    const no = k + 1, mark = "①②"[k];
    const names = part.map((r) => `${r.key}띠`).join("·");
    const cards = [
      { type: "cover", kicker: `오늘의 띠별 운세 ${mark}`, title: `${part[0].key}띠부터 ${part[5].key}띠까지\n년생별 오늘 운세`, sub: `${D.long} · ${gj.ko}`, list: part },
      ...part.map((r) => ({ type: "tti", tti: r })),
      { type: "outro", title: "팔로우하면\n매일 받는 것", perks: PERKS, teaser: k === 0 ? "말띠~돼지띠는 다음 게시물에 · 오늘 밤 9시 내일 1위 띠 공개" : "쥐띠~뱀띠는 이전 게시물에 · 오늘 밤 9시 내일 1위 띠 공개" },
    ];
    const best = [...part].sort((a, b) => b.score - a.score)[0];
    const caption = `${D.long} 오늘의 띠별 운세 ${mark} ${names}\n${FOLLOW_LINE}\n\n${part.map((r) => `${r.key}띠 ${r.years.map((y) => String(y.year).slice(2)).join("·")}년생 · ${r.total}`).join("\n")}\n\n오늘 가장 좋은 띠는 ${best.key}띠예요. 카드를 넘겨 내 년생 운세와 행운의 색·물건·숫자·방향을 확인하세요.\n오늘 밤 9시에는 내일 띠 순위가 공개돼요.\n\n${SAVE_LINE}\n\n${NOTE}\n\n${kw(part)}\n${tagsFor(part, ["#오늘의띠운세", "#오늘의운세", "#띠별운세"])}`;
    ids.push(write(`TA${ymd}_${no}`, cards, caption, `✅ ${dayN}일째 아침 출석 체크! 내 띠 + 오늘 다짐 한 단어를 남겨 주세요 (예: 말띠 추진)`, [
      `${D.long} 오늘의 띠별 운세 ${mark}. ${names}`,
      ...part.map((r) => `${r.key}띠 오늘 운세 별 다섯 개 중 ${r.stars}개. ${r.total} 총평: ${r.summary} ${r.years.map((y) => `${y.year}년생 ${y.text}`).join(" ")} 행운의 색 ${r.lucky.color.name}, 물건 ${r.lucky.item}, 숫자 ${r.lucky.numbers.join(" ")}, 방향 ${r.lucky.direction}`),
      "팔로우하면 매일 아침 6시 년생별 운세, 밤 9시 내일 띠 순위를 받아 볼 수 있습니다.",
    ]));
  });
  ids.push(story(`TA${ymd}_S`, { clock: "06:00", kicker: "아침 6시 · 오늘 운세 도착", title: `오늘 1위는
${rank[0].key}띠`, tti: rank[0], line: `${rank[0].key}띠 행운의 색은 ${rank[0].lucky.color.name}`, next: "오늘 밤 9시 · 내일 띠 순위 공개" }));
}

if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `ids=${ids.join(" ")}\n`);
