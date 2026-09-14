---
name: vfn-plan
description: Draft a new VINTAGE FIELD NOTES content_studio topic (a brand/model/item deep-dive carousel like the VANS AUTHENTIC/ERA era guide). Use when the user wants to start a new content_studio carousel — gives them a brand/item name plus reference material (photos, a hand-drawn chart, notes, links) and wants a structured draft before any asset work begins. Produces a new data/<topic>.mjs file matching the established schema and a plain-language media checklist, but does NOT touch assets, render, or commit anything.
tools: Read, Write, Edit, Glob, Grep, WebSearch
---

# VINTAGE FIELD NOTES: 企画立案スキル

`content_studio/` のカルーセル制作パイプラインのうち、**「素材共有 → 企画立案(テキスト) → レイアウトFIX」の最初の2段階**を担当するスキル。VANS AUTHENTIC/ERA制作で確立したフォーマットを土台に、次のトピックの`data/<topic>.mjs`をドラフトする。

**このスキルの範囲外**（後続ステップとして別途進める）:
- 実際の写真・イラスト素材の配置や加工（`tools/normalize_bg.mjs`を使う）
- `render_era_slides.mjs`の実行・レンダリング
- git add / commit / push

## 前提知識

- レンダリングエンジンは `content_studio/render_era_slides.mjs`。`node render_era_slides.mjs <topic>` で `data/<topic>.mjs` を読み込む（省略時は `vans_authentic_eras`）。
- 既存の完成例は `content_studio/data/vans_authentic_eras.mjs`。迷ったら必ずこれを一次参照にする。
- 画像は `content_studio/assets/<category>/` に配置し、`data`側の`media[].photo`で相対パス参照する。背景の白浮きは`node tools/normalize_bg.mjs <folder>`で一括グレー化できる（詳しくは同ファイルのコメント参照）。
- ブランドの文体・運用ルールはリポジトリ直下の `CLAUDE.md` に従う（日本語でやり取り、専門用語は一言補足、画像は都度見せてから確定、伝承・逸話レベルの情報は「〜とされる」等でヘッジする等）。

## データスキーマ

`data/<topic>.mjs` は次の3つをexportする。

```js
// meta: ブランド名・表紙まわりのテキスト（render_era_slides.mjsが直接参照する）
export const meta = {
  brand: "VINTAGE FIELD NOTES",       // 通常は固定。シリーズ全体のブランド名
  series: "対象ブランド/モデル名",      // 例: "VANS AUTHENTIC/ERA" — 表紙タイトル・topbar・flourishに使われる
  outputPrefix: "xxx_carousel",       // 出力ファイル名の接頭辞（他トピックと衝突しない名前にする）
  bg: "#F4F3EF",                      // 通常は固定
  heroImage: "covers/xxx_hero.jpg",   // 表紙イラストの相対パス（assets/以下）。この時点ではまだ無くてよい
  heroAlt: "...",
  badge: "MODEL & ERA GUIDE",         // 表紙の黒バッジ。対象に合わせて変えてよい（例: "ITEM GUIDE" "BRAND GUIDE"）
  subtitle: "年代別ディテール変遷のハイライト", // 対象に合わせて書き換える
  overviewHeading: "概要：...",
  overviewBullets: ["...", "...", "..."], // 「」で囲った用語は自動で太字になる
};

// eras: 年代（またはモデル・アイテムのバリエーション）ごとのセクション。名前は"era"だが
// 年代に限らず「バリエーション単位の比較カード」として汎用的に使える。
export const eras = [
  {
    range: "短いバッジ表記（年代 or 型番 etc.）",
    name: "見出し（Bebas Neueで表示される）",
    bullets: [
      "「」で用語を囲むと自動で太字強調される説明文。2〜3個が目安。",
    ],
    media: [
      // 1エントリ = 1枚の写真ボックス。基本4項目（ヒールパッチ/インソール等に相当する
      // "見分けポイントになるディテール4点"）だが、対象に応じて増減してよい。
      { type: "heelPatch", caption: "キャプション", props: { label: "..." }, photo: "category/file.jpg" },
    ],
  },
];

// summary: 最終ページ（早見表 + CTA）用
export const summary = {
  heading: "ディテール早見ガイド", // 通常はこのままでよい
  closing: "（今回は本文には未使用。将来の拡張用に残置）",
};
```

**`media[].type` について**: `type`は`lib/illustrations.mjs`のSVGイラスト関数名（`heelPatch`/`sideTag`/`sole`/`insole`/`shoeSole`/`storefront`/`skateboard`）のいずれかを指定する。`photo`があれば実写/イラスト画像が優先され、無ければ`type`に対応するSVGイラストがプレースホルダーとして自動描画される。**対象がスニーカー以外（フライトジャケットのジップ、スタジャンのワッペン等）の場合、既存のイラスト関数はそのままでは意味が合わない。** その場合は以下のいずれかを提案する：
1. 汎用的な`type`（例: 布地パーツ全般を表す新しいSVG関数）を`lib/illustrations.mjs`に追加する（このスキルの範囲外、別途相談）
2. 写真を必ず用意する前提にして`type`はダミー値のまま割り切る（写真が揃うまでの一時的な見た目はあまり気にしない）

## ワークフロー

### 1. ヒアリング（人間から素材を受け取る）

ユーザーから次を受け取る／確認する：
- 対象ブランド/モデル/アイテム名
- 参考資料（手描きチャート、URL、過去に集めたテキスト等）
- 何個の比較軸（年代・型番・バリエーション等）で構成するか、目安の数
- 表紙イラストの有無（無ければ後工程でGemini生成を依頼する前提でよい）

情報が明らかに不足している場合（対象名だけで参考資料が無い等）は、ここで一度確認を挟む。全部揃っていなくても、"仮でここまで書くので、あとで直してほしい"という進め方でよい。

### 2. リサーチ・ファクトチェック

- WebSearchで複数ソース（公式サイト・複数の専門ブログ）を横断して事実を確認する。VANS AUTHENTIC/ERA制作時の基準を踏襲する：
  - 一次情報で裏取りできるものは断定表現でよい
  - 複数の専門ブログが**矛盾しない内容**を紹介していれば採用してよい（古着の年代判別はそこまで厳密に検証できないことも多いため）
  - 伝承・逸話レベルの情報は「〜と伝えられている」「〜とされる」等のヘッジ表現を使う
  - 公式情報と自分の下書きが食い違う場合は、必ず先に本人へ報告してから直す（黙って直さない）

### 3. ドラフト作成

- 上記スキーマに沿って `data/<topic>.mjs` を新規作成する（既存の `vans_authentic_eras.mjs` を壊さないこと）。
- 合わせて、**テキストでの構成案サマリ**を会話内に出す（「表紙にはこの3点、ページ2は◯◯期でこの4枚の写真が必要、…」の形）。これが③のレイアウトFIXの土台になる。
- 各`media`エントリについて、**まだ存在しない**`photo`パスをリストアップし、「この写真/イラストをGeminiで生成してassets/xxx/に置いてください」という買い物リストを最後に添える。

### 4. 確認して引き渡す

- ドラフトの内容（テキスト構成・事実確認結果・必要な素材リスト）を本人に見せて、OKが出たら次工程（素材配置・レンダリング）に進む。
- レイアウト自体（CSS）に変更が要らない場合はその旨を伝える。既存フォーマットと違う見せ方が必要そうな場合は、先にその点だけ相談する。
