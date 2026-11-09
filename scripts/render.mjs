#!/usr/bin/env node
// 카드 이미지 렌더링: template/card.html 에 posts/<ID>/data.json 을 넣고 카드마다 1080x1350 JPG 로 찍는다.
// 사용: node scripts/render.mjs TA20261111_1 [TA20261111_2 ...]
// 로컬(윈도)에서는 PW_CHANNEL=msedge 로 설치된 엣지를 쓴다. 액션에서는 playwright 크로미움.
// 글꼴이 안 불러와졌거나 글이 카드 밖으로 넘치면 실패한다 — 깨진 카드를 공개 계정에 올리지 않기 위해서다.

import { chromium } from "playwright";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const ids = process.argv.slice(2).flatMap((s) => s.split(/\s+/)).filter(Boolean);
if (!ids.length) { console.error("사용: node scripts/render.mjs <폴더ID> ..."); process.exit(1); }

const browser = await chromium.launch(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {});
try {
  for (const id of ids) {
    const dir = join(ROOT, "posts", id);
    const data = JSON.parse(readFileSync(join(dir, "data.json"), "utf8"));
    const html = readFileSync(join(ROOT, "template", "card.html"), "utf8").replace("/*DATA*/", JSON.stringify(data).replace(/</g, "\\u003c"));
    mkdirSync(join(ROOT, "work"), { recursive: true });
    const tmp = join(ROOT, "work", `render_${id}.html`);
    writeFileSync(tmp, html);

    const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
    await page.goto(pathToFileURL(tmp).href, { waitUntil: "networkidle" });
    await page.evaluate(() => { document.documentElement.classList.add("render"); document.documentElement.style.setProperty("--card-w", "1080px"); });
    await page.waitForFunction(() => document.documentElement.dataset.ready === "1");
    const fontOk = await page.evaluate(() => [...document.fonts].some((f) => f.family.replace(/"/g, "") === "NanumSquareRound" && f.status === "loaded"));
    if (!fontOk) throw new Error("나눔스퀘어라운드 글꼴을 불러오지 못했습니다 (jsdelivr 연결 확인).");

    const over = () => page.$$eval(".card .in", (els) => els.map((el, i) => (el.scrollHeight > el.clientHeight + 2 ? i + 1 : 0)).filter(Boolean));
    let overflow = await over();
    if (overflow.length) { // 넘치면 한 단계 촘촘하게
      await page.evaluate((ns) => ns.forEach((n) => document.querySelectorAll(".card")[n - 1].classList.add("squeeze")), overflow);
      overflow = await over();
    }
    if (overflow.length && process.env.ALLOW_OVERFLOW !== "1") throw new Error(`${id}: 글이 카드 밖으로 넘칩니다: ${overflow.join(", ")}번 카드`);

    const cards = await page.$$(".card");
    for (let i = 0; i < cards.length; i++) await cards[i].screenshot({ path: join(dir, `${String(i + 1).padStart(2, "0")}.jpg`), type: "jpeg", quality: 92 });
    console.log(`렌더링 완료: posts/${id}/ ${cards.length}장`);
    await page.close();
  }
} finally {
  await browser.close();
}
