// データファイルから「Geminiにそのまま貼れるプロンプト集」を自動生成する恒久ツール。
// Levi's 557制作で起きた失敗（写真にフィルターをかけただけ／パーツが鏡写し／ボタンがお皿型 など）
// の対策を最初からプロンプトに入れてある。
//
// 使い方:
//   node tools/gemini_prompts.mjs <topic>
//   → assets/_private_ref/<topic>/gemini/ に
//      PROMPTS.md（番号ごとの添付ファイルとプロンプト）と、添付用にコピーした参考写真・スタイル見本を作る
//
// データ側に書くもの（data/<topic>.mjs）:
//   meta.heroImage   … 表紙の保存先（例 "covers/levis_507_hero.jpg"）
//   meta.heroRef     … 表紙の参考写真（assets/ からの相対パス。_private_ref/... など）
//   meta.heroGemini  … { subject: "英語で被写体", details: ["英語の正確さ要件", ...] }
//   media[].photo    … Gemini画像の保存先（例 "levis_507/e1_patch.jpg"）
//   media[].ref      … 参考写真
//   media[].gemini   … { item: "英語で被写体", key: "英語で必ず読めるべき点",
//                        text: "正確に書かせたい文字（任意）", notes: ["英語の追加指示", ...],
//                        check: "日本語の確認ポイント（任意）" }
// スロット番号は lib/topic.mjs の規則（00=表紙、01〜=年代順の通し番号）。

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
fs.mkdirSync(outDir, { recursive: true });

function copyIn(rel, name) {
  if (!rel) return null;
  const src = path.join(ASSETS_DIR, rel);
  if (!fs.existsSync(src)) return `（未配置: ${rel}）`;
  const dest = `${name}${path.extname(rel)}`;
  fs.copyFileSync(src, path.join(outDir, dest));
  return dest;
}

const styleCover = copyIn(style.cover, "STYLE_cover");
const styleDetail = copyIn(style.detail, "STYLE_detail");

const STYLE_TEXT =
  "fine ink/pencil linework, soft layered watercolor washes, fabric weave drawn as fine diagonal hatching, muted natural colors (deep indigo denim, tan/orange thread, aged tan paper, aged silver/copper metal), warm ivory textured paper. Denim must look like real well-worn vintage denim, not flat: mottled indigo with natural fading, pale abraded edges and roping along seams. Hand-drawn editorial field-notebook feel — not photorealistic, not cartoonish.";

// 被写体の種類ごとに、過去に崩れた点の予防指示を自動で足す
function autoNotes(g) {
  const s = `${g.item} ${g.key}`.toLowerCase();
  const n = [];
  if (/button|rivet|snap/.test(s))
    n.push(
      "The button is a gently CONVEX DOME bulging toward the viewer with only a thin, low rolled rim — not a dish with a raised ring. Any stamped letter or number is EMBOSSED (raised). No other marks on the button."
    );
  if (/flap|pocket/.test(s) && !/\btab\b/.test(s)) // 赤タブ等の「ポケット脇の小物」には付けない
    n.push(
      "Draw the structure correctly: the flap and the pocket body are different shapes — do NOT mirror or duplicate them. Only the flap has a buttonhole; the pocket body has the button."
    );
  // 文字を指定した時だけ（「文字が読めない革パッチ」等に誤って付かないように）
  if (g.text && /patch|label|tag/.test(s))
    n.push("Keep the lettering crisp and spelled exactly as specified. Do not invent extra words, signatures or numbers.");
  return n;
}

// gemini.allowHand … 「指でめくる」等、指先を描かせたい時だけ true
// gemini.faithful … 参考写真を「そのまま水彩イラスト化」する指示に切り替える（形を勝手に変えられる時用）
function faithfulPrompt(g) {
  // 507XXで分かったこと: 4:3など写真と違う比率を指定すると、足りない部分をGeminiが描き足してボタン等が増える。
  // 画風の説明に「金属」等の語があると、それも描き足されやすい。→ 比率は写真のまま・画風は最小限の言葉で。
  return `This is a STYLE-TRANSFER task only — like applying a watercolor filter to the attached photo. Only ONE image is attached: the photo.

Output the SAME image as the photo, just rendered as a hand-drawn watercolor:
- the same crop, framing, angle and aspect ratio as the photo — do NOT extend, zoom out or re-frame
- every object, seam, stitch line, edge, fold and wrinkle exactly where it is in the photo, in the same number
- add NOTHING that is not in the photo (no buttons, rivets, stitches, tabs, labels, tools, hands, text) and remove nothing
- if anything is unclear, copy the photo as it is — never invent

Medium: fine ink linework with soft transparent watercolor washes on warm ivory paper, fabric grain shown with fine hatching, colors close to the photo.

Must stay clearly visible: ${g.key}${g.text ? `\nLettering: copy it exactly as it appears in the photo (${g.text}).` : ""}
${(g.notes || []).length ? "\n" + g.notes.map((x) => `- ${x}`).join("\n") + "\n" : ""}
No added text, no watermark.`;
}

