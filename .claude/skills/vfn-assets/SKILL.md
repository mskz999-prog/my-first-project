---
name: vfn-assets
description: Image stage of a VINTAGE FIELD NOTES content_studio carousel — after the vfn-plan draft is approved. Collects original (non-reissue) reference photos from Mercari/Yahoo Auctions/blogs into a private folder, crops and checks them, builds a private preview with credits, generates ready-to-paste Gemini prompts, and ingests the Gemini illustrations the user pastes into chat (by slot number) into assets/. Use when the user says things like 「画像集めて」「参考写真」「geminiのプロンプト」, or pastes Gemini images with a number.
---

# VINTAGE FIELD NOTES：画像工程スキル

`vfn-plan` で作った `data/<topic>.mjs` に対して、**参考写真の収集 → 下ごしらえ・点検 → 非公開プレビュー → Geminiプロンプト → イラスト取り込み**
までを担当する。最終レンダリング後のチェック・コミット・写真アプリ保存は `vfn-publish` の担当。

作業はすべて `content_studio/` で行う。git は `/Applications/GitHub Desktop.app/Contents/Resources/app/git/bin/git`
を使う（Xcode CLT が無いため `/usr/bin/git` は動かない。**python3 も無い**。スクリプトは node で書く）。

## 大原則
- **他人の写真は公開しない。** 参考写真は `assets/_private_ref/<topic>/`（gitignore済み）にだけ置き、
  プレビューは非公開版データ `data/<topic>_private.mjs` でだけ使う。公開版はGeminiイラストのみ。
- **オリジナルだけを拾う（本人の強い要望）。** 次は除外する:
  LVC（Levi's Vintage Clothing）、日本製・香港製・メキシコ製などの復刻、「復刻」「レプリカ」「リプロ」表記、
  品番が復刻系（例: 70557 / 71557 / 70507 / 71507）、バレンシア工場製（555刻印＝90年代復刻）、
  タグに洗濯表示・RN番号・バーコードがあるもの。出品文の「オリジナル」「年代」「刻印」の記載を必ず読む。
- 見せる前に自分で画像を見る（Read）。判別ポイント（文字・刻印・生地）が実際に写っているか確認する。
- **Gemini画像は「557方式」が標準**（506XX 04で復活）。写真を1枚目・VANSの靴の絵を2枚目（技法だけの見本）に添付し、
  「写真は参考だけ。〇〇（描く物を英語で名指し）を新しく描き起こして」と頼む。「この写真を水彩にして」型は写真のまま返る・
  見本と合成されるので使わない。形が多少ずれても確認ポイントが合っていれば合格。
  同じチャットで「直して」と頼んでもほぼ直らない（直前の絵に引っ張られる）→ 新しいチャットでやり直す。
  旧来の2段階（線画→塗り）は gemini.twoStep: true で出せる。色が浅い時は `tools/color_match.mjs <topic> <番号>`。詳細は tools/gemini_prompts.mjs 冒頭。
- 実物写真の作り（パーツの位置・ステッチの形）が下書きと違ったら、本人に伝えて下書きを直す（写真の事実を優先）。

## 1. 参考写真を集める
```bash
node tools/fetch_refs.mjs search mercari "507XX 紙パッチ"      # 出品URL一覧
node tools/fetch_refs.mjs search yahoo "507XX 紙パッチ"
node tools/fetch_refs.mjs get <topic> <url> <url> --kw=パッチ,刻印,507 [--max=40]   # 画像と抜粋を raw/ に保存
node tools/fetch_refs.mjs sheet <topic> [<ID前方一致>]            # raw/_sheet_<ID>.png で一覧
```
- 年代（era）ごとに独立しているので、**探す量が多い時は年代ごとにサブエージェント（general-purpose）へ
  並行で任せてよい**。その場合も渡すのは「探す条件・除外条件・保存先」まで。採用判断はメインで画像を見て行う。
- ブログ記事（hands-on-jeans.com 等）は `get` にURLを渡せば大きめの画像だけ保存する。1ページ20枚を超える記事は `--max=60`。
- **写真選びの基準**（507XXで崩れた原因の裏返し）:
  ①ピントが合っている（ぼやけた写真は文字が崩れる） ②見どころを正面から写している（斜めだと形を取り違える）
  ③見どころだけが写っている（ボタン・別パーツ・手・道具が入るとそのまま描かれる。ただし「ピンセットでタブを
  めくる」のように意図して入れる物はOK） ④対象のパーツそのもの（例: ウエストバンドの判別にアジャスターの写真を使わない）
