// 取り込み済みのGeminiの絵の「色の傾向」だけを、その番号の参考写真に寄せる（形は変えない）。
// 2段階方式（tools/gemini_prompts.mjs）で、塗りの色が写真より灰色っぽい・浅い時の仕上げ用。
//
// 使い方:
//   node tools/color_match.mjs <topic> 02            … 02番を写真に寄せる（強さ0.7）
//   node tools/color_match.mjs <topic> 02 --amount 1 … 強さ 0〜1（1=完全に合わせる）
// 元の絵は <ファイル名>.orig.jpg として一度だけ退避し、毎回そこから作り直す（何度かけても劣化しない）。

import fs from "node:fs";
import path from "node:path";
import { loadTopic, slotsOf, ASSETS_DIR } from "../lib/topic.mjs";
import { colorTransfer } from "../lib/color_transfer.mjs";

const [topic, no, ...rest] = process.argv.slice(2);
if (!topic || !no) {
  console.log("使い方: node tools/color_match.mjs <topic> <番号> [--amount 0.7]");
  process.exit(1);
}
const ai = rest.indexOf("--amount");
const amount = ai >= 0 ? Number(rest[ai + 1]) : 0.7;
const slot = slotsOf(await loadTopic(topic)).find((s) => s.no === no.padStart(2, "0"));
if (!slot?.photo || !slot?.ref) {
  console.log(`${no}番に photo か ref がありません`);
  process.exit(1);
}
const img = path.join(ASSETS_DIR, slot.photo);
const orig = img.replace(/\.jpg$/, ".orig.jpg");
if (!fs.existsSync(img)) {
  console.log(`まだ絵がありません: assets/${slot.photo}`);
  process.exit(1);
}
if (!fs.existsSync(orig)) fs.copyFileSync(img, orig);
await colorTransfer(orig, path.join(ASSETS_DIR, slot.ref), img, amount);
console.log(`○ ${slot.no} ${slot.caption} → assets/${slot.photo}（強さ${amount}・元の絵は ${path.basename(orig)}）`);
