// データファイルから「Geminiにそのまま貼れるプロンプト集」を自動生成する恒久ツール。
//
// 使い方:
//   node tools/gemini_prompts.mjs <topic>
//   → assets/_private_ref/<topic>/gemini/ に
//      PROMPTS.md（番号ごとの添付ファイルとプロンプト）と、添付用にコピーした参考写真・スタイル見本を作る
//
// ■ 標準のやり方（Levi's 507XXで確立。これ以外は崩れやすかった）
//   細部（01〜）… 「写真に忠実」モード。参考写真1枚だけを添付し、そのまま水彩イラスト化させる。
//                 見本の絵は付けない（見本の方を描き直される）。比率は写真のまま（違う比率を指定すると描き足される）。
//                 色も写真どおり（水彩と言うだけだと色が薄くなる）。
//   表紙（00）… 実物写真を複数枚（meta.heroRefs）＋画風見本（_brand の geminiStyle.cover＝VANS表紙）。
//                 画風見本は「形が写らない物」にする（別モデルの服の絵を付けると形を真似される）。
//   → 参考写真の出来がそのまま絵の出来になる。先に tools/prep_ref.mjs で下ごしらえ・点検すること。
//
// データ側に書くもの（data/<topic>.mjs）:
//   meta.heroImage   … 表紙の保存先（例 "covers/levis_506xx_hero.jpg"）
//   meta.heroRefs    … 表紙の参考写真（配列・assets/ からの相対パス）。平置きで袖が胴に付いた正面写真を2〜3枚
//   meta.heroGemini  … { subject: "英語で被写体", details: ["英語の正確さ要件", ...], check: "日本語の確認点",
//                        styleImage: 追加の画風見本（任意・質感の切り抜き等）, intro/styleText: 冒頭・画風の上書き（任意） }
//   media[].photo    … Gemini画像の保存先（例 "levis_506xx/e1_patch.jpg"）
//   media[].ref      … 参考写真（prep_ref で切り抜いた物）
//   media[].gemini   … { item: "英語で被写体", key: "英語で必ず見えるべき点",
//                        text: "写させたい文字（任意）", notes: ["英語の追加指示", ...],
//                        check: "日本語の確認ポイント（任意）",
//                        faithful: false にすると旧来の「描き直し」モード（非推奨） }
// スロット番号は lib/topic.mjs の規則（00=表紙、01〜=年代順の通し番号）。
// 同じ photo を指す2回目以降の項目は gemini を書かない（使い回し）。

import fs from "node:fs";
import path from "node:path";
import { loadTopic, slotsOf, ASSETS_DIR } from "../lib/topic.mjs";

const topic = process.argv[2];
if (!topic) {
  console.log("使い方: node tools/gemini_prompts.mjs <topic>");
  process.exit(1);
}
const mod = await loadTopic(topic);
const { brand } = await import("../data/_brand.mjs");
const style = brand.geminiStyle || {};
const outDir = path.join(ASSETS_DIR, "_private_ref", topic, "gemini");
fs.rmSync(outDir, { recursive: true, force: true }); // 古い添付ファイルが残って取り違えないように毎回作り直す
fs.mkdirSync(outDir, { recursive: true });

function copyIn(rel, name) {
  if (!rel) return null;
  const src = path.join(ASSETS_DIR, rel);
  if (!fs.existsSync(src)) return `（未配置: ${rel}）`;
  const dest = `${name}${path.extname(rel)}`;
  fs.copyFileSync(src, path.join(outDir, dest));
  return dest;
}

// 色について（507XXで「水彩」と指定すると全体に色が薄くなった）
const COLOR_RULE =
  "COLOR: match the photo's colors, values and contrast exactly — the same depth of indigo, the same darks and highlights, the same thread and leather colors. Do NOT lighten, wash out, pastelize or desaturate anything; use the watercolor at full pigment strength.";

// ---- 細部：写真に忠実モード（標準） ----
// 4:3など写真と違う比率を指定すると、足りない部分を描き足してボタン等が増えた。
// 画風の説明に「金属」等の物の名前を入れると、それも描き足されやすかった。→ 比率は写真のまま・画風は最小限の言葉で。
function faithfulPrompt(g) {
  return `This is a STYLE-TRANSFER task only — like applying a watercolor filter to the attached photo. Only ONE image is attached: the photo.

Output the SAME image as the photo, just rendered as a hand-drawn watercolor:
- the same crop, framing, angle and aspect ratio as the photo — do NOT extend, zoom out or re-frame
- every object, seam, stitch line, edge, fold and wrinkle exactly where it is in the photo, in the same number
- add NOTHING that is not in the photo (no buttons, rivets, stitches, tabs, labels, tools, hands, text) and remove nothing
- if anything is unclear, copy the photo as it is — never invent

Medium: fine ink linework with rich, layered watercolor on warm ivory paper, fabric grain shown with fine hatching.
${COLOR_RULE}

Must stay clearly visible: ${g.key}${g.text ? `\nLettering: copy it exactly as it appears in the photo (${g.text}).` : ""}
${(g.notes || []).length ? "\n" + g.notes.map((x) => `- ${x}`).join("\n") + "\n" : ""}
No added text, no watermark.`;
}

// ---- 細部：旧来の描き直しモード（gemini.faithful === false の時だけ。崩れやすいので非推奨） ----
const STYLE_TEXT =
  "fine ink/pencil linework, layered watercolor, fabric weave drawn as fine diagonal hatching, warm ivory textured paper. Denim must look like real well-worn vintage denim, not flat. Hand-drawn editorial field-notebook feel — not photorealistic, not cartoonish.";
