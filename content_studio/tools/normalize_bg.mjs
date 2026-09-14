// Gemini生成イラスト等の「白っぽい背景」を、カード台紙のグレーに塗り替える恒久ツール。
// 外周から繋がっている白背景だけをグレーに塗り替えるので、パッチ内の白文字やロゴなど
// 外周と繋がっていない孤立した白は保護される（VANS AUTHENTIC/ERA制作時に確立した手法）。
//
// 使い方:
//   node content_studio/tools/normalize_bg.mjs <画像 or フォルダ> [<画像 or フォルダ> ...] [--color=#RRGGBB] [--dry-run]
//
// 例:
//   node content_studio/tools/normalize_bg.mjs assets/heel_patches assets/insoles
//   node content_studio/tools/normalize_bg.mjs assets/covers/new_hero.jpg --color=#fffdf6
//
// 仕組み:
//   1. sharp .trim() でまず外周の単色マージンを削る
//   2. 「白判定のしきい値を段階的に緩めながら」外周からflood fillを複数回繰り返す
//      （まだら模様・テクスチャ入りの背景でも、1回では繋がりが途切れて塗り残しが出るため）
//   3. 既に塗った色（target）はどのパスでも「通過可能」として扱うので、パスを重ねるごとに
//      奥のポケット状の白領域まで橋渡しして届くようになる
//
// 黒枠など「白ではない縁取り」が画像自体に焼き込まれているケース（AI生成物でまれに発生）は
// このツールだけでは塗り切れないことがある。その場合はfilled率が低いまま止まるので、
// 手動でtrim量やcropを調整するか、該当ファイルだけ個別に対応すること。

import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const DEFAULT_TARGET_HEX = "#b3afa4"; // media-art の台紙グレーと同じ値
const PASSES = [
  { threshold: 225, tolerance: 15 },
  { threshold: 205, tolerance: 30 },
  { threshold: 180, tolerance: 45 },
  { threshold: 160, tolerance: 70 },
];

function hexToRgb(hex) {
  const m = hex.replace("#", "");
  return [parseInt(m.slice(0, 2), 16), parseInt(m.slice(2, 4), 16), parseInt(m.slice(4, 6), 16)];
}

function isPassable(r, g, b, target, threshold, tolerance) {
  if (r === target[0] && g === target[1] && b === target[2]) return true;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return min >= threshold && max - min <= tolerance;
}

function floodFillPass(data, width, height, channels, target, threshold, tolerance) {
  const visited = new Uint8Array(width * height);
  const stack = [];
  const idx = (x, y) => y * width + x;

  const trySeed = (x, y) => {
    const i = idx(x, y);
    if (visited[i]) return;
    const o = i * channels;
    if (isPassable(data[o], data[o + 1], data[o + 2], target, threshold, tolerance)) {
      visited[i] = 1;
      stack.push(i);
    }
  };
  for (let x = 0; x < width; x++) {
    trySeed(x, 0);
    trySeed(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    trySeed(0, y);
    trySeed(width - 1, y);
  }

  let filled = 0;
  while (stack.length) {
    const i = stack.pop();
    const x = i % width;
    const y = (i / width) | 0;
    const o = i * channels;
    const alreadyTarget = data[o] === target[0] && data[o + 1] === target[1] && data[o + 2] === target[2];
    data[o] = target[0];
    data[o + 1] = target[1];
    data[o + 2] = target[2];
    if (!alreadyTarget) filled++;
    for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const ni = idx(nx, ny);
      if (visited[ni]) continue;
      const no = ni * channels;
      if (isPassable(data[no], data[no + 1], data[no + 2], target, threshold, tolerance)) {
        visited[ni] = 1;
        stack.push(ni);
      }
    }
  }
  return filled;
}

async function processFile(file, target, dryRun) {
  const trimmed = await sharp(file).trim({ threshold: 12 }).toBuffer();
  const { data, info } = await sharp(trimmed).raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  let totalFilled = 0;
  for (const { threshold, tolerance } of PASSES) {
    totalFilled += floodFillPass(data, width, height, channels, target, threshold, tolerance);
  }

  const pct = ((totalFilled / (width * height)) * 100).toFixed(1);
  if (!dryRun) {
    const outBuf = await sharp(data, { raw: { width, height, channels } }).jpeg({ quality: 92 }).toBuffer();
    const tmp = file + ".tmp";
    fs.writeFileSync(tmp, outBuf);
    fs.renameSync(tmp, file);
  }
  return pct;
}

function collectImageFiles(target) {
  const stat = fs.statSync(target);
  if (stat.isDirectory()) {
    return fs
      .readdirSync(target)
      .filter((f) => /\.(jpe?g|png)$/i.test(f))
      .map((f) => path.join(target, f));
  }
  return [target];
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const colorArg = args.find((a) => a.startsWith("--color="));
  const targetHex = colorArg ? colorArg.split("=")[1] : DEFAULT_TARGET_HEX;
  const target = hexToRgb(targetHex);
  const paths = args.filter((a) => !a.startsWith("--"));

  if (paths.length === 0) {
    console.error("使い方: node tools/normalize_bg.mjs <画像 or フォルダ> [...] [--color=#RRGGBB] [--dry-run]");
    process.exit(1);
  }

  const files = paths.flatMap(collectImageFiles);
  console.log(`対象: ${files.length}枚 / 塗り替え色: ${targetHex}${dryRun ? " (dry-run: ファイルは変更しません)" : ""}`);

  for (const file of files) {
    const pct = await processFile(file, target, dryRun);
    console.log(`  ${file}: ${pct}% 塗り替え`);
  }
}

main();