function detailPrompt(slot) {
  const g = slot.gemini;
  if (g.faithful) return faithfulPrompt(g);
  const notes = [...autoNotes(g), ...(g.notes || [])];
  return `Create an original illustration of ${g.item}. Use the attached STYLE sample for the drawing style only. Follow the attached reference photo FAITHFULLY for the construction: the shapes of pockets and flaps, where every seam and stitch line runs, and how the parts connect must match the photo — do not invent, add, remove or rearrange parts. Redraw it by hand in the illustration style (do NOT just apply a filter to the photo).

STYLE: ${STYLE_TEXT}

MUST BE CLEARLY READABLE: ${g.key}${g.text ? `\nEXACT LETTERING: ${g.text}` : ""}
${notes.length ? "\n" + notes.map((x) => `- ${x}`).join("\n") + "\n" : ""}
4:3 landscape canvas, the detail fills the frame. ${g.allowHand ? "No tweezers or hangers; one fingertip only as described above." : "No tweezers, hands or hangers."} No extra text, no watermark.`;
}

// heroGemini.intro … 冒頭の指示文の上書き（添付の使い方を変える時）
// heroGemini.styleText … 表紙だけ画風を変えたい時の上書き（例: 507XXはフォトリアル寄り）
function coverPrompt(slot) {
  const g = slot.gemini;
  return `${g.intro || `Create an original hand-drawn illustration of ${g.subject}. Use the attached STYLE sample for the drawing style, and the attached reference photo ONLY for construction details. Redraw it in your own composition — do not trace or filter the photo.`}

STYLE: ${g.styleText || "fine graphite pencil linework with soft, layered watercolor washes, visible sketch lines, subtle paper grain on warm ivory textured paper, muted natural colors, soft cast shadow. Calm editorial field-notebook feel — not cartoonish, not photorealistic."}

SUBJECT DETAILS (must be accurate):
${(g.details || []).map((d) => `- ${d}`).join("\n")}

COMPOSITION: landscape 3:2 canvas, the subject fills about 70% of the width with generous empty margin. Plain textured paper background only — no text, no logos, no watermark, no hanger.`;
}

const slots = slotsOf(mod);
let md = `# ${mod.meta.series} — Gemini用プロンプト（自動生成）\n\n`;
md += `生成コマンド: \`node tools/gemini_prompts.mjs ${topic}\`（データを直したら再実行すれば作り直せる）\n\n`;
md += `## 使い方\n`;
md += `1. Geminiで**新しいチャット**を開く（前のトピックの絵に引っ張られないように）。\n`;
md += `2. 番号ごとに「添付」欄のファイルをこのフォルダからアップロードし、プロンプトを貼る。\n`;
md += `3. できた画像は、番号を添えてClaudeのチャットに貼る（例:「05」と書いて画像を貼る）。\n`;
md += `4. 崩れたら同じチャットで修正指示、2回直してもダメなら新しいチャットでやり直す。\n`;
md += `5. 一度うまくできた画像は、次からSTYLE見本の代わりに添付するとタッチがそろいやすい。\n\n`;

const missing = [];
for (const slot of slots) {
  if (!slot.gemini) {
    missing.push(slot.no);
    continue;
  }
  // 表紙は meta.heroRefs（配列）で参考写真を複数枚添付できる（1枚の写真の描き写しにならないように）
  const refs =
    slot.kind === "cover" && mod.meta.heroRefs
      ? mod.meta.heroRefs.map((r, i) => copyIn(r, `${slot.no}_ref_${i + 1}`))
      : [copyIn(slot.ref, `${slot.no}_ref`)];
  const ref = refs.filter(Boolean).join(" ＋ ");
  // heroGemini.styleImage … 表紙専用の画風見本（シルエットが写らない質感の切り抜き等）。styleより優先
  const styleFile =
    slot.kind === "cover" && slot.gemini.styleImage
      ? [].concat(slot.gemini.styleImage).map((f, i, arr) => copyIn(f, arr.length > 1 ? `${slot.no}_style_${i + 1}` : `${slot.no}_style`)).join(" ＋ ")
      : slot.kind === "cover" && slot.gemini.style !== "detail" ? styleCover
      : slot.gemini.faithful ? null // 写真忠実モードは写真1枚だけ（見本の絵を付けると、見本の方を描き直されたため）
      : styleDetail;
  md += `---\n\n## ${slot.no}｜${slot.eraLabel}｜${slot.caption}\n\n`;
  md += `- 添付: ${[styleFile, ref].filter(Boolean).join(" ＋ ") || "（なし）"}\n`;
  md += `- 保存先: assets/${slot.photo || "（data に photo 未設定）"}\n`;
  md += `- 確認ポイント: ${slot.gemini.check || slot.gemini.key || (slot.gemini.details || []).join(" / ")}\n\n`;
  md += "```\n" + (slot.kind === "cover" ? coverPrompt(slot) : detailPrompt(slot)) + "\n```\n\n";
}
fs.writeFileSync(path.join(outDir, "PROMPTS.md"), md);
console.log(`作成: ${path.join(outDir, "PROMPTS.md")}（${slots.length - missing.length}件）`);
if (missing.length) console.log(`gemini 指定が無いため飛ばしたスロット: ${missing.join(", ")}`);
