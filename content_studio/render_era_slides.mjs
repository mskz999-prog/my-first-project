// 年代ごとのカルーセルスライド（1080x1350）を、イラスト付きで一括生成する汎用エンジン。
// データファイル（data/<topic>.mjs）が range/name/bullets/media の型と meta を満たしていれば、
// 対象を変えて使い回せる。
// 使い方: node content_studio/render_era_slides.mjs [topic]
//   topic省略時は "vans_authentic_eras"（= data/vans_authentic_eras.mjs）を使う。

import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { heelPatch, sideTag, sole, insole, shoeSole, storefront, skateboard } from "./lib/illustrations.mjs";

const TOPIC = process.argv[2] || "vans_authentic_eras";
const { eras, summary, meta } = await import(`./data/${TOPIC}.mjs`);

// ローカル環境(npm installでnode_modulesにplaywrightが入る)と、このサンドボックス環境
// (グローバルパスにしかplaywrightが無い)の両方で動くようにフォールバックしている。
const require = createRequire(import.meta.url);
const SANDBOX_PLAYWRIGHT = "/opt/node22/lib/node_modules/playwright";
let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  ({ chromium } = require(SANDBOX_PLAYWRIGHT));
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "output");
const ASSETS_DIR = path.join(__dirname, "assets");

const WIDTH = 1080;
const HEIGHT = 1350;
const BRAND = meta.brand;
const SERIES = meta.series;
const BG = meta.bg || "#F4F3EF";

const ILLUSTRATORS = { heelPatch, sideTag, sole, insole, shoeSole, storefront, skateboard };

const photoDataUriCache = new Map();
function photoDataUri(relPath) {
  if (!photoDataUriCache.has(relPath)) {
    const buf = fs.readFileSync(path.join(ASSETS_DIR, relPath));
    const ext = path.extname(relPath).slice(1).toLowerCase();
    const mime = ext === "png" ? "image/png" : "image/jpeg";
    photoDataUriCache.set(relPath, `data:${mime};base64,${buf.toString("base64")}`);
  }
  return photoDataUriCache.get(relPath);
}

// メインタイトル用の極太コンデンストフォント（Bebas Neue）をbase64埋め込みで使う。
// 日本語部分はグリフが無いためIPAGothicにフォールバックする。
const BEBAS_BASE64 = fs.readFileSync(path.join(ASSETS_DIR, "fonts/BebasNeue-Regular.ttf")).toString("base64");

function mediaVisual(item) {
  if (item.photo) {
    return `<img src="${photoDataUri(item.photo)}" alt="${item.caption}">`;
  }
  return ILLUSTRATORS[item.type](item.props);
}

function mediaCardHtml(item) {
  return `
    <div class="media-card">
      <div class="media-art">${mediaVisual(item)}</div>
      <div class="media-caption">${item.caption}</div>
    </div>
  `;
}

// 「」で囲まれた用語を太字にする（見分けポイントの用語を目立たせる）
function emphasizeQuoted(text) {
  return text.replace(/「([^」]+)」/g, "<strong>「$1」</strong>");
}

// 本文用の「長体（横幅を絞ったコンデンスト）」効果。タイトル（Bebas Neue使用箇所）には使わない。
function tai(innerHtml) {
  return `<div class="tai-wrap"><div class="tai-scale">${innerHtml}</div></div>`;
}

function sharedStyle() {
  return `
  @font-face {
    font-family: "Bebas Neue";
    src: url(data:font/ttf;base64,${BEBAS_BASE64}) format("truetype");
    font-weight: 400;
    font-style: normal;
  }
  html, body {
    margin: 0; padding: 0;
    width: ${WIDTH}px; height: ${HEIGHT}px;
    background: ${BG};
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
    background: ${BG};
  }
  .topbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .topbar .brand {
    font-family: "Bebas Neue", "IPAGothic", sans-serif;
    font-size: 20px;
    letter-spacing: 3px;
    color: #4a4a47;
  }
  .topbar .page {
    font-size: 16px;
    color: #8a8a84;
    border: 2px solid #8a8a84;
    border-radius: 999px;
    padding: 3px 14px;
  }
  .tai-wrap { overflow: hidden; }
  .tai-scale {
    display: block;
    width: 125%;
    transform: scaleX(0.8);
    transform-origin: left top;
  }
  .display-title {
    font-family: "Bebas Neue", "IPAGothic", sans-serif;
    font-weight: 700;
    letter-spacing: 4px;
  }
  .swipe-hint {
    position: absolute;
    left: 66px;
    bottom: 22px;
    display: flex;
    align-items: center;
    gap: 10px;
    background: #262019;
    color: #f0f0ee;
    border-radius: 999px;
    padding: 11px 28px;
    font-family: "Bebas Neue", "IPAGothic", sans-serif;
    font-size: 24px;
    letter-spacing: 3px;
    box-shadow: 0 8px 18px rgba(0,0,0,0.25);
  }
  .swipe-hint-sub {
    position: absolute;
    left: 66px;
    bottom: 20px;
    display: flex;
    align-items: center;
    gap: 8px;
    background: #262019;
    color: #f0f0ee;
    border-radius: 999px;
    padding: 9px 24px;
    font-family: "Bebas Neue", "IPAGothic", sans-serif;
    font-size: 21px;
    letter-spacing: 2px;
    box-shadow: 0 8px 18px rgba(0,0,0,0.25);
  }
  .flourish {
    position: absolute;
    right: 30px;
    bottom: 24px;
    font-family: Georgia, "Times New Roman", serif;
    font-style: italic;
    font-size: 17px;
    color: #8a8a84;
    letter-spacing: 0.5px;
  }
  `;
}

