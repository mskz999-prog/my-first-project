// 参考写真（他人の撮影物＝非公開用・Gemini描き起こし用）を集める恒久ツール。
// メルカリ・ヤフオクは通常のfetchだと403になるため、Playwrightで実ブラウザを開いて取得する。
// 保存先は assets/_private_ref/<topic>/raw/（.gitignore済みでGitHubには上がらない）。
//
// 使い方:
//   1) 検索（出品URLの一覧を出す）
//      node tools/fetch_refs.mjs search mercari "557XX ギャラ入り"
//      node tools/fetch_refs.mjs search yahoo   "557XX ギャラ入り"
//   2) 取得（各URLのタイトル・本文の抜粋・画像を保存）
//      node tools/fetch_refs.mjs get <topic> <url> [<url> ...] [--kw=パッチ,ボタン,557]
//      → raw/<ID>_NN.jpg と、出典メモ raw/_sources.md（追記）を作る
//   3) 一覧画像（コンタクトシート）を作る
//      node tools/fetch_refs.mjs sheet <topic> [<ファイル名の前方一致>]
//      → raw/_sheet.png（ファイル名入りのサムネイル一覧。これを見て使う写真を選ぶ）
//
// 注意: アクセスは1件ずつ間隔をあけて行う（相手サイトへの負荷を抑えるため）。

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { chromium } from "playwright";
import { ASSETS_DIR } from "../lib/topic.mjs";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36";
const WAIT_MS = 3000; // ページ間の待ち時間

const [cmd, ...rest] = process.argv.slice(2);
const flags = Object.fromEntries(rest.filter((a) => a.startsWith("--")).map((a) => a.slice(2).split("=")));
const args = rest.filter((a) => !a.startsWith("--"));

async function newPage() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ userAgent: UA, locale: "ja-JP" });
  return { browser, page };
}

function rawDir(topic) {
  const d = path.join(ASSETS_DIR, "_private_ref", topic, "raw");
  fs.mkdirSync(d, { recursive: true });
  return d;
}

async function search(site, query) {
  const url =
    site === "yahoo"
      ? `https://auctions.yahoo.co.jp/search/search?p=${encodeURIComponent(query)}`
      : `https://jp.mercari.com/search?keyword=${encodeURIComponent(query)}`;
  const { browser, page } = await newPage();
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(6000);
  const items = await page.$$eval("a", (as) =>
    as
      .map((a) => ({
        href: a.href.split("?")[0],
        t: (a.innerText || a.querySelector("img")?.alt || "").replace(/\s+/g, " ").slice(0, 80),
      }))
      .filter((x) => /jp\.mercari\.com\/item\/m\d+|auction\/[a-z]?\d{6,}$/.test(x.href))
  );
  const seen = new Set();
  for (const i of items) {
    if (seen.has(i.href)) continue;
    seen.add(i.href);
    console.log(`${i.href} | ${i.t}`);
  }
  await browser.close();
}

