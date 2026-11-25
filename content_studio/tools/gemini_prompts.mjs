// データファイルから「Geminiにそのまま貼れるプロンプト集」を自動生成する恒久ツール。
//
// 使い方:
//   node tools/gemini_prompts.mjs <topic>
//   → assets/_private_ref/<topic>/gemini/ に
//      PROMPTS.md（番号ごとの添付ファイルとプロンプト）と、添付用にコピーした参考写真・スタイル見本を作る
//
// ■ 今の標準（506XX 04〜）: 細部は「557方式」= 写真は参考だけ・描く物を英語で名指し・VANSの靴の絵を技法見本に、1回で描き起こし（sketchPrompt）。
//   以下の「写真に忠実」「2段階」は過去の経緯（gemini.twoStep / gemini.oneStep: true で今も使える）。
// ■ 旧標準（Levi's 507XXで確立）
//   細部（01〜）… 「写真に忠実」モード。参考写真1枚だけを添付し、そのまま水彩イラスト化させる。
//                 比率は写真のまま（違う比率を指定すると描き足される）。
//                 506XXから: 写真1枚だけだと実写のまま返るようになったため、写真を1枚目・成功した絵（geminiStyle.detail）を
//                 2枚目に「技法だけ」の見本として付ける（507XXでは見本を先に付けて見本の方を描き直されたので、必ず写真が先）。
//                 見本を付けたくない項目は gemini.noStyle: true。
//                 見本は「デニムの網目だけ」の切り抜き（style_samples/denim_hatching_crop.jpg）。物が写った絵（557のDボタン）を
//                 付けたら写真を無視してDボタンを描き直された（506XX 01）。一発目は写真っぽく返りやすいが、手順5の「一押し文」で絵になった。
//                 色も写真どおり（水彩と言うだけだと色が薄くなる）。
//   ★506XX 02で確立した「2段階」方式（今の標準。gemini.oneStep: true で旧来の1発版）:
//     ① 新しいチャットに写真1枚だけ → 黒インクの線画にさせる（形の正確さはここで決まる。写真のまま返されることも、
//        見本を下地にされることも無い）。線画を点検し、ダメなら新しいチャットでやり直す。
//     ② 同じチャットで画風見本（デニムの網目の横長切り抜き）を添付 → 線画に水彩で色を塗らせる。
//        色の指定（藍・からし色の糸・真鍮など）は最初の塗りの指示に全部書く（後から同じチャットで直させても
//        直前の絵に引っ張られてほぼ直らなかった）。塗りが気に入らない時は「直して」と頼まず、②の指示を送り直す。
//     ③ 取り込み後、必要なら tools/color_match.mjs で色の傾向だけ参考写真に寄せる（形は変えない）。
//     元写真を②で色見本として渡すのはNG（傷を創作・刻印が消えた）。写真に水彩フィルターをかける方式は実写のままでNG。
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