function coverHtml(total) {
  const heroUri = photoDataUri(meta.heroImage);
  const overviewBulletsHtml = meta.overviewBullets.map((b) => `<li>${emphasizeQuoted(b)}</li>`).join("");
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<style>
  ${sharedStyle()}
  .header { text-align: center; margin-top: 6px; }
  .brand-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: #262019;
    color: #f0f0ee;
    border-radius: 999px;
    padding: 7px 26px;
    font-family: "Bebas Neue", "IPAGothic", sans-serif;
    font-size: 17px;
    letter-spacing: 4px;
    margin-bottom: 18px;
  }
  .title {
    font-size: 84px;
    letter-spacing: 5px;
    color: #1a1a1a;
    margin: 0;
    line-height: 1;
  }
  .subtitle {
    font-size: 29px;
    font-weight: 700;
    color: #262019;
    margin-top: 20px;
    letter-spacing: 1px;
  }
  .hero-frame {
    margin: 24px auto 20px;
    width: 100%;
    max-width: 900px;
    aspect-ratio: 1263 / 848;
    border-radius: 18px;
    overflow: hidden;
    box-shadow: 0 18px 34px rgba(0,0,0,0.18);
    background: #fffdf6;
  }
  .hero-frame img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
  }
  .overview {
    background: #fffdf6;
    border: 1.5px solid #262019;
    border-radius: 16px;
    padding: 24px 30px;
    margin: 0 6px;
  }
  .overview-heading {
    font-size: 21px;
    font-weight: 700;
    color: #262019;
    margin-bottom: 14px;
  }
  .overview ul strong { font-weight: 700; }
  .overview ul {
    margin: 0;
    padding-left: 26px;
    font-size: 24px;
    line-height: 1.7;
    color: #262019;
  }
</style>
</head>
<body>
  <div class="slide">
    <div class="topbar">
      <div class="brand">${BRAND} ・ ${SERIES}</div>
      <div class="page">1 / ${total}</div>
    </div>
    <div class="header">
      <div class="brand-badge">${meta.badge}</div>
      <h1 class="title display-title">${SERIES}</h1>
      <div class="subtitle">${tai(meta.subtitle)}</div>
    </div>
    <div class="hero-frame"><img src="${heroUri}" alt="${meta.heroAlt || SERIES}"></div>
    <div class="overview">
      <div class="overview-heading">${meta.overviewHeading}</div>
      ${tai(`<ul>${overviewBulletsHtml}</ul>`)}
    </div>
    <div class="swipe-hint">SWIPE FOR DETAILS <span class="arrow">→</span></div>
    <div class="flourish">${SERIES}</div>
  </div>
