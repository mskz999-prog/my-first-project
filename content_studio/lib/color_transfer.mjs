// 色合わせ（Reinhard法）: 画像の「色の傾向」（明るさ・青み・コントラスト）を、別の画像に合わせる。
// 形は一切変えず色だけ動かすので、参考写真の中身を写すことにはならない。
//
// 使いみち（506XXで導入）:
//   1. スロットごとの色見本 … 画風見本（デニムの網目の切り抜き）を、その番号の参考写真の色に染め直して
//      Geminiに渡す。言葉だけで「写真の色に」と頼むと色がずれた／元写真を渡すと写真を描き直された対策。
//   2. 仕上げの色補正 … Geminiの絵の色味を参考写真に少し寄せる（tools/color_match.mjs）。
//
// 白っぽい紙の部分（明るさ75以上）は色合わせの計算から外し、補正もかけない（紙が青く染まらないように）。

import sharp from "sharp";

const s2l = (c) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const l2s = (c) => 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
const fi = (t) => (t ** 3 > 0.008856 ? t ** 3 : (t - 16 / 116) / 7.787);

function toLab(r, g, b) {
  r = s2l(r); g = s2l(g); b = s2l(b);
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047;
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}
function toRgb(L, a, b) {
  const fy = (L + 16) / 116, fx = fy + a / 500, fz = fy - b / 200;
  const x = fi(fx) * 0.95047, y = fi(fy), z = fi(fz) * 1.08883;
  return [3.2406 * x - 1.5372 * y - 0.4986 * z, -0.9689 * x + 1.8758 * y + 0.0415 * z, 0.0557 * x - 0.204 * y + 1.057 * z]
    .map((v) => Math.max(0, Math.min(255, l2s(Math.max(0, v)))));
}

const PAPER_L = 75;

async function raw(p) {
  const { data, info } = await sharp(p).removeAlpha().toColorspace("srgb").raw().toBuffer({ resolveWithObject: true });
  return { data, info };
}
function stats(d) {
  const m = [0, 0, 0], q = [0, 0, 0];
  let n = 0;
  for (let i = 0; i < d.length; i += 3) {
    const lab = toLab(d[i], d[i + 1], d[i + 2]);
    if (lab[0] >= PAPER_L) continue;
    for (let k = 0; k < 3; k++) { m[k] += lab[k]; q[k] += lab[k] ** 2; }
    n++;
  }
  return m.map((v, k) => [v / n, Math.sqrt(Math.max(1e-6, q[k] / n - (v / n) ** 2))]);
}

/** srcPath の色傾向を refPath に合わせた JPEG を outPath に書く。amount 0〜1（1=完全に合わせる） */
export async function colorTransfer(srcPath, refPath, outPath, amount = 1) {
  const S = await raw(srcPath), R = await raw(refPath);
  const ss = stats(S.data), rs = stats(R.data);
  const o = Buffer.alloc(S.data.length);
  for (let i = 0; i < S.data.length; i += 3) {
    const lab = toLab(S.data[i], S.data[i + 1], S.data[i + 2]);
    const w = lab[0] < PAPER_L ? 1 : Math.max(0, 1 - (lab[0] - PAPER_L) / 15); // 紙に近いほど補正を弱める
    const rgb = toRgb(...lab.map((v, k) => v + ((v - ss[k][0]) * (rs[k][1] / ss[k][1]) + rs[k][0] - v) * w * amount));
    o[i] = rgb[0]; o[i + 1] = rgb[1]; o[i + 2] = rgb[2];
  }
  await sharp(o, { raw: S.info }).jpeg({ quality: 92 }).toFile(outPath);
}
