// HTML/CSSテンプレートをPlaywright(Chromium)でレンダリングし、
// Instagram推奨サイズ(1080x1350px)のPNGとして書き出すプロトタイプスクリプト。
//
// 使い方:
//   node content_studio/render.mjs <templateファイル名> <出力ファイル名>
//   例) node content_studio/render.mjs vans_authentic_slide.html vans_authentic_prototype.png

import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

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

const templateName = process.argv[2] ?? "vans_authentic_slide.html";
const outputName = process.argv[3] ?? templateName.replace(/\.html$/, ".png");

const templatePath = path.join(__dirname, "templates", templateName);
const outputPath = path.join(__dirname, "output", outputName);

const WIDTH = 1080;
const HEIGHT = 1350;

// サンドボックス環境ではブラウザ本体が固定パスに置かれているのでそこを指定する。
// ローカル環境では `npx playwright install chromium` で入れた既定の場所を使うので指定しない。
const SANDBOX_CHROMIUM = "/opt/pw-browsers/chromium";
const launchOptions = fs.existsSync(SANDBOX_CHROMIUM) ? { executablePath: SANDBOX_CHROMIUM } : {};
const browser = await chromium.launch(launchOptions);
const page = await browser.newPage({
  viewport: { width: WIDTH, height: HEIGHT },
  deviceScaleFactor: 2, // 高解像度で書き出す
});

await page.goto(`file://${templatePath}`);
await page.screenshot({ path: outputPath, clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT } });

await browser.close();

console.log(`Saved: ${outputPath}`);
