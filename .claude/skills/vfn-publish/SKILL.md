---
name: vfn-publish
description: Final stage of a VINTAGE FIELD NOTES content_studio carousel — once all Gemini illustrations are in. Renders the public version, runs the vfn-qa subagent, shows the pages, commits, saves the images to the Mac Photos app in post order, and writes the Instagram caption and hashtags. Use when the user says things like 「最終版」「最終チェック」「コミット」「写真に保存」「投稿したい」「ハッシュタグ」.
---

# VINTAGE FIELD NOTES：仕上げ・投稿準備スキル

作業は `content_studio/` で行う。git は `/Applications/GitHub Desktop.app/Contents/Resources/app/git/bin/git`。
**push はこちらからはできない**（認証が無い）。本人が GitHub Desktop で行う。

## 1. 最終レンダリング
```bash
node tools/ingest.mjs <topic> --status        # 全スロット「済」か確認（未があれば先に vfn-assets）
node render_era_slides.mjs <topic>            # 公開版（Geminiイラストのみ）
```
「未配置の画像」の警告が出たら、投稿には使えない（SVGの仮イラストが混ざっている）。

## 2. 最終チェック（サブエージェント）
- `vfn-qa` サブエージェントに、topic名・outputPrefix・ページ数を渡してチェックさせる。
- 指摘を自分でも画像を見て確かめ、直すべきものは直して再レンダリング。
- ファクトチェックを下書き段階でやっていない、または本文を大きく変えた場合は `vfn-fact-checker` も回す。
- 全ページを SendUserFile で本人に見せる（CLAUDE.md のルール。見せずに「直しました」はNG）。

## 3. コミット（本人のOK後）
- ステージするのは公開してよいものだけ: `data/<topic>.mjs`、`assets/<topic_dir>/`、`assets/covers/<hero>`、
  `output/<prefix>_*.png`、変更したツール類。
  **`_private_ref/`・`*_private.mjs`・`output/*_private_*`・`.DS_Store`・`*.bak` は入れない**
  （.gitignore 済みだが、`git add -A` は使わずファイルを指定する）。
- メッセージは英語、末尾に指定の Co-Authored-By 行。
- 終わったら「GitHub Desktop で Push origin を押してください」と伝える。

## 4. 写真アプリに保存
```bash
node tools/export_photos.mjs <topic>
```
- アルバム「VFN <series>」に投稿順で入る。iCloud写真がオンならスマホにも同期される。
- 初回は「写真」アプリの操作許可ダイアログが出ることがある（本人に許可してもらう）。

## 5. キャプションとハッシュタグ
本人の方針: 日本語中心でよいが、ブランドのトーンは「英語でクール」。煽り・誇張はしない。
- キャプション（コピペ用・コードブロックで出す）:
  1行目フック（英語の短いフレーズ＋日本語）／何が分かる投稿か2〜3行／
  「保存して古着屋でチェックを」／判別は個体差がある旨のひとこと（年代判別は断定しすぎない）
- ハッシュタグは **5〜10個**。内訳の目安:
  ①内容そのもの（品番・通称・判別ポイント名）2〜4個 ②古着好き向け（#古着 #ヴィンテージ○○ 等）2〜3個
  ③英語圏向け 1〜2個 ④固定: `#vintagefieldnotes` `#古着年代判別`
- 最後に「スマホでの投稿手順」を短く添える（アルバムから順番どおりに6枚選ぶ → キャプションを貼る）。
