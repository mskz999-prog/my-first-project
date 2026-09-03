# 古着せどりコンテンツ自動化パイプライン

メルカリ・ヤフオク・BASE等の市場データを収集し、Claude（Anthropic API）で
「有料級noteレポート」「インスタ・カルーセル構成案」「リール台本」を毎週自動生成する
パイプラインです。**投稿の最終判断・実際の投稿は人が行う**ことを前提に、
レポート生成までを自動化します。

## できること

1. **データ収集**（`src/scrapers/`）
   - `yahoo_auction.py`: Yahoo!オークションの落札相場ページ（closedsearch）を収集
   - `mercari.py`: メルカリの売り切れ商品を収集。JS側でしか結果が描画されないため
     Playwright（ヘッドレスChromium）でレンダリングして取得する（**best-effort**。
     後述の注意点を参照）
   - `base_ec.py`: 設定した BASE ショップの商品（既定では販売中・完売の両方）を収集
   - `vintage_shops.py`: BASE以外の独立系ヴィンテージ古着店（BerBerJin, mushroom,
     SAFARI, ACORN 等）を収集。ショップごとにプラットフォームが異なるため
     `config.yaml`の`strategy`で切り替え可能（`link_pattern`=商品URLパターン抽出、
     `generic_card`=画像+価格の汎用抽出、`shopify_json`=Shopify公開APIを直接叩く）。
     「完売専用ページ」を`force_sold: true`で指定すればそのまま成約データとして扱える。
     価格がJSで後から書き換わる（静的HTMLでは"¥0"のプレースホルダーのまま）サイトは
     `render: "playwright"`でMercariと同様ヘッドレスブラウザ経由に切り替えられる
     （berberjinで実際にこの挙動を確認済み）
   - Yahoo/BASE/vintage_shopsは特定のCSSクラス名ではなく、商品ページURLのパターン
     （`find_item_candidates`, `src/scrapers/base_scraper.py`）を手がかりに抽出する
     ため、テーマ変更に強い
   - `keywords` に加えて `watch_brands` の各ブランド名×「古着」も自動で検索対象に
     追加され（`collect.py`の`_build_search_keywords`）、レギュラー古着・ビンテージ
     古着を問わず網羅的に収集する
   - **`config/brand_catalog.yaml`**: 定番ブランド×代表モデル/型番を約400組（Champion
     リバースウィーブ、Levi's 501、Patagonia シンチラ 等）収録したカタログ。ここからも
     「ブランド名 モデル名」の検索キーワードを自動生成し、ブランド単位に留まらない
     型番/モデルレベルのトレンド分析ができるだけのデータボリュームを取りに行く。
     - `aliases`: 約180ブランドに日本語/カタカナ表記（例: Sears→シアーズ）を付与。
       ヤフオク/メルカリの出品タイトルは英語表記とは限らず、カタカナのみのタイトルは
       英語ブランド名の部分一致では拾えない・タグ付けできないため、検索キーワード
       生成とタイトルマッチングの両方でカタカナ表記もフォールバックとして使う
       （`catalog.build_alias_index` / `collect._fill_missing_brands`）。
     - `item_keywords`: ブランドに紐付かない、ネルシャツ・フライトジャケット・
       カバーオールのようなアイテム/スタイル単位の検索語（約50件）。ノーブランド/
       ブランド不明でも実売が多いアイテムをカバーする。
     - キーワード数が数百規模になるため、`sources.yahoo_auction`/`sources.mercari`は
       1キーワードあたりの深さを絞って幅で稼ぐ設定にしてある
   - `data/manual/`: 手動でCSVを置くとスクレイパーの失敗時も自動フォールバック
