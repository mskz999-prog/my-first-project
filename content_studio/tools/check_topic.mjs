// データファイル（data/<topic>.mjs）の「壊れていないか」点検ツール。
// Levi's 507XXで、編集ミスにより項目が2つ消えたのに気づくのが遅れた反省から作成。
// データを直したら毎回これを実行する（数秒で終わる）。
//
// 使い方: node tools/check_topic.mjs <topic>
// 見ること:
//   - 各ページ（年代・特集）の写真の数が、早見ガイドの列数（summary.columns）とそろっているか
//   - 写真を初めて使う項目に gemini（プロンプト）と ref（参考写真）があるか／参考写真ファイルが実在するか
//   - Gemini画像の取り込み状況（済／未）
// 問題があれば終了コード1で終わる。

import fs from "node:fs";
import path from "node:path";
import { loadTopic, slotsOf, ASSETS_DIR } from "../lib/topic.mjs";

const topic = process.argv[2];
if (!topic) {
  console.log("使い方: node tools/check_topic.mjs <topic>");
  process.exit(1);
}
const mod = await loadTopic(topic);
const exists = (rel) => !!rel && fs.existsSync(path.join(ASSETS_DIR, rel));
const problems = [];
const cols = (mod.summary && mod.summary.columns) || [];

console.log(`■ ${mod.meta.series}（data/${topic}.mjs）`);
const pages = [...mod.eras.map((e) => ({ ...e, kind: "年代" })), ...(mod.extras || []).map((e) => ({ ...e, kind: "特集" }))];
const firstUse = new Set();
for (const p of pages) {
  const n = p.media.length;
  const mark = p.kind === "年代" && cols.length && n !== cols.length ? "✗" : "○";
  if (mark === "✗") problems.push(`${p.range} ${p.name}: 写真が${n}枚（早見ガイドの列は${cols.length}）`);
  console.log(`${mark} [${p.kind}] ${p.range} ${p.name} … ${n}枚: ${p.media.map((m) => m.caption).join(" / ")}`);
  for (const m of p.media) {
    if (!m.photo) { problems.push(`${p.range}「${m.caption}」: photo（保存先）が無い`); continue; }
    if (firstUse.has(m.photo)) continue; // 使い回し（2回目以降）は gemini/ref 不要
    firstUse.add(m.photo);
    // meta.ownPhotos: 本人撮影の写真をそのまま使うトピック（Five Brotherタグ等）はGemini/参考写真が不要
    if (mod.meta.ownPhotos) continue;
    if (!m.gemini) problems.push(`${p.range}「${m.caption}」: 初出なのに gemini（プロンプト）が無い`);
    if (!m.ref) problems.push(`${p.range}「${m.caption}」: ref（参考写真）が無い`);
    else if (!exists(m.ref)) problems.push(`${p.range}「${m.caption}」: 参考写真ファイルが無い（${m.ref}）`);
  }
}
for (const r of mod.meta.heroRefs || [mod.meta.heroRef].filter(Boolean))
  if (!exists(r)) problems.push(`表紙の参考写真ファイルが無い（${r}）`);
if (!mod.meta.heroGemini && !mod.meta.ownPhotos) problems.push("表紙の heroGemini（プロンプト）が無い");

const slots = slotsOf(mod);
const done = slots.filter((s) => exists(s.photo)).length;
console.log(`\nGemini画像: ${done}/${slots.length} スロット取り込み済み（使い回しを含む）`);

if (problems.length) {
  console.log(`\n✗ 要確認 ${problems.length} 件:`);
  for (const p of problems) console.log(`  - ${p}`);
  process.exit(1);
}
console.log("\n問題なし");
