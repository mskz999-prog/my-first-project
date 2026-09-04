// HTML/CSSテンプレートをPlaywright(Chromium)でレンダリングし、
// Instagram推奨サイズ(1080x1350px)のPNGとして書き出すプロトタイプスクリプト。
//
// 使い方:
//   node content_studio/render.mjs <templateファイル名> <出力ファイル名>
//   例) node content_studio/render.mjs vans_authentic_slide.html vans_authentic_prototype.png

import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

// グローバルにインストールされたplaywrightパッケージを解決する
// (このプロトタイプではプロジェクト側にpackage.jsonを増やさない方針のため)
const require = createRequire(import.meta.url);
const { chromium } = require("/opt/node22/lib/node_modules/playwright");

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const templateName = process.argv[2] ?? "vans_authentic_slide.html";
const outputName = process.argv[3] ?? templateName.replace(/\.html$/, ".png");

const templatePath = path.join(__dirname, "templates", templateName);
const outputPath = path.join(__dirname, "output", outputName);

const WIDTH = 1080;
const HEIGHT = 1350;

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
});
const page = await browser.newPage({
  viewport: { width: WIDTH, height: HEIGHT },
  deviceScaleFactor: 2, // 高解像度で書き出す
});

await page.goto(`file://${templatePath}`);
await page.screenshot({ path: outputPath, clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT } });

await browser.close();

console.log(`Saved: ${outputPath}`);
