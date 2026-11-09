#!/usr/bin/env node
// 주간·월간 띠운세 한 장짜리 게시물 (+ 같은 그림 스토리)
// 사용:
//   node scripts/build_extra.mjs weekly 2026-11-16    → inbox/2026-11-16-weekly.json  → posts/TW20261116 (+ _S)
//   node scripts/build_extra.mjs monthly 2026-12-01   → inbox/2026-12-01-monthly.json → posts/TM202612 (+ _S)
// 검사에 걸리면(띠·년생 누락, 길이 초과, 금지 표현) 실패한다.

import { readFileSync, writeFileSync, mkdirSync, appendFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { CONFIG, TTI, yearsFor, dateLabel } from "./zodiac.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const [kind, date] = process.argv.slice(2);
if (!["weekly", "monthly", "weekend", "half", "theme"].includes(kind) || !/^\d{4}-\d{2}-\d{2}$/.test(date || "")) {
  console.error("사용: node scripts/build_extra.mjs weekly|monthly|weekend|half|theme YYYY-MM-DD"); process.exit(1);
}
const src = process.env.INBOX || join(ROOT, "inbox", `${date}-${kind}.json`);
const inbox = JSON.parse(readFileSync(src, "utf8"));
const BANNED = /사망|죽음|죽을|큰 ?사고|수술|암 ?진단|이혼|파산|매수|매도|코인|로또|복권 번호|주식을 사|투자하세요|부적|굿을|천도재/;
const len = (s) => [...(s || "")].length;
const errs = [];
const chk = (label, s, max) => {
  if (!s || len(s) > max) errs.push(`${label} ${len(s)}자 (1~${max}자)`);
  if (BANNED.test(s || "")) errs.push(`${label} 금지 표현: "${s}"`);
};
const base = +date.slice(0, 4);
const head = { handle: CONFIG.handle, brand: CONFIG.brand, long: dateLabel(date).long };
let id, card, caption, firstComment, alt, cards, alts;
const ART = existsSync(join(ROOT, "assets", "art", "zodiac12.png")) ? "../assets/art/zodiac12.png" : ""; // 12띠 캐릭터 그림이 있으면 특집 표지에 사용

if (kind === "theme") {
  // 테마 특집(둘째·넷째 토요일): 표지 + 띠별 좋은 달 2장(6띠씩) + 마무리
  if (new Date(date + "T12:00:00+09:00").getUTCDay() !== 6) errs.push(`${date} 는 토요일이 아님`);
  chk("topic(주제)", inbox.topic, 10);
  chk("hand(친구 소환 한 줄)", inbox.hand, 16);
  chk("l1", inbox.l1, 8); chk("l2", inbox.l2, 6); chk("l3", inbox.l3, 6);
  chk("cheer", inbox.cheer, 40); chk("share", inbox.share, 40);
  if (!["pink", "blue", "orange"].includes(inbox.color)) errs.push(`color '${inbox.color}' (pink·blue·orange)`);
  if (!["dots", "burst"].includes(inbox.bg)) errs.push(`bg '${inbox.bg}' (dots·burst)`);
  const rows = TTI.map((t, i) => {
    const v = inbox.tti?.[t.key] || {};
    if (!/^\d{1,2}월(·\d{1,2}월)?$/.test(v.months || "")) errs.push(`${t.key}띠 좋은 달 '${v.months}' (예: 3월 또는 3월·9월)`);
    chk(`${t.key}띠 한 줄`, v.line, 20);
    return { ...t, years: yearsFor(i, base).map((y) => ({ year: y })), months: v.months, line: v.line };
  });
  if (errs.length) { console.error("검사 실패:\n - " + errs.join("\n - ")); process.exit(2); }
  id = `TT${date.replace(/-/g, "")}`;
  const look = { bg: inbox.bg, color: inbox.color };
  cards = [
    { type: "tcover", hand: inbox.hand, l1: inbox.l1, l2: inbox.l2, l3: inbox.l3, ...look },
    { type: "tlist", title: `${inbox.topic} 좋은 달 · 쥐띠~뱀띠`, list: rows.slice(0, 6), ...look },
    { type: "tlist", title: `${inbox.topic} 좋은 달 · 말띠~돼지띠`, list: rows.slice(6), ...look },
    { type: "outro", cheer: inbox.cheer, share: inbox.share, teaser: "" },
  ];
  caption = `${inbox.l1} ${inbox.l2} ${inbox.l3}\n${inbox.hand} 친구를 태그해 주세요 🙌\n📌 팔로우하면 매일 아침 6시, 내 띠 운세가 피드에 먼저 떠요.\n\n${rows.slice(0, 3).map((r) => `${r.key}띠 ${r.months}`).join(" · ")} …\n카드를 넘겨 내 띠의 좋은 달을 확인하세요.\n\n재미로 보는 운세예요. 띠는 설(음력 1월 1일) 기준이라 1~2월 초 생일이면 앞 띠를 함께 보세요.\n\n#오늘의띠운세 #${inbox.topic.replace(/[·\s]/g, "")} #띠별운세 #띠운세 #운세`;
  firstComment = `${inbox.topic} 궁금한 친구를 태그해 주세요 👇`;
  alts = [`${inbox.l1} ${inbox.l2} ${inbox.l3}`, ...[rows.slice(0, 6), rows.slice(6)].map((p) => p.map((r) => `${r.key}띠 ${r.months} ${r.line}`).join(". ")), "마무리. " + inbox.cheer.replace(/\*\*/g, "")];
} else if (kind === "weekend") {
  // 주말 한마디: 주제 하나로 12띠 순위 한 줄씩 (토요일 날짜)
  if (new Date(date + "T12:00:00+09:00").getUTCDay() !== 6) errs.push(`${date} 는 토요일이 아님`);
  chk("t1(윗줄 제목)", inbox.t1, 14);
  chk("t2(아랫줄 제목)", inbox.t2, 12);
  const keys = (inbox.list || []).map((x) => x.key);
  if (keys.length !== 12 || new Set(keys).size !== 12 || keys.some((k) => !TTI.find((t) => t.key === k))) errs.push("list 는 12띠를 한 번씩, 순위 순서로");
  const list = (inbox.list || []).map((x) => {
    const i = TTI.findIndex((t) => t.key === x.key);
    chk(`${x.key}띠 한 줄`, x.line, 11);
    return { ...TTI[i], years: yearsFor(i, base).map((y) => ({ year: y })), line: x.line };
  });
  if (errs.length) { console.error("검사 실패:\n - " + errs.join("\n - ")); process.exit(2); }
  id = `TE${date.replace(/-/g, "")}`;
  card = { type: "weekend", t1: inbox.t1, t2: inbox.t2, list };
  caption = `주말 한마디 · ${inbox.t1} ${inbox.t2}\n📌 팔로우하면 매일 아침 6시, 내 띠 운세가 피드에 먼저 떠요.\n\n1위 ${list[0].key}띠 — ${list[0].line}\n내 띠는 몇 번째인지 찾아보세요. 가족 띠도 공유해서 알려 주세요.\n\n재미로 보는 운세예요. 띠는 설(음력 1월 1일) 기준이라 1~2월 초 생일이면 앞 띠를 함께 보세요.\n\n#오늘의띠운세 #주말운세 #띠별운세 #띠운세 #오늘의운세`;
  firstComment = "내 띠는 몇 번째였나요? 띠와 한마디를 댓글로 남겨 주세요 🙂";
  alt = `${inbox.t1} ${inbox.t2}. ` + list.map((r, k) => `${k + 1}위 ${r.key}띠 ${r.years.map((y) => y.year).join(", ")}년생 ${r.line}`).join(". ");
} else if (kind === "half") {
  // 상반기(1월 1일)·하반기(7월 1일) 띠별 운세: 특집 표지 + 두 띠씩 6장 + 마무리 = 8장
  const mm = date.slice(5, 7);
  if (!(["01", "07"].includes(mm) && date.endsWith("-01"))) errs.push(`${date} 는 1월 1일이나 7월 1일이 아님`);
  const label = `${base}년 ${mm === "01" ? "상반기" : "하반기"}`;
  chk("hand(표지 손글씨 한 줄)", inbox.hand, 14);
  chk("cheer(마무리 응원)", inbox.cheer, 40);
  chk("share(저장·공유 안내)", inbox.share, 40);
  const rows = TTI.map((t, i) => {
    const v = inbox.tti?.[t.key] || {};
    chk(`${t.key}띠 흐름`, v.flow, 90);
    chk(`${t.key}띠 주의 내용`, v.caution, 60);
    if (!/^\d{1,2}월$/.test(v.when || "")) errs.push(`${t.key}띠 주의할 시기 '${v.when}' (예: 7월)`);
    return { ...t, years: yearsFor(i, base).map((y) => ({ year: y })), flow: v.flow, when: v.when, caution: v.caution };
  });
  if (errs.length) { console.error("검사 실패:\n - " + errs.join("\n - ")); process.exit(2); }
  id = `TH${base}${mm === "01" ? "A" : "B"}`;
  cards = [
    { type: "hcover", hand: inbox.hand, l1: label, l2: "띠별 운세 총정리", rows, art: ART },
    ...[0, 2, 4, 6, 8, 10].map((k) => ({ type: "half", label, pair: rows.slice(k, k + 2) })),
    { type: "outro", cheer: inbox.cheer, share: inbox.share, teaser: "" },
  ];
  caption = `${label} 띠별 운세 총정리\n📌 팔로우하면 매일 아침 6시, 내 띠 운세가 피드에 먼저 떠요.\n\n12띠의 ${mm === "01" ? "상반기" : "하반기"} 흐름과 '주의해야 할 시기'를 정리했어요.\n저장해 두고 반년 동안 꺼내 보세요. 가족 띠는 공유해서 알려 주세요.\n\n재미로 보는 운세예요. 띠는 설(음력 1월 1일) 기준이라 1~2월 초 생일이면 앞 띠를 함께 보세요.\n\n#오늘의띠운세 #${mm === "01" ? "상반기운세" : "하반기운세"} #띠별운세 #${base}년운세 #띠운세`;
  firstComment = `✅ 내 띠와 ${mm === "01" ? "상반기" : "하반기"} 목표 한 가지를 남겨 주세요`;
  alts = [`${label} 띠별 운세 총정리 표지`, ...[0, 2, 4, 6, 8, 10].map((k) => rows.slice(k, k + 2).map((r) => `${r.key}띠: ${r.flow} 주의할 시기 ${r.when}: ${r.caution}`).join(" ")), "마무리. " + inbox.cheer.replace(/\*\*/g, "")];
} else if (kind === "weekly") {
  const d0 = new Date(date + "T12:00:00+09:00");
  if (d0.getUTCDay() !== 1) errs.push(`${date} 는 월요일이 아님 (주간 운세는 월요일 날짜로)`);
  const d1 = new Date(d0.getTime() + 6 * 86400000);
  const m0 = d0.getUTCMonth() + 1, m1 = d1.getUTCMonth() + 1;
  const range = m0 === m1 ? `${m0}월 ${d0.getUTCDate()}일~${d1.getUTCDate()}일` : `${m0}월 ${d0.getUTCDate()}일~${m1}월 ${d1.getUTCDate()}일`;
  const rows = TTI.map((t, i) => {
    const v = inbox.tti?.[t.key] || {};
    const years = yearsFor(i, base).map((y) => { chk(`${t.key}띠 ${y}년생`, v.years?.[y], 10); return { year: y, text: v.years?.[y] || "" }; });
    return { ...t, years };
  });
  if (errs.length) { console.error("검사 실패:\n - " + errs.join("\n - ")); process.exit(2); }
  id = `TW${date.replace(/-/g, "")}`;
  card = { type: "weekly", range, rows };
  caption = `${range} 띠별 주간 운세\n📌 팔로우하면 매일 아침 6시, 내 띠 운세가 피드에 먼저 떠요.\n\n내 년생 한 줄을 찾아보세요. 저장해 두면 한 주 동안 언제든 다시 볼 수 있어요.\n가족·친구 띠도 있으니 공유해서 알려 주세요.\n\n재미로 보는 운세예요. 띠는 설(음력 1월 1일) 기준이라 1~2월 초 생일이면 앞 띠를 함께 보세요.\n\n#오늘의띠운세 #주간운세 #띠별운세 #이번주운세 #띠운세`;
  firstComment = "✅ 이번 주 출석 체크! 내 띠와 이번 주 다짐 한 단어를 남겨 주세요 (예: 말띠 추진)";
  alt = `${range} 띠별 주간 운세. ` + rows.map((r) => `${r.key}띠 ` + r.years.map((y) => `${y.year}년생 ${y.text}`).join(", ")).join(". ");
} else {
  if (!date.endsWith("-01")) errs.push(`${date} 는 1일이 아님 (월간 운세는 그 달 1일 날짜로)`);
  const month = `${+date.slice(5, 7)}월의`;
  chk("summary(이달 분위기)", inbox.summary, 30);
  chk("oneline(행운 한 줄 요약)", inbox.oneline, 28);
  const OK = ["최고", "좋음", "보통"];
  const rows = TTI.map((t) => {
    const v = inbox.tti?.[t.key] || {};
    chk(`${t.key}띠 말풍선`, v.bubble, 12);
    chk(`${t.key}띠 조언`, v.advice, 15);
    for (const k of ["love", "money", "work", "all"]) if (!OK.includes(v[k])) errs.push(`${t.key}띠 ${k} '${v[k]}' (최고·좋음·보통 중 하나)`);
    return { ...t, bubble: v.bubble, advice: v.advice, love: v.love, money: v.money, work: v.work, all: v.all };
  });
  if (errs.length) { console.error("검사 실패:\n - " + errs.join("\n - ")); process.exit(2); }
  id = `TM${date.slice(0, 7).replace("-", "")}`;
  card = { type: "monthly", month, summary: inbox.summary, oneline: inbox.oneline, rows };
  const mm = +date.slice(5, 7);
  const best = rows.filter((r) => r.all === "최고").map((r) => `${r.key}띠`);
  caption = `${mm}월 이달의 띠운세 · 12띠 연애·금전·직장·전체운\n📌 팔로우하면 매일 아침 6시, 내 띠 운세가 피드에 먼저 떠요.\n\n${inbox.summary}\n${best.length ? `이달 전체운 '최고' 띠: ${best.join("·")}\n` : ""}행운 한 줄 요약: ${inbox.oneline}\n\n저장해 두고 한 달 동안 꺼내 보세요. 가족 띠는 공유해서 알려 주세요.\n\n재미로 보는 운세예요. 띠는 설(음력 1월 1일) 기준이라 1~2월 초 생일이면 앞 띠를 함께 보세요.\n\n#오늘의띠운세 #이달의운세 #${mm}월운세 #띠별운세 #월간운세`;
  firstComment = `✅ ${mm}월 출석 체크! 내 띠와 이번 달 목표 한 가지를 남겨 주세요`;
  alt = `${mm}월 이달의 띠운세. ` + rows.map((r) => `${r.key}띠 ${r.bubble} 연애 ${r.love}, 금전 ${r.money}, 직장 ${r.work}, 전체 ${r.all}. ${r.advice}`).join(" ");
}

cards = cards || [card];
alts = alts || [alt];
for (const [fid, story] of [[id, false], [`${id}_S`, true]]) {
  const dir = join(ROOT, "posts", fid);
  mkdirSync(dir, { recursive: true });
  // 스토리는 첫 장(표지) 한 장만
  writeFileSync(join(dir, "data.json"), JSON.stringify({ id: fid, head, cards: story ? [cards[0]] : cards }, null, 2));
  writeFileSync(join(dir, "post.json"), JSON.stringify(story
    ? { id: fid, story: true, image: "01.jpg" }
    : { id: fid, caption, first_comment: firstComment, slides: cards.map((c, i) => ({ file: `${String(i + 1).padStart(2, "0")}.jpg`, alt_text: `${cards.length > 1 ? `${i + 1}/${cards.length}장. ` : ""}${alts[i] || ""}`.slice(0, 1000) })) }, null, 2));
  console.log(`만듦: posts/${fid}${story ? " (스토리)" : ` (${cards.length}장)`}`);
}
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `ids=${id} ${id}_S\n`);
