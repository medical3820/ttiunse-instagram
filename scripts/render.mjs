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
    // 글꼴을 직접 불러오게 한 뒤 확인한다 (화면에 늦게 그려진 카드는 글꼴 요청이 늦어 '아직 안 불러옴'으로 보일 수 있음)
    const fontOk = await page.evaluate(async () => {
      try { await Promise.all(["400", "700", "800"].map((w) => document.fonts.load(`${w} 40px NanumSquareRound`, "가나다"))); } catch {}
      await document.fonts.ready;
      return [...document.fonts].some((f) => f.family.replace(/"/g, "") === "NanumSquareRound" && f.status === "loaded");
    });
    if (!fontOk) throw new Error("나눔스퀘어라운드 글꼴을 불러오지 못했습니다 (assets/fonts 확인).");

    // 넘침 검사: 1) 카드 아래로 넘침  2) 글자가 칸 옆으로 삐져나감·잘림(말줄임 포함)
    const over = () => page.$$eval(".card", (cards) => cards.map((card, i) => {
      const inn = card.querySelector(".in");
      if (inn.scrollHeight > inn.clientHeight + 2) return `${i + 1}번(아래로 넘침)`;
      const cr = card.getBoundingClientRect();
      for (const el of card.querySelectorAll(".in *")) {
        if (!el.childNodes.length || ![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue; // 글자가 있는 요소만
        const cs = getComputedStyle(el);
        if (cs.textOverflow === "ellipsis" || (cs.overflow !== "visible" && el.scrollWidth > el.clientWidth + 2)) return `${i + 1}번(글자 잘림: "${el.textContent.trim().slice(0, 12)}")`;
        const r = el.getBoundingClientRect();
        if (r.width && (r.right > cr.right - 4 || r.left < cr.left + 4)) return `${i + 1}번(옆으로 삐져나감: "${el.textContent.trim().slice(0, 12)}")`;
      }
      return "";
    }).filter(Boolean));
    let overflow = await over();
    if (overflow.length) { // 넘치면 한 단계 촘촘하게
      await page.evaluate((ns) => ns.forEach((s) => document.querySelectorAll(".card")[parseInt(s) - 1].classList.add("squeeze")), overflow);
      overflow = await over();
    }
    if (overflow.length && process.env.ALLOW_OVERFLOW !== "1") throw new Error(`${id}: 글이 카드에 다 안 들어갑니다: ${overflow.join(", ")}`);

    const cards = await page.$$(".card");
    for (let i = 0; i < cards.length; i++) await cards[i].screenshot({ path: join(dir, `${String(i + 1).padStart(2, "0")}.jpg`), type: "jpeg", quality: 92 });
    console.log(`렌더링 완료: posts/${id}/ ${cards.length}장`);
    await page.close();
  }
} finally {
  await browser.close();
}
