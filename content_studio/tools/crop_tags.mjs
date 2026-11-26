// 本人撮影の一覧写真から、各タグを切り出して assets/ に書き出す恒久ツール（Five Brother TAG ARCHIVEで作成）。
// meta.ownPhotos のトピック用（Geminiイラスト化しない＝写真をそのまま公開版に使う）。
//
// 使い方: node tools/crop_tags.mjs <topic>
//   data/<topic>.mjs の meta.sourceImage（元の一覧写真）から、media[].crop = [左, 上, 右, 下]（px）の範囲を
//   切り出し、media[].photo の保存先にJPEGで書き出す。元写真が小さいので3倍に拡大して保存する
//   （カルーセルで大きく表示したときのボケを少しでも抑えるため）。
//   切り抜き位置を直したいときは、データの crop を書き換えてもう一度実行する（毎回上書き）。

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { loadTopic, ASSETS_DIR } from "../lib/topic.mjs";

const topic = process.argv[2];
if (!topic) {
  console.log("使い方: node tools/crop_tags.mjs <topic>");
  process.exit(1);
}
const mod = await loadTopic(topic);
// タグごとに別の写真から切り出したいときは media[].src に元写真（assets/ からの相対パス）を書く（BIG MACで追加）。
// 大きめの写真は SCALE 倍にすると巨大になるので、幅が maxW を超えない範囲で拡大する。
const srcOf = (m) => {
  const rel = m.src || mod.meta.sourceImage;
  const p = path.join(ASSETS_DIR, rel);
  if (!fs.existsSync(p)) throw new Error(`元の写真がありません: ${rel}`);
  return p;
};
const SCALE = 3;
const MAX_W = 1200;

let n = 0;
for (const era of mod.eras) {
  for (const m of era.media) {
    if (!m.crop || !m.photo) continue;
    const [x0, y0, x1, y1] = m.crop;
    const out = path.join(ASSETS_DIR, m.photo);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    await sharp(srcOf(m))
      .extract({ left: x0, top: y0, width: x1 - x0, height: y1 - y0 })
      .resize({ width: Math.min((x1 - x0) * SCALE, Math.max(MAX_W, x1 - x0)), kernel: "lanczos3" })
      .jpeg({ quality: 95 })
      .toFile(out);
    console.log(`○ ${m.caption} → ${m.photo}`);
    n++;
  }
}
console.log(`\n${n}枚を書き出しました`);
