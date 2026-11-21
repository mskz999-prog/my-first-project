// トピック（data/<topic>.mjs）を読み込み、画像の「スロット番号」を振る共通ヘルパー。
// tools/gemini_prompts.mjs と tools/ingest.mjs が同じ番号を使うために共有している。
//
// 番号の振り方（固定）:
//   00            … 表紙（meta.heroImage）
//   01, 02, ...   … 年代1の media[0], media[1], ... → 年代2 → ... → extras（特集ページ）の順に通し番号
//
// 例: 3年代×4項目なら 00〜12 の13スロット。

import path from "node:path";
import fs from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const ASSETS_DIR = path.join(ROOT, "assets");
export const OUT_DIR = path.join(ROOT, "output");

export async function loadTopic(topic) {
  const file = path.join(ROOT, "data", `${topic}.mjs`);
  if (!fs.existsSync(file)) throw new Error(`data/${topic}.mjs が見つかりません`);
  return import(pathToFileURL(file).href);
}

// スロット一覧を返す。各要素: { no: "00", kind: "cover"|"media", photo, caption, eraLabel, gemini, ref }
export function slotsOf(mod) {
  const slots = [
    {
      no: "00",
      kind: "cover",
      photo: mod.meta.heroImage,
      caption: mod.meta.heroAlt || "cover",
      eraLabel: "表紙",
      gemini: mod.meta.heroGemini || null,
      ref: mod.meta.heroRef || null,
    },
  ];
  let n = 1;
  for (const era of [...mod.eras, ...(mod.extras || [])]) {
    for (const m of era.media) {
      slots.push({
        no: String(n++).padStart(2, "0"),
        kind: "media",
        photo: m.photo || null,
        caption: m.caption,
        eraLabel: `${era.range} ${era.name}`,
        gemini: m.gemini || null,
        ref: m.ref || null,
      });
    }
  }
  return slots;
}

export function assetExists(rel) {
  return !!rel && fs.existsSync(path.join(ASSETS_DIR, rel));
}