</body>
</html>`;
}

function eraSectionHtml(era) {
  const mediaHtml = era.media.map(mediaCardHtml).join("");
  const bulletsHtml = era.bullets.map((b) => `<li>${emphasizeQuoted(b)}</li>`).join("");
  const triviaHtml = era.trivia ? `<div class="trivia">${era.trivia}</div>` : "";
  return `
    <div class="era-section">
      <div class="era-heading">
        <h2 class="era-name display-title">${era.name}</h2>
        <div class="era-divider">
          <span class="era-divider-line"></span>
          <span class="era-badge">${era.range}</span>
          <span class="era-divider-line"></span>
        </div>
      </div>
      <div class="media-row">${mediaHtml}</div>
      <div class="points">
        <div class="points-heading">
          <span class="points-label">CHECK POINT</span>
          <span class="points-line"></span>
        </div>
        ${tai(`<ul>${bulletsHtml}</ul>`)}
        ${triviaHtml}
      </div>
      <div class="era-flourish">${SERIES}</div>
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
    position: relative;
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 18px 10px 40px;
  }
  .divider {
    width: 100%;
    border: none;
    border-top: 2.5px dashed #c8c8c2;
    margin: 6px 0;
  }
  .era-heading { text-align: center; width: 100%; margin-bottom: 34px; }
  .era-name {
    font-size: 50px;
    color: #262019;
    margin: 0;
  }
  .era-divider {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 18px;
    margin-top: 24px;
  }
  .era-divider-line {
    flex: 1;
    max-width: 230px;
    height: 2px;
    background: #3a332a;
    opacity: 0.35;
  }
  .era-badge {
    display: inline-block;
    background: #262019;
    color: #f0f0ee;
    font-size: 21px;
    font-weight: 700;
    padding: 6px 22px;
    border-radius: 8px;
    letter-spacing: 0.5px;
    white-space: nowrap;
  }
  .media-row {
    display: flex;
    justify-content: center;
    gap: 14px;
    margin-bottom: 34px;
    flex-wrap: nowrap;
  }
  .media-card {
    width: 205px;
    text-align: center;
  }
  .media-art {
    background: #b3afa4;
    border: 1.5px solid #1a1a1a;
    border-radius: 10px;
    padding: 8px;
    height: 150px;
    box-sizing: content-box;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
  .media-art svg { max-width: 92%; max-height: 92%; display: block; }
  .media-art img { max-width: 92%; max-height: 92%; display: block; object-fit: contain; border-radius: 4px; }
  .media-caption {
    margin-top: 10px;
    font-size: 15px;
    color: #4a4a47;
    letter-spacing: 0.3px;
  }
  .points {
    background: #fffdf6;
    border: 1.5px solid #262019;
    border-radius: 16px;
    padding: 26px 32px;
    margin: 0 6px;
    max-width: 920px;
    width: 100%;
    box-sizing: border-box;
  }
  .points-heading {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 14px;
  }
  .points-label {
    font-family: "Bebas Neue", "IPAGothic", sans-serif;
    font-size: 21px;
    letter-spacing: 3px;
    color: #262019;
    white-space: nowrap;
  }
  .points-line {
    flex: 1;
    height: 2px;
    background: #262019;
    opacity: 0.25;
  }
  .points ul {
    margin: 0;
    padding-left: 26px;
    font-size: 24px;
    line-height: 1.7;
    color: #262019;
  }
  .points ul strong { font-weight: 700; }
  .points .trivia {
    margin-top: 14px;
    padding-top: 14px;
    border-top: 1.5px dashed #c8c8c2;
    font-size: 17px;
    color: #6b6b66;
  }
  .era-flourish {
    position: absolute;
    right: 26px;
    bottom: 6px;
    font-family: Georgia, "Times New Roman", serif;
    font-style: italic;
    font-size: 17px;
    color: #8a8a84;
    letter-spacing: 0.5px;
  }
</style>
</head>
<body>
  <div class="slide">
    <div class="topbar">
      <div class="brand">${BRAND} ・ ${SERIES}</div>
      <div class="page">${index} / ${total}</div>
    </div>
    <div class="content">${sectionsHtml}</div>
    <div class="swipe-hint-sub">SWIPE →</div>
  </div>
</body>
</html>`;
}

// カルーセル最後の「まとめ」ページ：6年代の早見表（左＝年代情報／右＝4項目のディテール写真）＋ CTA。
function summaryHtml(erasList, summaryData, index, total) {
  const rows = erasList
    .map((era, i) => {
      const thumbsHtml = era.media
        .map((item) => `<div class="idx-thumb">${mediaVisual(item)}</div>`)
        .join("");
      return `
      <div class="idx-row">
        <div class="idx-left">
          <div class="idx-num">${i + 1}</div>
          <div class="idx-text">
            <div class="idx-badge">${era.range}</div>
            <div class="idx-name">${era.name}</div>
          </div>
        </div>
        <div class="idx-thumbs">${thumbsHtml}</div>
      </div>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<style>
  ${sharedStyle()}
  .summary-header { text-align: center; margin: 6px 0 24px; }
  .summary-eyebrow {
    display: inline-block;
    border: 2px solid #262019;
    border-radius: 999px;
    padding: 5px 22px;
    font-family: "Bebas Neue", "IPAGothic", sans-serif;
    font-size: 17px;
    letter-spacing: 4px;
    color: #262019;
    margin-bottom: 16px;
  }
  .summary-heading {
    font-size: 46px;
    color: #1a1a1a;
    margin: 0;
  }
  .index {
    display: flex;
    flex-direction: column;
    gap: 9px;
    margin: 0 4px;
  }
  .idx-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    background: #fffdf6;
    border-radius: 14px;
    padding: 10px 22px;
    box-shadow: 0 10px 22px rgba(0,0,0,0.10);
  }
  .idx-left {
    display: flex;
    align-items: center;
    gap: 14px;
    flex: none;
    width: 280px;
  }
  .idx-num {
    width: 28px;
    height: 28px;
    flex: none;
    border-radius: 7px;
    background: #b23b30;
    color: #fff6ee;
    font-size: 14px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .idx-badge {
    display: inline-block;
    background: #262019;
    color: #f0f0ee;
    font-size: 13px;
    font-weight: 700;
    padding: 2px 11px;
    border-radius: 6px;
    white-space: nowrap;
    margin-bottom: 5px;
  }
  .idx-name {
    font-size: 18px;
    font-weight: 700;
    color: #262019;
    line-height: 1.25;
  }
  .idx-thumbs {
    display: flex;
    gap: 10px;
    flex: none;
  }
  .idx-thumb {
    width: 108px;
    height: 108px;
    flex: none;
    border-radius: 10px;
    background: #b3afa4;
    padding: 6px;
    box-sizing: border-box;
    border: 1.5px solid #1a1a1a;
  }
  .idx-thumb svg { width: 100%; height: 100%; display: block; }
  .idx-thumb img { width: 100%; height: 100%; display: block; object-fit: contain; border-radius: 3px; }
  .cta {
    margin-top: 26px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    align-items: center;
  }
  .cta-chips {
    display: flex;
    gap: 14px;
    justify-content: center;
    flex-wrap: wrap;
  }
  .cta-chip {
    display: inline-flex;
    align-items: center;
    background: #262019;
    color: #f0f0ee;
    border-radius: 12px;
    padding: 18px 34px;
    font-family: "Bebas Neue", "IPAGothic", sans-serif;
    font-size: 26px;
    letter-spacing: 2px;
    white-space: nowrap;
  }
  .save-icon {
    width: 24px;
    height: 24px;
    vertical-align: -6px;
  }
  .cta-note {
    margin: 6px 0 0;
    font-size: 16px;
    color: #6b6b66;
    text-align: center;
  }
</style>
</head>
<body>
  <div class="slide">
    <div class="topbar">
      <div class="brand">${BRAND} ・ ${SERIES}</div>
      <div class="page">${index} / ${total}</div>
    </div>
    <div class="summary-header">
      <div class="summary-eyebrow">SUMMARY</div>
      <h1 class="summary-heading display-title">${summaryData.heading}</h1>
    </div>
    <div class="index">${rows}</div>
    <div class="cta">
      <div class="cta-chips">
        <div class="cta-chip">[&nbsp;<svg class="save-icon" viewBox="0 0 24 24" fill="none" stroke="#f0f0ee" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>&nbsp;DON'T FORGET TO SAVE&nbsp;]</div>
      </div>
    </div>
    <div class="flourish">${SERIES}</div>
  </div>
</body>
</html>`;
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// サンドボックス環境ではブラウザ本体が固定パスに置かれているのでそこを指定する。
// ローカル環境では `npx playwright install chromium` で入れた既定の場所を使うので指定しない。
const SANDBOX_CHROMIUM = "/opt/pw-browsers/chromium";
const launchOptions = fs.existsSync(SANDBOX_CHROMIUM) ? { executablePath: SANDBOX_CHROMIUM } : {};
const browser = await chromium.launch(launchOptions);
const page = await browser.newPage({
  viewport: { width: WIDTH, height: HEIGHT },
  deviceScaleFactor: 2,
});

// 既存の出力ファイルを一掃してから作り直す（ページ構成が変わり枚数・番号がズレるため）
const PREFIX = meta.outputPrefix;
for (const f of fs.readdirSync(OUT_DIR)) {
  if (f.startsWith(`${PREFIX}_`)) fs.unlinkSync(path.join(OUT_DIR, f));
}

const SPREAD_SIZE = 1; // 1ページあたりの年代数
const spreads = chunk(eras, SPREAD_SIZE);
const total = spreads.length + 2; // 表紙 + 年代スプレッド + まとめ

await page.setContent(coverHtml(total), { waitUntil: "load" });
const coverPath = path.join(OUT_DIR, `${PREFIX}_01_cover.png`);
await page.screenshot({ path: coverPath, clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT } });
console.log(`Saved: ${coverPath}`);

for (let i = 0; i < spreads.length; i++) {
  const html = spreadHtml(spreads[i], i + 2, total);
  await page.setContent(html, { waitUntil: "load" });
  const outPath = path.join(OUT_DIR, `${PREFIX}_${String(i + 2).padStart(2, "0")}.png`);
  await page.screenshot({ path: outPath, clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT } });
  console.log(`Saved: ${outPath}`);
}

const summaryIndex = spreads.length + 2;
await page.setContent(summaryHtml(eras, summary, summaryIndex, total), { waitUntil: "load" });
const summaryPath = path.join(OUT_DIR, `${PREFIX}_${String(summaryIndex).padStart(2, "0")}_summary.png`);
await page.screenshot({ path: summaryPath, clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT } });
console.log(`Saved: ${summaryPath}`);

await browser.close();
