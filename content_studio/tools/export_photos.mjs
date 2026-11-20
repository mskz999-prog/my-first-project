// 完成したカルーセル画像を、Macの「写真」アプリのアルバムに正しい順番で保存する恒久ツール。
// iCloud写真がオンなら、少し待つとスマホの写真アプリにも同じアルバムが出てくる。
//
// 使い方:
//   node tools/export_photos.mjs <topic>
//   → アルバム「VFN <series>」に output/<outputPrefix>_*.png を 01 → 最後 の順で追加
//
// 並び順の工夫: 写真アプリは撮影日時順に並べるため、ファイルの日時を「1分ずつずらした過去の時刻」
// に書き換えてから取り込む（01が一番古い＝先頭）。
// 非公開版（*_private_*）は誤って投稿しないよう取り込まない。

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { loadTopic, OUT_DIR } from "../lib/topic.mjs";

const topic = process.argv[2];
if (!topic) {
  console.log("使い方: node tools/export_photos.mjs <topic>");
  process.exit(1);
}
const { meta } = await loadTopic(topic);
const prefix = meta.outputPrefix;
if (prefix.includes("_private")) {
  console.log("非公開版は写真アプリに保存しません（投稿事故防止）");
  process.exit(1);
}
const files = fs
  .readdirSync(OUT_DIR)
  .filter((f) => f.startsWith(`${prefix}_`) && f.endsWith(".png") && !f.includes("_private_"))
  .sort();
if (!files.length) {
  console.log(`output/ に ${prefix}_*.png がありません。先にレンダリングしてください`);
  process.exit(1);
}

const base = Date.now() - 24 * 60 * 60 * 1000; // 1日前を起点に1分ずつ
files.forEach((f, i) => {
  const t = new Date(base + i * 60 * 1000);
  fs.utimesSync(path.join(OUT_DIR, f), t, t);
});

const album = `VFN ${meta.series}`.replace(/"/g, "");
const list = files.map((f) => `(POSIX file "${path.join(OUT_DIR, f)}") as alias`).join(", ");
const script = `
tell application "Photos"
  if not (exists album "${album}") then make new album named "${album}"
  set imported to import {${list}} into album "${album}" skip check duplicates true
  return (count of imported) as text
end tell`;
const n = execFileSync("osascript", ["-e", script], { encoding: "utf8", timeout: 180000 }).trim();
console.log(`写真アプリのアルバム「${album}」に ${n} 枚保存しました:`);
files.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
