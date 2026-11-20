---
name: vfn-assets
description: Image stage of a VINTAGE FIELD NOTES content_studio carousel — after the vfn-plan draft is approved. Collects original (non-reissue) reference photos from Mercari/Yahoo Auctions/blogs into a private folder, builds a private preview with credits, generates ready-to-paste Gemini prompts, and ingests the Gemini illustrations the user pastes into chat (by slot number) into assets/. Use when the user says things like 「画像集めて」「参考写真」「geminiのプロンプト」, or pastes Gemini images with a number.
---

# VINTAGE FIELD NOTES：画像工程スキル

`vfn-plan` で作った `data/<topic>.mjs` に対して、**参考写真の収集 → 非公開プレビュー → Geminiプロンプト → イラスト取り込み**
までを担当する。最終レンダリング後のチェック・コミット・写真アプリ保存は `vfn-publish` の担当。

作業はすべて `content_studio/` で行う。git は `/Applications/GitHub Desktop.app/Contents/Resources/app/git/bin/git`
を使う（Xcode CLT が無いため `/usr/bin/git` は動かない。python3 も無い）。

## 大原則
- **他人の写真は公開しない。** 参考写真は `assets/_private_ref/<topic>/`（gitignore済み）にだけ置き、
  プレビューは非公開版データ `data/<topic>_private.mjs` でだけ使う。公開版はGeminiイラストのみ。
- **オリジナルだけを拾う（本人の強い要望）。** 次は除外する:
  LVC（Levi's Vintage Clothing）、日本製・香港製・メキシコ製などの復刻、「復刻」「レプリカ」「リプロ」表記、
  品番が復刻系（例: 70557 / 71557 / 70507 / 71507）、バレンシア工場製（555刻印＝90年代復刻）、
  タグに洗濯表示・RN番号・バーコードがあるもの。出品文の「オリジナル」「年代」「刻印」の記載を必ず読む。
- 見せる前に自分で画像を見る（Read）。判別ポイント（文字・刻印・生地）が実際に写っているか確認する。

## 1. 参考写真を集める
```bash
node tools/fetch_refs.mjs search mercari "507XX 紙パッチ"      # 出品URL一覧
node tools/fetch_refs.mjs search yahoo "507XX 紙パッチ"
node tools/fetch_refs.mjs get <topic> <url> <url> --kw=パッチ,刻印,507   # 画像と抜粋を raw/ に保存
node tools/fetch_refs.mjs sheet <topic>                          # raw/_sheet.png で一覧
```
- 年代（era）ごとに独立しているので、**探す量が多い時は年代ごとにサブエージェント（general-purpose）へ
  並行で任せてよい**。その場合も渡すのは「探す条件・除外条件・保存先」まで。採用判断はメインで画像を見て行う。
- ブログ記事（hands-on-jeans.com、mylevis501.com 等）は `get` にURLを渡せば、大きめの画像だけ保存する。
- 採用した写真は `assets/_private_ref/<topic>/` 直下に分かりやすい名前でコピーする（例 `e1_patch.jpg`）。
  判別ポイントが小さい写真は sharp で切り抜いた `_crop.jpg` を作る（紙パッチは全体が見える元画像のままが好評）。
- 採用した写真は data の各 media に `ref: "_private_ref/<topic>/e1_patch.jpg"` として書いておく
  （Geminiプロンプトの添付ファイルに使われる）。

## 2. 非公開プレビュー
- `data/<topic>_private.mjs` を `data/levis_557_eras_private.mjs` と同じ形で作る:
  ベースを import し、写真が未配置の項目だけ参考写真＋「写真: 出典短縮名」をキャプションに付ける。
  冒頭コメントに出典URLを全部書く。`meta.outputPrefix` は `<prefix>_private`。
- `node render_era_slides.mjs <topic>_private` → 画像を Read で確認してから SendUserFile で見せる。
- ここで本人に「写真の差し替え」「構成の直し」を聞く。

## 3. Geminiプロンプト
- data に次を書く（未記入なら書き足す）:
  - 各 media に `photo: "<topic_dir>/e1_patch.jpg"`（**最終的な保存先**。ファイルがまだ無くても書いてよい。
    レンダラーは未配置なら警告を出してSVGで仮表示する）
  - 各 media に `gemini: { item, key, text?, notes?, check? }`（英語。check だけ日本語の確認ポイント）
  - 表紙は `meta.heroImage` / `meta.heroRef` / `meta.heroGemini: { subject, details: [...] }`
- `node tools/gemini_prompts.mjs <topic>` → `assets/_private_ref/<topic>/gemini/PROMPTS.md` と添付用ファイル一式。
  ボタン・ポケット・パッチ類には過去の失敗対策が自動で入る（ドーム型ボタン、鏡写し禁止、余計な文字禁止）。
- フォルダを Finder で開いてあげる（`open <folder>`）。本人には「新しいチャットで、番号ごとに添付＋貼り付け」と伝える。
- **同じ見た目になる項目（例: 2つの年代でフラップ裏が同じ）は、同じ画像を使い回してよい**（本人了承済みの方針）。
  その場合は後の方の photo に前の画像パスを書き、gemini は書かない。

## 4. 貼られたイラストの取り込み
- 本人は番号を添えてチャットに画像を貼る。チャットの画像は
  `/private/tmp/claude-501/<...>/images/NN.webp` のようなパスで届くので、それを使う:
  ```bash
  node tools/ingest.mjs <topic> 05=/private/tmp/.../images/16.webp 06=/private/tmp/.../images/17.webp
  node tools/ingest.mjs <topic> --inbox     # gemini_inbox/ に「05.png」のように置かれた場合
  node tools/ingest.mjs <topic> --status    # どれが済／未か
  ```
- 取り込んだら**必ず画像を見て**、PROMPTS.md の確認ポイント（文字・刻印・構造）と照合する。
  崩れていたら、その画像のどこが違うかを具体的に指摘し、同じチャットで貼れる修正プロンプトを渡す。
  2回直して駄目なら「新しいチャットで、うまくいった画像をSTYLE見本として添付」を勧める。
- 取り込むたびに `node render_era_slides.mjs <topic>_private` で該当ページを作り直して見せる。