2. **正規化・集計**（`src/pipeline/normalize.py`, `collect.py`）
   - 全ソースを共通スキーマ（`MarketItem`）に統合し、重複除去
   - ブランド別・型番/モデル別の売れ行き・平均価格などをサーバー側で確定計算
     （LLMに数字を捏造させない）
   - **era/variantタグ付け**（`collect._fill_missing_tags`）: 「Levi's 501」のような型番だけでは
     3,000円の個体と30万円の個体を区別できないため、501XX・ダブルネーム・赤耳・ビッグE・
     66前期/後期・黒カン・セルビッジ・デッドストック・日本製/アメリカ製・40s〜00sといった
     年代/仕様タグをタイトルから追加で抽出する（`MarketItem.tags`）。1アイテムに複数のタグが
     同時に付くこともある（例:「赤耳」かつ「ビッグE」）。`report_generator`はこれを
     `top_variants`（ブランド×モデル×タグ単位の件数・価格統計）として`top_models`のさらに
     一段階細かい粒度で集計する。
     - ノイズ対策: 「501xxではない」「赤耳風」等の否定・比較表現は近傍の単語チェックで除外
       (`_era_tag_context_disqualifies`)。加えて「復刻」「LVC」等の公式リプロダクション表記や
       「まとめ売り」等の複数点セット表記がタイトルにある場合、そのアイテムの年代・仕様系タグ
       （＝真贋を主張する類のタグ）は丸ごと除外する（`_AUTHENTICITY_TAGS`）。現行の復刻ライン
       は年代名をそのまま製品名に使う（例:「1966モデル」）ため、これがないと本物の年代物と
       同じ集計に混ざってしまう。
     - 最大のノイズ源として実データ比較で判明したのが「(検)66前期 66後期 ビッグE 赤耳」のような
       検索対策のキーワード羅列（実物の仕様とは無関係に検索ヒット狙いで単語を並べただけの
       タイトル）。「検)」等の明示的なマーカーに加え、1着の古着が同時に複数の年代・世代を
       名乗ることは物理的にありえない（例:「66前期」と「66後期」が両方付く、年代タグが3つ以上
       付く）という構造的な矛盾を検知した場合も、キーワード羅列とみなしてタグを丸ごと除外する
       (`_looks_like_keyword_stuffing`)
   - **Levi's週次推移スナップショット**（`report_generator._save_levis_trend_snapshot`）:
     レポート生成のたびに、Levi'sブランドの`top_models`/`top_variants`集計結果を
     `data/trends/levis_history.jsonl`へ1行追記する（Levi's関連データが無い実行はスキップ）。
     単発の実行結果だけでなく、実行を重ねるごとに価格推移をグラフ化できるようにするための
     蓄積用データで、現状はLevi'sのみを対象にした試験的な仕組み。
   - **トレンド集計とベンチマークの分離**（`report_generator._quick_stats`）: ヤフオク・
     メルカリ・手動データ（直近の落札/売却を検索した結果＝比較的直近の実売）は`trend`、
     独立系ヴィンテージショップEC等（「現在在庫切れ」であることしか分からず、いつ売れたか
     不明）は`reference_benchmark`として完全に別集計にしている。特定の高単価専門店1店舗
     のデータが全体トレンドの平均・ブランドランキングを歪めることを防ぎ、あくまで参考情報
     として別立てで扱う設計
3. **レポート生成**（`src/pipeline/report_generator.py`）
   - `src/prompts/system_prompt.md`（4フェーズのシステムプロンプト）とデータをClaudeに渡し、
     `data/reports/YYYY-MM-DD_vintage-resale-report.md` を生成
   - **SNSトレンド（X/Threads）**: X・ThreadsはAPI経由での話題検索が実質不可（Xの検索APIは
     有料プラン必須、Threads APIはサードパーティのキーワード検索を提供していない）ため、
     直接スクレイピングはせず、レポート生成時にClaudeへ**Web検索ツール**
     （`web_search_20260209`）を渡し、Claude自身にX/Threadsで話題の古着トピックを
     Web検索で調べさせてレポートに反映させている。価格情報に限らず、スタイリング流行や
     バズった投稿なども対象。`config.yaml`の`report.web_search_enabled` / 
     `web_search_max_uses`でON/OFF・検索回数上限を調整可能
4. **週次自動実行**（`.github/workflows/weekly_report.yml`）
   - 毎週月曜 9:00 JST（UTC 00:00）にGitHub Actionsで自動実行し、レポートをコミット＋
     ワークフローのアーティファクトとしても保存

## セットアップ

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
playwright install chromium   # メルカリ収集用のヘッドレスブラウザ
cp .env.example .env   # ANTHROPIC_API_KEY を設定
```

GitHub Actionsでの認証は2通りあります。

- **Workload Identity Federation（推奨・現在の設定）**: 長期固定のAPIキーをGitHub Secretsに
  置かず、GitHub ActionsのOIDCトークンから都度10分の短命トークンを発行して認証する方式。
  `.github/workflows/weekly_report.yml` はこの方式で構成済みです（Anthropic Console側の
  「ワークロードアイデンティティ」で発行者・ルール・サービスアカウントを作成し、そのIDを
  ワークフローの `env:` に設定してあります）。追加のSecrets登録は不要です。
- **APIキー（ローカル実行 / 代替手段）**: `.env` に `ANTHROPIC_API_KEY` を設定してローカルで
  実行する場合や、WIFを使わずシンプルにActions Secretsで運用したい場合はこちらでも動作します
  （`report_generator.py` は `ANTHROPIC_API_KEY` があればそちらを優先します）。

## 使い方

```bash
# データ収集のみ（data/raw/*.jsonl に保存）
python -m src.main collect

