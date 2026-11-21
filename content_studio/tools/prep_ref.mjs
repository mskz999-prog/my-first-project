// 参考写真の「下ごしらえ」と「点検」をする恒久ツール（Levi's 507XXの反省から作成）。
// 写真に忠実モードでは「参考写真の出来＝Gemini画像の出来」になるため、プロンプトを作る前に必ず通す。
//
// 使い方:
//   1) 切り抜き（見どころに寄せて、カルーセルの写真枠と同じ横長比率にする）
//      node tools/prep_ref.mjs crop <topic> <元画像> <保存名> [--rect=x,y,w,h] [--rotate=度] [--ratio=1.57]
//        <元画像> … raw/ のファイル名（例 m123_04.jpg）か、assets/ からの相対パス／絶対パス
//        --rect   … 見どころの範囲（元画像のピクセル座標）。比率が合わなければ中心を保って自動で広げる
//        --rotate … 斜めの写真を水平にする（反時計回りはマイナス。例 --rotate=-20）
//        → assets/_private_ref/<topic>/<保存名>.jpg と、確認用の縮小画像を表示パスに出す
//   2) 点検（データの ref / heroRefs を全部チェックして一覧画像を作る）
//      node tools/prep_ref.mjs check <topic>
//        → 小さすぎ・比率違い・ファイル無しを警告し（ピントは自動判定できないので目で見る）、
//          assets/_private_ref/<topic>/_refs_sheet.png（番号入り一覧）を作る。目でも必ず見ること:
//          ①ピントが合っている ②正面から写っている ③見どころが真ん中 ④関係ない物（ボタン・手・道具）が写っていない

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { loadTopic, slotsOf, ASSETS_DIR } from "../lib/topic.mjs";

const FRAME_RATIO = 1.57; // 年代ページの写真枠（横÷縦）。表紙は 1263/848 ≈ 1.49
const HERO_RATIO = 1263 / 848;

const [cmd, ...rest] = process.argv.slice(2);
const flags = Object.fromEntries(rest.filter((a) => a.startsWith("--")).map((a) => a.slice(2).split("=")));
const args = rest.filter((a) => !a.startsWith("--"));

function privDir(topic) {
  const d = path.join(ASSETS_DIR, "_private_ref", topic);
  fs.mkdirSync(d, { recursive: true });
  return d;
}

function resolveSrc(topic, src) {
  const cands = [src, path.join(privDir(topic), "raw", src), path.join(ASSETS_DIR, src)];
  const hit = cands.find((p) => fs.existsSync(p));
  if (!hit) throw new Error(`元画像が見つかりません: ${src}`);
  return hit;
}

// ※ピンぼけの自動判定は試したが、デニムの織り目がノイズとして拾われて当てにならなかった（ぼやけた写真の方が数値が高く出た）。
//   ピントは一覧画像を目で見て判断する。

async function crop(topic, src, name) {
  const file = resolveSrc(topic, src);
  let img = sharp(file);
  if (flags.rotate) img = sharp(await img.rotate(Number(flags.rotate), { background: "#f3efe6" }).toBuffer());
  const { width: W, height: H } = await img.metadata();
  const ratio = Number(flags.ratio) || FRAME_RATIO;
  let [x, y, w, h] = flags.rect ? flags.rect.split(",").map(Number) : [0, 0, W, H];
  // 比率合わせ: 範囲の中心を保ったまま、足りない方向を広げる（はみ出す時は縮める）
  const cx = x + w / 2, cy = y + h / 2;
  if (w / h < ratio) w = h * ratio; else h = w / ratio;
  if (w > W) { w = W; h = w / ratio; }
  if (h > H) { h = H; w = h * ratio; }
  x = Math.round(Math.min(Math.max(cx - w / 2, 0), W - w));
  y = Math.round(Math.min(Math.max(cy - h / 2, 0), H - h));
  w = Math.round(w); h = Math.round(h);
  const out = path.join(privDir(topic), `${name.replace(/\.jpe?g$/, "")}.jpg`);
  await img.extract({ left: x, top: y, width: w, height: h }).jpeg({ quality: 92 }).toFile(out);
  console.log(`保存: ${out}（${w}x${h}、切り出し位置 ${x},${y}）`);
  if (w < 600) console.log("注意: 幅が600px未満。Geminiの絵が粗くなりやすい");
}

function label(text, w) {
  const esc = text.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  return Buffer.from(`<svg width="${w}" height="34"><rect width="100%" height="100%" fill="#111"/><text x="8" y="23" font-size="18" fill="#fff" font-family="sans-serif">${esc}</text></svg>`);
}

async function check(topic) {
  const mod = await loadTopic(topic);
  const items = [];
  const heroRefs = mod.meta.heroRefs || [mod.meta.heroRef].filter(Boolean);
  heroRefs.forEach((r, i) => items.push({ no: `00-${i + 1}`, caption: "表紙", ref: r, ratio: null }));
  const seen = new Set();
  for (const s of slotsOf(mod)) {
    if (s.kind === "cover" || !s.ref || seen.has(s.photo)) continue; // 使い回しは1回だけ
    seen.add(s.photo);
    items.push({ no: s.no, caption: s.caption, ref: s.ref, ratio: FRAME_RATIO });
  }
  const W = 360, H = 230, cols = 4;
  const tiles = [];
  let warn = 0;
  for (const it of items) {
    const file = path.join(ASSETS_DIR, it.ref);
    if (!fs.existsSync(file)) { console.log(`✗ ${it.no} ${it.caption}: ファイルが無い（${it.ref}）`); warn++; continue; }
    const m = await sharp(file).metadata();
    const r = m.width / m.height;
    const notes = [];
    if (m.width < 600) notes.push(`小さい(${m.width}px)`);
    if (it.ratio && Math.abs(r - it.ratio) / it.ratio > 0.15)
      notes.push(`比率${r.toFixed(2)}（枠は${it.ratio}。上下か左右が切れる→cropで合わせる）`);
    if (notes.length) warn++;
    console.log(`${notes.length ? "△" : "○"} ${it.no} ${it.caption}: ${m.width}x${m.height} ${notes.join(" / ")}`);
    const img = await sharp(file).resize(W, H, { fit: "contain", background: "#ffffff" }).toBuffer();
    tiles.push(
      await sharp({ create: { width: W, height: H + 34, channels: 3, background: "#fff" } })
        .composite([{ input: label(`${it.no} ${it.caption}${notes.length ? " △" : ""}`, W), top: 0, left: 0 }, { input: img, top: 34, left: 0 }])
        .png()
        .toBuffer()
    );
  }
  if (tiles.length) {
    const rows = Math.ceil(tiles.length / cols);
    const out = path.join(privDir(topic), "_refs_sheet.png");
    await sharp({ create: { width: W * cols, height: (H + 34) * rows, channels: 3, background: "#ddd" } })
      .composite(tiles.map((t, i) => ({ input: t, left: (i % cols) * W, top: Math.floor(i / cols) * (H + 34) })))
      .png()
      .toFile(out);
    console.log(`一覧画像: ${out}`);
  }
  console.log(warn ? `\n△/✗ が ${warn} 件。直してからプロンプトを作る（node tools/prep_ref.mjs crop ...）` : "\nすべて問題なし");
}

if (cmd === "crop" && args.length >= 3) await crop(args[0], args[1], args[2]);
else if (cmd === "check" && args[0]) await check(args[0]);
else console.log("使い方はファイル冒頭のコメント参照: crop <topic> <元画像> <保存名> [--rect=x,y,w,h] [--rotate=度] / check <topic>");
