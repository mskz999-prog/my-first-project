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
   - Yahoo/BASEは特定のCSSクラス名ではなく、商品ページURLのパターン（`find_item_candidates`,
     `src/scrapers/base_scraper.py`）を手がかりに抽出するため、テーマ変更に強い
   - `keywords` に加えて `watch_brands` の各ブランド名×「古着」も自動で検索対象に
     追加され（`collect.py`の`_build_search_keywords`）、レギュラー古着・ビンテージ
     古着を問わず網羅的に収集する
   - `data/manual/`: 手動でCSVを置くとスクレイパーの失敗時も自動フォールバック
2. **正規化・集計**（`src/pipeline/normalize.py`, `collect.py`）
   - 全ソースを共通スキーマ（`MarketItem`）に統合し、重複除去
   - ブランド別の売れ行き・平均価格などをサーバー側で確定計算（LLMに数字を捏造させない）
3. **レポート生成**（`src/pipeline/report_generator.py`）
   - `src/prompts/system_prompt.md`（4フェーズのシステムプロンプト）とデータをClaudeに渡し、
     `data/reports/YYYY-MM-DD_vintage-resale-report.md` を生成
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
