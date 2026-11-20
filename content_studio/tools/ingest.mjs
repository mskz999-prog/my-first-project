// Geminiでできた画像を、スロット番号に従って assets/ の正しい場所へ保存する恒久ツール。
// 保存先はデータファイルの photo（表紙は meta.heroImage）なので、データを書き換える必要はない。
//
// 使い方:
//   node tools/ingest.mjs <topic> 05=/path/to/image.webp 06=/path/to/other.png ...
//   node tools/ingest.mjs <topic> --inbox
//     → gemini_inbox/ にある「05.png」「05_何か.jpg」のような番号付きファイルを取り込み、
//        取り込んだものは gemini_inbox/_done/ へ移す
//   node tools/ingest.mjs <topic> --status
//     → 各スロットの配置状況（済／未）を一覧表示
//
// 画像は JPEG（品質92）に変換して保存する。既にある場合は上書き（古いものは .bak に退避）。

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { loadTopic, slotsOf, ASSETS_DIR, ROOT, assetExists } from "../lib/topic.mjs";

const [topic, ...rest] = process.argv.slice(2);
if (!topic) {
  console.log("使い方: node tools/ingest.mjs <topic> NN=<画像パス> ... | --inbox | --status");
  process.exit(1);
}
const slots = slotsOf(await loadTopic(topic));
const byNo = Object.fromEntries(slots.map((s) => [s.no, s]));

if (rest.includes("--status")) {
  for (const s of slots) console.log(`${s.no} ${assetExists(s.photo) ? "済" : "未"}  ${s.eraLabel}｜${s.caption}  → ${s.photo || "(photo未設定)"}`);
  process.exit(0);
}

let pairs = rest.filter((a) => a.includes("=")).map((a) => a.split(/=(.*)/s).slice(0, 2));
const inbox = path.join(ROOT, "gemini_inbox");
if (rest.includes("--inbox")) {
  for (const f of fs.readdirSync(inbox)) {
    const m = f.match(/^(\d{2})(?:[_\-. ].*)?\.(jpe?g|png|webp)$/i);
    if (m) pairs.push([m[1], path.join(inbox, f)]);
  }
}
if (!pairs.length) {
  console.log("取り込む画像がありません");
  process.exit(1);
}

for (const [noRaw, src] of pairs) {
  const no = noRaw.padStart(2, "0");
  const slot = byNo[no];
  if (!slot) {
    console.log(`× ${no}: そのスロット番号はありません`);
    continue;
  }
  if (!slot.photo) {
    console.log(`× ${no}: data 側に photo（保存先）が未設定です`);
    continue;
  }
  if (!fs.existsSync(src)) {
    console.log(`× ${no}: 画像ファイルが見つかりません: ${src}`);
    continue;
  }
  const dest = path.join(ASSETS_DIR, slot.photo);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (fs.existsSync(dest)) fs.copyFileSync(dest, dest + ".bak");
  let info;
  try {
    info = await sharp(src).jpeg({ quality: 92 }).toFile(dest);
  } catch (e) {
    console.log(`× ${no}: 変換に失敗しました（${e.message}）`);
    continue;
  }
  console.log(`○ ${no} ${slot.caption} → assets/${slot.photo}（${info.width}x${info.height}）`);
  if (src.startsWith(inbox)) {
    fs.mkdirSync(path.join(inbox, "_done"), { recursive: true });
    fs.renameSync(src, path.join(inbox, "_done", path.basename(src)));
  }
}
