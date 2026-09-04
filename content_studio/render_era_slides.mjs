// 年代ごとのカルーセルスライド（1080x1350）を、イラスト付きで一括生成する。
// 使い方: node content_studio/render_era_slides.mjs

import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { eras } from "./data/vans_authentic_eras.mjs";
import { heelPatch, sideTag, sole, insole, shoeSole } from "./lib/illustrations.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require("/opt/node22/lib/node_modules/playwright");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "output");

const WIDTH = 1080;
const HEIGHT = 1350;

const ILLUSTRATORS = { heelPatch, sideTag, sole, insole, shoeSole };

function mediaCardHtml(item) {
  const svg = ILLUSTRATORS[item.type](item.props);
  return `
    <div class="media-card">
      <div class="media-art">${svg}</div>
      <div class="media-caption">${item.caption}</div>
    </div>
  `;
}

function sharedStyle() {
  return `
  html, body {
    margin: 0; padding: 0;
    width: ${WIDTH}px; height: ${HEIGHT}px;
    background: #f4ecd8;
    font-family: "IPAGothic", "IPAゴシック", sans-serif;
  }
  .slide {
    position: relative;
    width: ${WIDTH}px; height: ${HEIGHT}px;
    overflow: hidden;
    box-sizing: border-box;
    padding: 60px 66px 44px;
    display: flex;
    flex-direction: column;
    background:
      radial-gradient(circle at 15% 10%, rgba(255,255,255,0.5), transparent 40%),
      radial-gradient(circle at 85% 95%, rgba(0,0,0,0.04), transparent 45%),
      repeating-linear-gradient(0deg, rgba(120,100,60,0.03) 0px, rgba(120,100,60,0.03) 1px, transparent 1px, transparent 3px),
      #f4ecd8;
  }
  .topbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .topbar .brand {
    font-size: 18px;
    letter-spacing: 2px;
    color: #4a3f2c;
  }
  .topbar .page {
    font-size: 16px;
    color: #8a7a55;
    border: 2px solid #8a7a55;
    border-radius: 999px;
    padding: 3px 14px;
  }
  .footer {
    position: absolute;
    left: 0; right: 0; bottom: 22px;
    text-align: center;
    font-size: 13px;
    color: #8a7a55;
  }
  `;
}