function redrawPrompt(g) {
  return `Create an original illustration of ${g.item}. Use the attached STYLE sample for the drawing style only. Follow the attached reference photo FAITHFULLY for the construction: the shapes of pockets and flaps, where every seam and stitch line runs, and how the parts connect must match the photo — do not invent, add, remove or rearrange parts.

STYLE: ${STYLE_TEXT}
${COLOR_RULE}

MUST BE CLEARLY READABLE: ${g.key}${g.text ? `\nEXACT LETTERING: ${g.text}` : ""}
${(g.notes || []).length ? "\n" + g.notes.map((x) => `- ${x}`).join("\n") + "\n" : ""}
Keep the photo's aspect ratio. ${g.allowHand ? "No tweezers or hangers; one fingertip only as described above." : "No tweezers, hands or hangers."} No extra text, no watermark.`;
}

const isFaithful = (g) => g.faithful !== false;

// ---- 表紙 ----
function coverPrompt(g, styleCount, photoCount) {
  const intro =
    g.intro ||
    `Create a hand-drawn watercolor illustration of ${g.subject}, front view, laid flat and buttoned. Attachments, in this order: the first ${styleCount > 1 ? `${styleCount} images are` : "image is"} drawing-style ${styleCount > 1 ? "samples" : "sample"} only — copy the technique, NOT the subject or its shape. The remaining ${photoCount} images are photos of real original garments. Follow these photos faithfully for the shape, proportions, how it lies flat (including where the sleeves lie), and every construction detail. Natural vintage wear (fading, fraying, small repairs) is welcome. Do not reproduce the photos' backgrounds or lighting.`;
  const styleText =
    g.styleText ||
    "soft graphite pencil outlines and sketch lines with layered watercolor, gentle soft-edged shading, warm ivory textured paper with a loose wash vignette. Keep the rugged character of real vintage fabric: visible weave, natural fading, abraded edges, roped seams. Painterly — not photorealistic, not glossy, not cartoonish.";
  return `${intro}

STYLE: ${styleText}
COLOR: take the colors from the photos — the same depth of indigo and the same contrast. Do NOT lighten, wash out or desaturate.

SUBJECT DETAILS (must be accurate):
${(g.details || []).map((d) => `- ${d}`).join("\n")}

COMPOSITION: landscape 3:2 canvas, the subject fills about 70% of the width with generous empty margin. Plain textured paper background only — no text, no logos, no watermark, no hanger.`;
}

const slots = slotsOf(mod);
let md = `# ${mod.meta.series} — Gemini用プロンプト（自動生成）\n\n`;
md += `生成コマンド: \`node tools/gemini_prompts.mjs ${topic}\`（データを直したら再実行すれば作り直せる）\n\n`;
md += `## 使い方\n`;
md += `1. **番号ごとにGeminiの新しいチャット**を開く（前の絵に引っ張られないように）。\n`;
md += `2. 「添付」欄のファイルを**書いてある順番どおり**にアップロードし、プロンプトを貼る。\n`;
md += `3. できた画像は、番号を添えてClaudeのチャットに貼る（例:「05」と書いて画像を貼る。何枚まとめてでもOK）。\n`;
md += `4. 余計な物が足された・形が変わった時は、同じチャットで直すより新しいチャットでやり直す方が早い。\n\n`;

const missing = [];
for (const slot of slots) {
  if (!slot.gemini) {
    missing.push(slot.no);
    continue;
  }
  const g = slot.gemini;
  let attach, prompt;
  if (slot.kind === "cover") {
    const heroRefs = mod.meta.heroRefs || [mod.meta.heroRef].filter(Boolean);
    const styleImgs = [style.cover, ...[].concat(g.styleImage || [])].filter(Boolean);
    const styles = styleImgs.map((f, i) => copyIn(f, `${slot.no}_style_${i + 1}`));
    const refs = heroRefs.map((r, i) => copyIn(r, `${slot.no}_ref_${i + 1}`));
    attach = [...styles, ...refs];
    prompt = coverPrompt(g, styles.length, refs.length);
  } else if (isFaithful(g)) {
    attach = [copyIn(slot.ref, `${slot.no}_ref`)]; // 写真1枚だけ
    prompt = faithfulPrompt(g);
  } else {
    attach = [copyIn(style.detail, "STYLE_detail"), copyIn(slot.ref, `${slot.no}_ref`)];
    prompt = redrawPrompt(g);
  }
  md += `---\n\n## ${slot.no}｜${slot.eraLabel}｜${slot.caption}\n\n`;
  md += `- 添付（この順番で）: ${attach.filter(Boolean).join(" ＋ ") || "（なし）"}\n`;
  md += `- 保存先: assets/${slot.photo || "（data に photo 未設定）"}\n`;
  md += `- 確認ポイント: ${g.check || g.key || (g.details || []).join(" / ")}\n\n`;
  md += "```\n" + prompt + "\n```\n\n";
}
fs.writeFileSync(path.join(outDir, "PROMPTS.md"), md);
console.log(`作成: ${path.join(outDir, "PROMPTS.md")}（${slots.length - missing.length}件）`);
if (missing.length) console.log(`gemini 指定が無いため飛ばしたスロット（使い回し等）: ${missing.join(", ")}`);