- 表紙用は「**平置き・正面・袖が胴に沿っている**」オリジナルを2〜3着ぶん（`meta.heroRefs`）。

## 2. 下ごしらえと点検（必須）
```bash
node tools/prep_ref.mjs crop <topic> <raw内のファイル名> <保存名> --rect=x,y,w,h [--rotate=-20]
node tools/prep_ref.mjs check <topic>        # 比率・サイズ・ファイル有無の警告と _refs_sheet.png（番号入り一覧）
node tools/check_topic.mjs <topic>           # データが壊れていないか（項目数・gemini/ref の有無）
```
- `crop` は見どころに寄せて、写真枠と同じ横長比率（1.57）で切り抜く。斜めの写真は `--rotate` で水平にしてから。
  比率がずれた参考写真で描かせると、ページの枠で上下が切れて要点が見えなくなる（507XXの16）。
- `check` の一覧画像を **Read で目で見て**、上の①〜④を確認してからプロンプトに進む。
- 採用した写真は data の各 media に `ref: "_private_ref/<topic>/<保存名>.jpg"` として書く。

## 3. 非公開プレビュー
- `data/<topic>_private.mjs` を `data/levis_507xx_eras_private.mjs` と同じ形で作る:
  ベースを import し、写真が未配置の項目だけ参考写真＋「写真: 出典短縮名」をキャプションに付ける。
  使い回し項目（同じ photo で ref 無し）は同じ photo の ref を借りる。`extras` も同様に。冒頭コメントに出典URLを全部書く。
- `node render_era_slides.mjs <topic>_private` → 画像を Read で確認してから SendUserFile で見せる。
- ここで本人に「写真の差し替え」「構成の直し」を聞く。

## 4. Geminiプロンプト
- data に次を書く:
  - 各 media に `photo`（最終的な保存先）と `gemini: { item, key, text?, notes?, check? }`（英語。check だけ日本語）。
    **key には「写真に見えている物」だけを書く**。形を言葉で説明しすぎない（507XXで「U字の形」と書いたら
    真ん中に四角いステッチを描き足された）。
  - 表紙は `meta.heroImage` / `meta.heroRefs` / `meta.heroGemini: { subject, details: [...], check }`。
    details には「別モデルではない」こと（例: Type IIであってType IIIではない）と違いを箇条書きにすると形が安定する。
- `node tools/gemini_prompts.mjs <topic>` → `assets/_private_ref/<topic>/gemini/PROMPTS.md` と添付用ファイル一式。
  - 細部: 写真＋靴の絵（STYLE_sketch.jpg）をこの順で添付・557方式の描き起こし・4:3。
  - 表紙: 画風見本（VANS表紙＝形が写らない靴の絵）＋実物写真を順番どおり添付。
- フォルダを Finder で開いてあげる（`open <folder>`）。本人には「**番号ごとに新しいチャット**で、添付を書いてある順番どおりに付けて貼る」と伝える。
- **同じ見た目になる項目は同じ画像を使い回してよい**（本人了承済みの方針）。後の方の photo に前の画像パスを書き、gemini は書かない。

## 5. 貼られたイラストの取り込み
- 本人は番号を添えてチャットに画像を貼る。チャットの画像は
  `/private/tmp/claude-501/<...>/images/NN.webp` のようなパスで届くので、それを使う:
  ```bash
  node tools/ingest.mjs <topic> 05=/private/tmp/.../images/16.webp 06=/private/tmp/.../images/17.webp
  node tools/ingest.mjs <topic> --inbox     # gemini_inbox/ に「05.png」のように置かれた場合
  node tools/ingest.mjs <topic> --status    # どれが済／未か
  ```
- 取り込んだら**必ず画像を見て**、PROMPTS.md の確認ポイント（文字・刻印・構造）と照合する。文字は拡大して読む。
  余計な物の描き足し・形の変化があれば、**原因が参考写真側（写り込み・斜め・ぼやけ）にないか先に疑う**。
  直すときは同じチャットより、参考写真を直して新しいチャットでやり直す方が早い。
- 取り込むたびに `node render_era_slides.mjs <topic>_private` で該当ページを作り直して見せる。