function coverHtml(eras, total) {
  const rows = eras
    .map(
      (era, i) => `
      <div class="idx-row">
        <div class="idx-badge">${era.range}</div>
        <div class="idx-name">${era.name}</div>
        <div class="idx-page">P.${i + 2}</div>
      </div>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<style>
  ${sharedStyle()}
  .header { text-align: center; margin-top: 10px; }
  .brand-badge {
    display: inline-block;
    border: 3px solid #1a1a1a;
    border-radius: 999px;
    padding: 6px 26px;
    font-size: 18px;
    letter-spacing: 4px;
    color: #1a1a1a;
    margin-bottom: 16px;
    transform: rotate(-2deg);
  }
  .title {
    font-size: 84px;
    font-weight: 900;
    letter-spacing: 1px;
    color: #1a1a1a;
    margin: 0;
    text-shadow: 3px 3px 0 rgba(0,0,0,0.08);
  }
  .subtitle {
    font-size: 27px;
    color: #4a3f2c;
    margin-top: 10px;
    letter-spacing: 2px;
  }
  .callout-row {
    display: flex;
    justify-content: center;
    gap: 16px;
    margin: 26px 0 30px;
  }
  .callout-chip {
    border: 2.5px solid #1a1a1a;
    border-radius: 999px;
    background: #fffdf6;
    padding: 8px 18px;
    font-size: 18px;
    color: #1a1a1a;
    white-space: nowrap;
  }
  .callout-chip:nth-child(odd) { transform: rotate(-1.5deg); }
  .callout-chip:nth-child(even) { transform: rotate(1.5deg); }
  .hero {
    margin: 0 auto 34px;
    width: 780px;
    height: 220px;
    border: 3px dashed #8a7a55;
    border-radius: 18px;
    background: rgba(255,255,255,0.35);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 20px;
    color: #6b5d3f;
  }
  .hero svg { width: 110px; height: 110px; opacity: 0.55; flex: none; }
  .hero .hero-text { text-align: left; }
  .hero .hero-label { font-size: 22px; letter-spacing: 1px; }
  .hero .hero-sub { font-size: 15px; color: #8a7a55; margin-top: 4px; }
  .index {
    display: flex;
    flex-direction: column;
    gap: 14px;
    margin: 0 8px;
  }
  .idx-row {
    display: flex;
    align-items: center;
    gap: 18px;
    background: #fffdf6;
    border: 2.5px solid #1a1a1a;
    border-radius: 12px;
    padding: 16px 26px;
  }
  .idx-row:nth-child(odd) { transform: rotate(-0.4deg); }
  .idx-row:nth-child(even) { transform: rotate(0.4deg); }
  .idx-badge {
    background: #1a1a1a;
    color: #f4ecd8;
    font-size: 18px;
    font-weight: 700;
    padding: 5px 16px;
    border-radius: 7px;
    white-space: nowrap;
  }
  .idx-name {
    flex: 1;
    font-size: 24px;
    font-weight: 700;
    color: #262019;
  }
  .idx-page {
    font-size: 16px;
    color: #8a7a55;
  }
</style>
</head>
<body>
  <div class="slide">
    <div class="topbar">
      <div class="brand">古着デジタル図鑑</div>
      <div class="page">1 / ${total}</div>
    </div>
    <div class="header">
      <div class="brand-badge">年代判別 完全ガイド</div>
      <h1 class="title">VANS AUTHENTIC</h1>
      <div class="subtitle">〜 5つの年代で見分けるチェックポイント 〜</div>
    </div>
    <div class="callout-row">
      <div class="callout-chip">ヒールパッチ</div>
      <div class="callout-chip">ソール</div>
      <div class="callout-chip">サイドタグ</div>
      <div class="callout-chip">インソール</div>
    </div>
    <div class="hero">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">
        <path d="M2 17c1-2 2-3 4-3.2 1.5-1.6 3.5-2.4 5.5-2.3 1-1.3 3-2 5-1.6 1.7.3 3 1.6 3.5 3.3.4 1.4 1 1.8 2 2.3v2.5H2v-1z"/>
        <path d="M6 13.8c.5-1.2 1.4-2 2.5-2.3"/>
      </svg>
      <div class="hero-text">
        <div class="hero-label">実物写真 / イラスト 挿入エリア</div>
        <div class="hero-sub">(シリーズ全体を象徴する1枚をここに)</div>
      </div>
    </div>
    <div class="index">${rows}</div>
    <div class="footer">※ 古着専門ブログの記述を照合した参考情報です。詳しい判別ポイントは次のページから。</div>
  </div>
</body>
</html>`;
}

function pageHtml(era, index, total) {
  const mediaHtml = era.media.map(mediaCardHtml).join("");
  const bulletsHtml = era.bullets.map((b) => `<li>${b}</li>`).join("");
  const triviaHtml = era.trivia ? `<div class="trivia">${era.trivia}</div>` : "";

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<style>
  ${sharedStyle()}
  .content {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  .era-heading { text-align: center; margin-bottom: 48px; }
  .era-badge {
    display: inline-block;
    background: #1a1a1a;
    color: #f4ecd8;
    font-size: 26px;
    font-weight: 700;
    padding: 7px 26px;
    border-radius: 8px;
    letter-spacing: 1px;
    transform: rotate(-1.2deg);
  }
  .era-name {
    font-size: 62px;
    font-weight: 900;
    color: #1a1a1a;
    margin: 18px 0 0;
    text-shadow: 3px 3px 0 rgba(0,0,0,0.08);
  }
  .media-row {
    display: flex;
    justify-content: center;
    gap: 32px;
    margin-bottom: 52px;
    flex-wrap: wrap;
  }
  .media-card {
    width: 290px;
    text-align: center;
  }
  .media-art {
    background: #fffdf6;
    border: 3px solid #1a1a1a;
    border-radius: 18px;
    padding: 22px;
    box-shadow: 5px 5px 0 rgba(0,0,0,0.07);
  }
  .media-art svg { width: 100%; height: 180px; display: block; }
  .media-caption {
    margin-top: 12px;
    font-size: 20px;
    color: #4a3f2c;
    letter-spacing: 1px;
  }
  .points {
    background: #fffdf6;
    border: 3px solid #1a1a1a;
    border-radius: 14px;
    padding: 32px 40px;
    margin: 0 10px;
  }
  .points ul {
    margin: 0;
    padding-left: 28px;
    font-size: 27px;
    line-height: 1.85;
    color: #262019;
  }
  .points .trivia {
    margin-top: 14px;
    padding-top: 14px;
    border-top: 1.5px dashed #c9b98f;
    font-size: 20px;
    color: #6b5d3f;
  }
</style>
</head>
<body>
  <div class="slide">
    <div class="topbar">
      <div class="brand">古着デジタル図鑑 ・ VANS AUTHENTIC</div>
      <div class="page">${index} / ${total}</div>
    </div>
    <div class="content">
      <div class="era-heading">
        <div class="era-badge">${era.range}</div>
        <h1 class="era-name">${era.name}</h1>
      </div>
      <div class="media-row">${mediaHtml}</div>
      <div class="points">
        <ul>${bulletsHtml}</ul>
        ${triviaHtml}
      </div>
    </div>
    <div class="footer">※ 古着専門ブログの記述を照合した参考情報です。個体差があるため実物での確認を推奨します。イラストは参考図です。</div>
  </div>
</body>
</html>`;
}

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await browser.newPage({
  viewport: { width: WIDTH, height: HEIGHT },
  deviceScaleFactor: 2,
});

const total = eras.length + 1;

await page.setContent(coverHtml(eras, total), { waitUntil: "load" });
const coverPath = path.join(OUT_DIR, "vans_authentic_carousel_01_cover.png");
await page.screenshot({ path: coverPath, clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT } });
console.log(`Saved: ${coverPath}`);

for (let i = 0; i < eras.length; i++) {
  const html = pageHtml(eras[i], i + 2, total);
  await page.setContent(html, { waitUntil: "load" });
  const outPath = path.join(OUT_DIR, `vans_authentic_carousel_${String(i + 2).padStart(2, "0")}.png`);
  await page.screenshot({ path: outPath, clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT } });
  console.log(`Saved: ${outPath}`);
}

await browser.close();