// ---- 細部：2段階モード（標準・506XX 02で確立） ----
// 色の既定値（Levi'sのデニム物）。項目ごとに gemini.colors（英語の配列）で上書きできる。
const DEFAULT_COLORS = [
  "Denim: blue indigo (not grey, not teal), deep in the shadows, with lighter faded areas and worn edges where the photo shows them",
  "Stitching thread: the same color as in the photo (on vintage Levi's usually golden ochre / mustard yellow) — never pure white",
  "Metal (buttons, rivets, buckles): aged brass or copper, warm and slightly darkened",
  "Red tab (if any): deep red",
];
function lineArtPrompt(g) {
  return `Make a black ink LINE DRAWING of this photo on plain white paper: pen outlines of every edge, seam and stitch line, and fine diagonal hatching lines for the denim weave. No color, no shading from the photo — only black ink lines. Same framing, angle and aspect ratio as the photo. Nothing added, nothing removed.

Must be clearly drawn: ${g.key}${g.text ? `\nLettering: copy it exactly as it appears in the photo (${g.text}).` : ""}
${(g.notes || []).length ? "\n" + g.notes.map((x) => `- ${x}`).join("\n") + "\n" : ""}
No added text, no watermark.`;
}
function paintPrompt(g) {
  const colors = g.colors || DEFAULT_COLORS;
  return `Now paint the LINE DRAWING with rich watercolor on warm ivory paper. The attached image is only a technique sample — do not draw it, just match its look: dense fine ink hatching over the denim, layered watercolor washes, visible brush strokes and soft blooms.

Colors (as in the photo I attached first — full strength, do not lighten or pastelize):
${colors.map((c) => `- ${c}`).join("\n")}

Texture — it must look like REAL, WELL-WORN VINTAGE denim, not new and not a clean engraving:
- mottled, streaky vertical fading with many small lighter worn patches, uneven pigment, darker indigo pooling in the recesses
- the flap edges, seams and pocket edges rubbed lighter and slightly fuzzy, the stitching a little sunken into the fabric
- the hatching irregular in density, broken up by the watercolor — not even, mechanical lines

- Keep every ink line exactly as drawn. Add nothing — no holes, rips, stains or spots that are not in the photo.${g.text ? `\n- Keep the lettering ${g.text} readable.` : ""}
- Paint the denim all the way to every edge and corner of the picture — no white or ivory paper showing anywhere.
- It must look hand-painted, not like a photo.`;
}

// ---- 細部：557方式（今の標準。506XX 04で復活・確認） ----
// 「この写真を水彩にして」と頼むと、写真のまま返る／見本と合成される／見本を描き直される失敗が続いた。
// 557XXで成功していた「写真は参考にするだけ。描く物を言葉で名指しして、新しく描き起こさせる」頼み方に戻したら1回で通った。
// 見本は物の形が服に移らないVANSの靴の絵（geminiStyle.sketch）。2枚目に「技法だけ」と明記する。
function sketchPrompt(g) {
  return `Using the FIRST attached photo only as a reference, create an original hand-drawn ${/, close-up$/.test(g.item) ? "close-up " : ""}illustration of ${g.item.replace(/, close-up$/, "")}. Redraw it — do not trace the photo. The SECOND image (a pair of sneakers) is a drawing-style sample only — copy its technique, not its subject.

STYLE: fine graphite pencil linework with soft, layered watercolor washes on warm ivory textured paper, visible sketch lines and slightly loose hand-drawn edges. Muted natural colors: deep indigo denim with faded highlights along the seams and edges, tan/ecru thread stitching, aged copper or brass metal. Editorial field-notebook feel — not photorealistic, not cartoonish.

The detail must stay clearly readable: ${g.key}.${g.text ? `\nKeep the lettering exactly: ${g.text}` : ""}
${(g.notes || []).length ? g.notes.map((x) => `- ${x}`).join("\n") + "\n" : ""}4:3 canvas, the detail fills the frame. No extra text, no watermark.`;
}