async function get(topic, urls, kws) {
  const dir = rawDir(topic);
  const notes = [];
  const { browser, page } = await newPage();
  for (const u of urls) {
    const isMarket = /mercari\.com|auctions\.yahoo\.co\.jp/.test(u);
    const id =
      (u.match(/m\d{8,}|auction\/([a-z]?\d{6,})/) || [])[1] ||
      (u.match(/m\d{8,}/) || [])[0] ||
      new URL(u).hostname.replace(/^www\./, "").split(".")[0] + "_" + u.replace(/\D/g, "").slice(-6);
    try {
      await page.goto(u, { waitUntil: isMarket ? "domcontentloaded" : "load", timeout: 60000 });
      await page.waitForTimeout(isMarket ? 5000 : 1500);
      // 遅延読み込み対策でページ下までスクロール
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 800) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 120));
        }
      });
      const title = await page.title();
      // 本文は商品説明の部分を優先（ページ全体だと「関連商品」の文まで拾ってしまうため）
      const text = (
        await page.evaluate(() => {
          const el = document.querySelector('[data-testid="description"], #item-info, .ProductExplanation, #description, article, main');
          return (el || document.body).innerText;
        })
      )
        .replace(/\s+/g, " ")
        // 「関連商品」「おすすめ」以降は別の商品の話なので切り捨てる
        .split(/他の人はこちらも検索|この商品を見ている人|この出品者の他の商品|関連する商品|おすすめ/)[0];
      const srcs = await page.$$eval(
        "img",
        (els, market) =>
          [
            ...new Set(
              els
                .filter((e) =>
                  market
                    ? /mercdn\.net\/item\/detail\/orig\/photos|auctions\.c\.yimg\.jp\/images\.auctions\.yahoo\.co\.jp\/image/.test(
                        e.currentSrc || e.src
                      )
                    : e.naturalWidth >= 300 && e.naturalHeight >= 200
                )
                .map((e) => e.currentSrc || e.src)
            ),
          ],
        isMarket
      );
      let k = 0;
      for (const s of srcs.slice(0, Number(flags.max) || 20)) { // --max=40 で枚数上限を変更可
        const r = await page.request.get(s.includes("yimg.jp") ? s.split("?")[0] : s);
        if (!r.ok()) continue;
        const out = path.join(dir, `${id}_${String(k++).padStart(2, "0")}.jpg`);
        await sharp(await r.body()).jpeg({ quality: 92 }).toFile(out).catch(() => k--);
      }
      // 年代判別に効くキーワード周辺の文を抜き出す（復刻品チェック用に「復刻」「LVC」なども拾う）
      const words = [...kws, "復刻", "LVC", "日本製", "Made in", "年代", "オリジナル"];
      const re = new RegExp(`[^。]{0,40}(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})[^。]{0,60}`, "g");
      const hits = [...new Set(text.match(re) || [])].slice(0, 10);
      console.log(`### ${id} | ${title.slice(0, 70)} | 画像${k}枚`);
      hits.forEach((h) => console.log(`   - ${h.trim()}`));
      notes.push(`## ${id}\n- URL: ${u}\n- タイトル: ${title}\n- 画像: ${id}_00〜${String(k - 1).padStart(2, "0")}\n${hits.map((h) => `- 抜粋: ${h.trim()}`).join("\n")}\n`);
    } catch (e) {
      console.log(`### 失敗 ${u}: ${e.message}`);
    }
    await page.waitForTimeout(WAIT_MS);
  }
  await browser.close();
  fs.appendFileSync(path.join(dir, "_sources.md"), notes.join("\n"));
  console.log(`\n保存先: ${dir}（出典メモ: _sources.md）`);
}

async function sheet(topic, prefix = "") {
  const dir = rawDir(topic);
  const files = fs
    .readdirSync(dir)
    .filter((f) => /\.(jpe?g|png|webp)$/i.test(f) && !f.startsWith("_") && f.startsWith(prefix))
    .sort();
  if (!files.length) return console.log("画像がありません");
  const W = 360, H = 300, cols = 5;
  const tiles = await Promise.all(
    files.map(async (f) => {
      const img = await sharp(path.join(dir, f)).resize(W, H - 28, { fit: "contain", background: "#fff" }).toBuffer();
      const label = Buffer.from(
        `<svg width="${W}" height="28"><rect width="100%" height="100%" fill="#000"/><text x="6" y="20" font-size="17" fill="#fff" font-family="sans-serif">${f}</text></svg>`
      );
      return sharp({ create: { width: W, height: H, channels: 3, background: "#fff" } })
        .composite([{ input: label, top: 0, left: 0 }, { input: img, top: 28, left: 0 }])
        .png()
        .toBuffer();
    })
  );
  const out = path.join(dir, `_sheet${prefix ? "_" + prefix : ""}.png`);
  await sharp({ create: { width: W * cols, height: H * Math.ceil(tiles.length / cols), channels: 3, background: "#ccc" } })
    .composite(tiles.map((t, i) => ({ input: t, left: (i % cols) * W, top: Math.floor(i / cols) * H })))
    .png()
    .toFile(out);
  console.log(`一覧画像: ${out}（${files.length}枚）`);
}

if (cmd === "search") await search(args[0], args.slice(1).join(" "));
else if (cmd === "get") await get(args[0], args.slice(1), (flags.kw || "").split(",").filter(Boolean));
else if (cmd === "sheet") await sheet(args[0], args[1]);
else console.log("使い方はファイル冒頭のコメント参照: search / get / sheet");