# 収集からレポート生成まで一気通貫
python -m src.main run

# 過去に収集済みのデータからレポートだけ再生成
python -m src.main report --input data/raw/collected_XXXXXXXXTXXXXXXZ.jsonl
```

生成物は `data/reports/` にMarkdownで出力されます。note投稿、Instagramのカルーセル画像・
リール制作には、このMarkdown内の該当セクションをそのまま利用してください。

## 設定（`config/config.yaml`）

- `keywords`: 収集対象の検索キーワード
- `watch_brands`: トレンド分析で優先的に見るブランド
- `sources.*.enabled`: 各スクレイパーのON/OFF
- `sources.base_ec.shop_urls`: 監視したいBASEショップの公開URL
- `report.model`: 使用するClaudeモデル（既定 `claude-sonnet-5`）

`config/brand_catalog.yaml`（ブランド×モデルの網羅カタログ、約400組）はブランドや
モデルの追加・削除だけで完結する頻度の低い編集向けの別ファイルとして分離してある。
`catalog: [{brand: "...", tier: "...", models: ["...", ...], aliases: ["..."]}, ...]`
の形式で追記すればよい（`aliases`は日本語/カタカナ表記があれば追加、無ければ省略可）。
ブランドに紐付かないアイテム単位の検索語は同ファイル末尾の
`item_keywords: [{term: "...", category: "..."}, ...]` に追記する。

## 手動データの投入（フォールバック運用）

- `data/manual/items_template.csv` をコピーして商品データを追記すると、スクレイパーの
  成否に関わらずレポートに反映されます（列の意味はテンプレート内コメント参照）。
- `data/manual/hashtags.csv` にSNSハッシュタグの投稿数・伸び率を手動記録すると
  レポートのSNSトレンド分析に反映されます（Instagramの公式APIはビジネスアカウント連携が
  必要で機能制限も大きいため、既定では自動収集していません）。

## 重要：利用規約・コンプライアンスについて

このリポジトリのスクレイパーは、各サービス（メルカリ・Yahoo!オークション・BASE等）の
公開ページに対して**低頻度・低負荷**でアクセスするよう実装していますが、これらのサービスは
それぞれ独自の利用規約を持っており、**自動アクセス（スクレイピング）を制限・禁止している
場合があります**。本パイプラインを有効化する前に、必ず対象サービスの利用規約・robots.txtを
確認し、自己の責任で判断してください。

- 各スクレイパーの `request_interval_sec` は控えめな値を既定にしていますが、対象サービスに
  過度な負荷をかけないよう、必要以上に頻度を上げないでください。
- **メルカリのスクレイパー (`mercari.py`) は特に壊れやすい実装です。** 公式APIが存在せず、
  Webフロントエンドの内部構造変化で容易に動作しなくなります。安定運用したい場合は
  `data/manual/` への手動データ投入を主経路として運用することを推奨します。
- BASEショップの監視は、自店舗の管理や、利用規約で許可された範囲での競合価格調査等、
  正当な用途に限定してください。
- Instagram等SNSデータの自動収集は既定で無効化しています。公式Graph API（ビジネス
  アカウント連携）の利用、または手動記録での運用を推奨します。

## note / Instagramへの実投稿について

現状このパイプラインは**投稿の自動化は行いません**（noteは投稿用の公式APIを提供しておらず、
InstagramへのAPI投稿はビジネスアカウント連携・審査等の準備が必要なため）。生成された
Markdownレポートを確認のうえ、人が最終判断して投稿する運用を想定しています。将来的に
投稿自動化まで広げたい場合は、Instagram Graph API（コンテンツ公開API）の申請・連携から
着手するのが現実的です。

## テスト

```bash
pip install pytest
pytest tests/
```

（`tests/` はネットワークアクセスを行わない正規化ロジックのユニットテストのみです。
スクレイパー自体は対象サイトの構造変化で壊れる可能性があるため、定期的に実データで
動作確認することを推奨します。）