// ---- 細部：写真に忠実モード（1発版。gemini.oneStep: true の時だけ） ----
// 4:3など写真と違う比率を指定すると、足りない部分を描き足してボタン等が増えた。
// 画風の説明に「金属」等の物の名前を入れると、それも描き足されやすかった。→ 比率は写真のまま・画風は最小限の言葉で。
function faithfulPrompt(g, hasStyle) {
  // 506XXの01で「水彩フィルター」と書いたら、写真をシャープにしただけの実写風が返ってきた
  // → 「手描きの絵だと一目で分かること」を構図の指示とは別に、はっきり要求する
  const attachLine = hasStyle
    ? "Two images are attached. The FIRST image is the PHOTO: take everything you draw from it. The SECOND image is a small STYLE SAMPLE showing only how to draw denim: copy ONLY its technique — dense fine dark ink hatching lines over the weave, layered indigo watercolor washes, ivory paper showing through. It is not part of the picture."
    : "Only ONE image is attached: the photo.";
  return `Turn the attached photo into a HAND-PAINTED WATERCOLOR ILLUSTRATION. ${attachLine} Keep the photo's composition exactly, but the result must be an obvious painting, not a photo.

Output the SAME composition as the photo, repainted by hand in watercolor:
- the same crop, framing, angle and aspect ratio as the photo — do NOT extend, zoom out or re-frame
- every object, seam, stitch line, edge, fold and wrinkle exactly where it is in the photo, in the same number
- add NOTHING that is not in the photo (no buttons, rivets, stitches, tabs, labels, tools, hands, text) and remove nothing
- if anything is unclear, copy the photo as it is — never invent

Medium: fine ink linework with rich, layered watercolor on warm ivory paper; the fabric weave drawn with dense, fine diagonal ink hatching lines${hasStyle ? " exactly like the STYLE SAMPLE" : ""}.
It MUST read at first glance as a hand-made illustration: a thin dark ink outline around every part, visible brush strokes, soft watercolor blooms and edges, the paper texture showing through, slightly simplified surfaces. NOT a photograph, NOT a photo filter, NOT a sharpened or enhanced photo, NOT 3D-rendered.
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
md += `### 細部（01〜）は557方式（1回で描き起こし）\n`;
md += `1. **番号ごとにGeminiの新しいチャット**を開き、①NN_ref.jpg（写真）→ ②STYLE_sketch.jpg（靴の絵）の**順番で**添付して、プロンプトを貼る。\n`;
md += `2. 形が写真と多少ずれてもOK。**確認ポイントが合っていれば合格**。合わなければ同じチャットで直させず、新しいチャットでもう一度。\n`;
md += `3. できた画像は、番号を添えてClaudeのチャットに貼る（例:「05」と書いて画像を貼る）。\n\n`;
md += `### 表紙（00）と1発版（oneStep）だけ\n`;
md += `写真っぽいまま（イラストになっていない）時だけ、同じチャットで次を送る:\n\n\`\`\`\nThis still looks like a photo. Repaint it completely by hand: ink outlines on every edge, the whole denim covered with dense ink hatching like the second image, watercolor washes on ivory paper. Same composition, nothing added.\n\`\`\`\n\n`;

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
  } else if (isFaithful(g) && !g.oneStep && !g.twoStep) {
    attach = [copyIn(slot.ref, `${slot.no}_ref`), copyIn(style.sketch || style.cover, "STYLE_sketch")];
    prompt = sketchPrompt(g);
  } else if (isFaithful(g) && g.twoStep) {
    const ref = copyIn(slot.ref, `${slot.no}_ref`);
    const st = style.detail ? copyIn(style.detail, "STYLE_detail") : null;
    md += `---\n\n## ${slot.no}｜${slot.eraLabel}｜${slot.caption}\n\n`;
    md += `- 保存先: assets/${slot.photo || "（data に photo 未設定）"}\n`;
    md += `- 確認ポイント: ${g.check || g.key}\n\n`;
    md += `**① 線画**（新しいチャット・添付: ${ref}）\n\n` + "```\n" + lineArtPrompt(g) + "\n```\n\n";
    md += `**② 塗り**（同じチャット・添付: ${st || "（なし）"}）\n\n` + "```\n" + paintPrompt(g) + "\n```\n\n";
    continue;
  } else if (isFaithful(g)) {
    // 506XXで写真1枚だけだと実写のまま返ってきた → 写真を1枚目、成功した絵（_brand の geminiStyle.detail）を2枚目に「技法だけ」の見本として付ける
    const st = style.detail && g.noStyle !== true ? copyIn(style.detail, "STYLE_detail") : null;
    attach = [copyIn(slot.ref, `${slot.no}_ref`), st];
    prompt = faithfulPrompt(g, !!st);
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
