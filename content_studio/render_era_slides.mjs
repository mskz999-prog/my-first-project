// 年代ごとのカルーセルスライド（1080x1350）を、イラスト付きで一括生成する。
// 使い方: node content_studio/render_era_slides.mjs

import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { eras, intro } from "./data/vans_authentic_eras.mjs";
import { heelPatch, sideTag, sole, insole, shoeSole, storefront, skateboard } from "./lib/illustrations.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require("/opt/node22/lib/node_modules/playwright");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "output");

const WIDTH = 1080;
const HEIGHT = 1350;

const ILLUSTRATORS = { heelPatch, sideTag, sole, insole, shoeSole, storefront, skateboard };

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

function coverHtml(eras, total, spreadSize) {
  const rows = eras
    .map((era, i) => {
      const thumbItem = era.media[0];
      const thumbSvg = ILLUSTRATORS[thumbItem.type](thumbItem.props);
      return `
      <div class="idx-row">
        <div class="idx-thumb">${thumbSvg}</div>
        <div class="idx-text">
          <div class="idx-badge">${era.range}</div>
          <div class="idx-name">${era.name}</div>
        </div>
        <div class="idx-page">P.${Math.floor(i / spreadSize) + 3}</div>
      </div>`;
    })
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
  .idx-thumb {
    width: 64px;
    height: 64px;
    flex: none;
    border: 2px solid #1a1a1a;
    border-radius: 10px;
    background: #f4ecd8;
    padding: 6px;
    box-sizing: border-box;
  }
  .idx-thumb svg { width: 100%; height: 100%; display: block; }
  .idx-text { flex: 1; }
  .idx-badge {
    display: inline-block;
    background: #1a1a1a;
    color: #f4ecd8;
    font-size: 16px;
    font-weight: 700;
    padding: 4px 14px;
    border-radius: 7px;
    white-space: nowrap;
    margin-bottom: 6px;
  }
  .idx-name {
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
      <div class="subtitle">〜 6つの年代で見分けるチェックポイント 〜</div>
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

function introHtml(intro, index, total) {
  const sectionsHtml = intro.sections
    .map((s) => {
      const iconSvg = ILLUSTRATORS[s.icon]();
      return `
      <div class="intro-block">
        <div class="intro-icon">${iconSvg}</div>
        <div class="intro-text">
          <div class="intro-label">${s.label}</div>
          <p class="intro-paragraph">${s.paragraph}</p>
        </div>
      </div>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<style>
  ${sharedStyle()}
  .intro-header { text-align: center; margin: 6px 0 30px; }
  .intro-eyebrow {
    display: inline-block;
    border: 3px solid #1a1a1a;
    border-radius: 999px;
    padding: 5px 22px;
    font-size: 16px;
    letter-spacing: 3px;
    color: #1a1a1a;
    margin-bottom: 14px;
    transform: rotate(-1.5deg);
  }
  .intro-heading {
    font-size: 38px;
    font-weight: 900;
    color: #1a1a1a;
    margin: 0;
    line-height: 1.4;
    text-shadow: 2px 2px 0 rgba(0,0,0,0.08);
  }
  .intro-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 34px;
    overflow: hidden;
  }
  .intro-block {
    display: flex;
    align-items: center;
    gap: 26px;
    background: #fffdf6;
    border: 3px solid #1a1a1a;
    border-radius: 14px;
    padding: 28px 34px;
  }
  .intro-icon {
    flex: none;
    width: 130px;
    height: 130px;
    border: 2.5px dashed #8a7a55;
    border-radius: 12px;
    padding: 14px;
    box-sizing: border-box;
    background: rgba(0,0,0,0.02);
  }
  .intro-icon svg { width: 100%; height: 100%; display: block; }
  .intro-text { flex: 1; }
  .intro-label {
    display: inline-block;
    background: #1a1a1a;
    color: #f4ecd8;
    font-size: 16px;
    font-weight: 700;
    padding: 5px 16px;
    border-radius: 6px;
    margin-bottom: 16px;
    letter-spacing: 0.5px;
  }
  .intro-paragraph {
    margin: 0;
    font-size: 22px;
    line-height: 1.95;
    color: #262019;
  }
  .intro-closing {
    font-size: 18px;
    line-height: 1.8;
    color: #4a3f2c;
    padding: 0 10px;
    border-top: 1.5px dashed #c9b98f;
    padding-top: 20px;
  }
</style>
</head>
<body>
  <div class="slide">
    <div class="topbar">
      <div class="brand">古着デジタル図鑑 ・ VANS AUTHENTIC</div>
      <div class="page">${index} / ${total}</div>
    </div>
    <div class="intro-header">
      <div class="intro-eyebrow">${intro.eyebrow}</div>
      <h1 class="intro-heading">${intro.heading}</h1>
    </div>
    <div class="intro-body">
      ${sectionsHtml}
      <div class="intro-closing">${intro.closing}</div>
    </div>
    <div class="footer">※ Wikipedia・vans.com公式ヒストリー・MR PORTER等を横断して作成した参考情報です。一部エピソードは各情報源が"伝承"として紹介している内容です。</div>
  </div>
</body>
</html>`;
}

function eraSectionHtml(era) {
  const mediaHtml = era.media.map(mediaCardHtml).join("");
  const bulletsHtml = era.bullets.map((b) => `<li>${b}</li>`).join("");
  const triviaHtml = era.trivia ? `<div class="trivia">${era.trivia}</div>` : "";
  return `
    <div class="era-section">
      <div class="era-heading">
        <div class="era-badge">${era.range}</div>
        <h2 class="era-name">${era.name}</h2>
      </div>
      <div class="media-row">${mediaHtml}</div>
      <div class="points">
        <ul>${bulletsHtml}</ul>
        ${triviaHtml}
      </div>
    </div>
  `;
}

// 1ページに1〜2年代分をまとめて表示する（1年代だけだと余白がスカスカになるため）
function spreadHtml(erasGroup, index, total) {
  const sectionsHtml = erasGroup
    .map((era, i) => eraSectionHtml(era) + (i < erasGroup.length - 1 ? '<hr class="divider">' : ""))
    .join("");

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
  }
  .era-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }
  .divider {
    width: 100%;
    border: none;
    border-top: 2.5px dashed #c9b98f;
    margin: 6px 0;
  }
  .era-heading { text-align: center; margin-bottom: 24px; }
  .era-badge {
    display: inline-block;
    background: #1a1a1a;
    color: #f4ecd8;
    font-size: 20px;
    font-weight: 700;
    padding: 5px 20px;
    border-radius: 7px;
    letter-spacing: 0.5px;
    transform: rotate(-1.2deg);
  }
  .era-name {
    font-size: 38px;
    font-weight: 900;
    color: #1a1a1a;
    margin: 12px 0 0;
    text-shadow: 2px 2px 0 rgba(0,0,0,0.08);
  }
  .media-row {
    display: flex;
    justify-content: center;
    gap: 20px;
    margin-bottom: 22px;
    flex-wrap: wrap;
  }
  .media-card {
    width: 200px;
    text-align: center;
  }
  .media-art {
    background: #fffdf6;
    border: 3px solid #1a1a1a;
    border-radius: 14px;
    padding: 14px;
    box-shadow: 4px 4px 0 rgba(0,0,0,0.07);
  }
  .media-art svg { width: 100%; height: 120px; display: block; }
  .media-caption {
    margin-top: 8px;
    font-size: 15px;
    color: #4a3f2c;
    letter-spacing: 0.5px;
  }
  .points {
    background: #fffdf6;
    border: 3px solid #1a1a1a;
    border-radius: 12px;
    padding: 20px 28px;
    margin: 0 6px;
    max-width: 860px;
  }
  .points ul {
    margin: 0;
    padding-left: 24px;
    font-size: 19px;
    line-height: 1.6;
    color: #262019;
  }
  .points .trivia {
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1.5px dashed #c9b98f;
    font-size: 15px;
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
    <div class="content">${sectionsHtml}</div>
    <div class="footer">※ 古着専門ブログの記述を照合した参考情報です。個体差があるため実物での確認を推奨します。イラストは参考図です。</div>
  </div>
</body>
</html>`;
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await browser.newPage({
  viewport: { width: WIDTH, height: HEIGHT },
  deviceScaleFactor: 2,
});

const SPREAD_SIZE = 2; // 1ページあたりの年代数（多いと窮屈、少ないとスカスカになる）
const spreads = chunk(eras, SPREAD_SIZE);
const total = spreads.length + 2; // 表紙 + 概説 + 年代スプレッド

await page.setContent(coverHtml(eras, total, SPREAD_SIZE), { waitUntil: "load" });
const coverPath = path.join(OUT_DIR, "vans_authentic_carousel_01_cover.png");
await page.screenshot({ path: coverPath, clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT } });
console.log(`Saved: ${coverPath}`);

await page.setContent(introHtml(intro, 2, total), { waitUntil: "load" });
const introPath = path.join(OUT_DIR, "vans_authentic_carousel_02_intro.png");
await page.screenshot({ path: introPath, clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT } });
console.log(`Saved: ${introPath}`);

for (let i = 0; i < spreads.length; i++) {
  const html = spreadHtml(spreads[i], i + 3, total);
  await page.setContent(html, { waitUntil: "load" });
  const outPath = path.join(OUT_DIR, `vans_authentic_carousel_${String(i + 3).padStart(2, "0")}.png`);
  await page.screenshot({ path: outPath, clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT } });
  console.log(`Saved: ${outPath}`);
}

await browser.close();
