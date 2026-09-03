"""Builds the market-data summary + calls Claude to generate the note
report / carousel plan / reel script, and writes the result to disk.
"""
from __future__ import annotations

import csv
import json
import logging
import os
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
from statistics import mean, median
from typing import Any

import anthropic

from src.pipeline.normalize import MarketItem, to_summary_json

logger = logging.getLogger(__name__)

PROMPT_PATH = Path(__file__).resolve().parent.parent / "prompts" / "system_prompt.md"

# Sources with a genuine recency signal — the scrape targets "recently sold/
# closed" listings, so their prices reflect current market activity. Sources
# outside this set (currently just vintage_shop, e.g. acorn) only tell us
# "currently out of stock", with no way to know if that sale was last week
# or three years ago, and vintage_shop happens in practice to be dominated
# by one high-end specialty store — so its prices are excluded from the main
# trend aggregates entirely and surfaced separately as a labeled reference
# benchmark instead. See build_user_message's explanatory text.
TREND_SOURCES = {"yahoo_auction", "mercari", "manual"}


def _load_system_prompt() -> str:
    return PROMPT_PATH.read_text(encoding="utf-8")


def _load_hashtags(manual_dir: Path) -> list[dict[str, str]]:
    path = manual_dir / "hashtags.csv"
    if not path.exists():
        return []
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def _price_block(prices: list[int]) -> dict[str, Any]:
    if not prices:
        return {"sold_count": 0, "avg_price": None, "median_price": None, "min_price": None, "max_price": None}
    return {
        "sold_count": len(prices),
        "avg_price": round(mean(prices)),
        "median_price": round(median(prices)),
        "min_price": min(prices),
        "max_price": max(prices),
    }


def _brand_category_model_breakdown(sold: list[MarketItem]) -> dict[str, Any]:
    """Shared aggregation logic for a set of already-filtered sold items —
    used once for trend_stats (recency-bearing sources only) and once for
    reference_benchmark (everything else), so the two never mix.

    Also breaks brand+model down one level further into `top_variants`
    (brand, model, era/variant tag — e.g. Levi's 501 x 赤耳 vs. Levi's 501
    x 66前期) using the tags collect._fill_missing_tags attaches. A flat
    `model` tag alone can't tell a ¥3,000 501 from a ¥300,000 one; the tag
    dimension is what actually drives vintage-denim pricing.
    """
    brand_prices: dict[str, list[int]] = defaultdict(list)
    category_prices: dict[str, list[int]] = defaultdict(list)
    brand_category_prices: dict[tuple[str, str], list[int]] = defaultdict(list)
    brand_model_prices: dict[tuple[str, str], list[int]] = defaultdict(list)
    brand_model_tag_prices: dict[tuple[str, str, str], list[int]] = defaultdict(list)
    for i in sold:
        if not i.price:
            continue
        if i.brand:
            brand_prices[i.brand].append(i.price)
        if i.category:
            category_prices[i.category].append(i.price)
        if i.brand and i.category:
            brand_category_prices[(i.brand, i.category)].append(i.price)
        if i.brand and i.model:
            brand_model_prices[(i.brand, i.model)].append(i.price)
            # A model can carry several era/variant tags at once (e.g. a
            # "501" listing tagged both 赤耳 and 66前期) — each one is a
            # meaningfully different sub-market, so each gets its own
            # (brand, model, tag) bucket rather than collapsing into the
            # model-level number alone.
            for tag in i.tags:
                brand_model_tag_prices[(i.brand, i.model, tag)].append(i.price)

    top_brands = [
        {"brand": brand, **_price_block(prices_)}
        for brand, prices_ in sorted(brand_prices.items(), key=lambda kv: -len(kv[1]))[:15]
    ]
    top_categories = [
        {"category": category, **_price_block(prices_)}
        for category, prices_ in sorted(category_prices.items(), key=lambda kv: -len(kv[1]))[:15]
    ]
    brand_category_breakdown = [
        {"brand": brand, "category": category, **_price_block(prices_)}
        for (brand, category), prices_ in sorted(
            brand_category_prices.items(), key=lambda kv: -len(kv[1])
        )[:30]
    ]
    top_models = [
        {"brand": brand, "model": model, **_price_block(prices_)}
        for (brand, model), prices_ in sorted(
            brand_model_prices.items(), key=lambda kv: -len(kv[1])
        )[:40]
    ]
    top_variants = [
        {"brand": brand, "model": model, "tag": tag, **_price_block(prices_)}
        for (brand, model, tag), prices_ in sorted(
            brand_model_tag_prices.items(), key=lambda kv: -len(kv[1])
        )[:40]
    ]

    return {
        "overall": _price_block([i.price for i in sold if i.price]),
        "top_brands": top_brands,
        "top_categories": top_categories,
        "brand_category_breakdown": brand_category_breakdown,
        "top_models": top_models,
        "top_variants": top_variants,
    }


def _quick_stats(items: list[MarketItem]) -> dict[str, Any]:
    """Compute a small set of aggregate stats server-side (not by the LLM)
    so the report's headline numbers are exact, not model-estimated.

    Includes min/max alongside avg/median specifically so an implausible
    outlier (e.g. a mis-extracted price) is visible in the numbers handed
    to the model, instead of only surfacing once buried in an average.

    Deliberately computed as two disjoint aggregates rather than one blended
    set of numbers: `trend` (yahoo_auction/mercari/manual — sources with a
    real recency signal) drives the headline market-trend analysis, while
    `reference_benchmark` (vintage_shop etc.) is kept out of every trend
    number entirely and reported separately. Earlier versions blended
    everything into one `overall_*`/`top_brands` set, which let one
    high-end specialty vintage_shop (acorn) — with no way to know if a
    listing sold last week or three years ago — dominate brand/category
    averages meant to represent "this week's market".
    """
    trend_items = [i for i in items if i.source in TREND_SOURCES]
    reference_items = [i for i in items if i.source not in TREND_SOURCES]

    trend_sold = [i for i in trend_items if i.is_sold and i.price]
    reference_sold = [i for i in reference_items if i.is_sold and i.price]

    trend = _brand_category_model_breakdown(trend_sold)
    reference_benchmark = _brand_category_model_breakdown(reference_sold)

    by_source = Counter(i.source for i in items)
    source_prices: dict[str, list[int]] = defaultdict(list)
    for i in items:
        if i.is_sold and i.price:
            source_prices[i.source].append(i.price)
    by_source_stats = [
        {
            "source": source,
            "item_count": by_source.get(source, 0),
            "has_recency_signal": source in TREND_SOURCES,
            **_price_block(prices_),
        }
        for source, prices_ in source_prices.items()
    ]

    return {
        "total_items": len(items),
        "total_sold_with_price": len(trend_sold) + len(reference_sold),
        "items_by_source": dict(by_source),
        "by_source_price_stats": by_source_stats,
        "trend": {
            "description": (
                "直近性のあるソース（ヤフオク・メルカリ・手動データ）のみで算出。"
                "全体トレンド分析・見出しの数字はこちらを使うこと。"
            ),
            "sources": sorted(TREND_SOURCES),
            "total_items": len(trend_items),
            "total_sold_with_price": len(trend_sold),
            **trend,
        },
        "reference_benchmark": {
            "description": (
                "時期不明の完売実績（例: 独立系ヴィンテージショップECの在庫切れ商品）。"
                "いつ売れたか分からないため全体トレンドの集計には含めていない。"
                "参考情報としてのみ扱い、平均・中央値等をtrendの数字と混ぜて語らないこと。"
            ),
            "sources": sorted(s for s in by_source if s not in TREND_SOURCES),
            "total_items": len(reference_items),
            "total_sold_with_price": len(reference_sold),
            **reference_benchmark,
        },
    }


TREND_HISTORY_DIR = "data/trends"
TREND_HISTORY_FILE = "levis_weekly.jsonl"


def _week_start(iso_timestamp: str) -> str | None:
    """The Monday (ISO 8601 week start) of the week containing
    `iso_timestamp`, as a YYYY-MM-DD string — the bucket key for weekly
    trend history. Returns None for an unparseable timestamp rather than
    raising, since sold_at is best-effort (see yahoo_auction.py).
    """
    try:
        dt = datetime.fromisoformat(iso_timestamp)
    except ValueError:
        return None
    monday = dt.date() - timedelta(days=dt.weekday())
    return monday.isoformat()


def _save_levis_weekly_snapshot(
    items: list[MarketItem],
    project_root: Path,
    mode: str,
) -> None:
    """Buckets this run's Levi's items by the real week they actually sold
    (MarketItem.sold_at) and appends one JSON line per week to
    data/trends/levis_weekly.jsonl — real date-accurate history to chart
    price movement over time, rather than one blended "whatever this run
    happened to collect" snapshot per run.

    Scoped to source == "yahoo_auction": it's currently the only source
    with a real sold date (see README — Mercari's search results don't
    show one, and there's no public per-item page that does either), so
    other sources are left out entirely rather than smeared into a
    misleadingly-dated bucket. Also scoped to Levi's only for now, matching
    the era/variant tagging work already validated for this brand — can
    widen to other watch_brands later.

    Appends one entry per (run, week) rather than merging in place: a week
    that's fully in the past is a closed, unchanging set of auctions, so a
    later run re-collecting it should see the same (or a superset of)
    results — readers should prefer the most recent entry for a given
    week rather than summing duplicates.
    """
    dated = [
        i for i in items
        if i.source == "yahoo_auction" and i.brand == "Levi's" and i.sold_at and i.price
    ]
    if not dated:
        return

    by_week: dict[str, list[MarketItem]] = defaultdict(list)
    for item in dated:
        week = _week_start(item.sold_at)
        if week:
            by_week[week].append(item)
    if not by_week:
        return

    history_dir = project_root / TREND_HISTORY_DIR
    history_dir.mkdir(parents=True, exist_ok=True)
    history_path = history_dir / TREND_HISTORY_FILE
    run_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    with history_path.open("a", encoding="utf-8") as f:
        for week, week_items in sorted(by_week.items()):
            breakdown = _brand_category_model_breakdown(week_items)
            entry = {
                "run_at": run_at,
                "week_start": week,
                "mode": mode,
                "levis_overall": breakdown["overall"],
                "top_models": breakdown["top_models"],
                "top_variants": breakdown["top_variants"],
            }
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    logger.info("Appended %d week(s) of Levi's trend history to %s", len(by_week), history_path)


def build_user_message(
    items: list[MarketItem],
    hashtags: list[dict[str, str]],
    config: dict[str, Any],
) -> str:
    stats = _quick_stats(items)
    lookback_days = config.get("report", {}).get("lookback_days", 7)
    watch_brands = config.get("watch_brands", [])

    parts = [
        f"# 入力データ（直近{lookback_days}日分・自動収集＋手動データ統合）",
        "",
        "## サーバー側で事前集計した確定値（この数値はそのまま正として使用してよい）",
        "重要: 数値は`trend`と`reference_benchmark`の2系統に完全に分離済み。"
        "`trend`はヤフオク・メルカリ・手動データ（直近の落札/売却を検索した結果＝比較的直近の"
        "取引を反映）のみで算出した数字で、**全体トレンド分析・見出しの平均/中央値/ブランド"
        "ランキング/アイテム（型番）ランキングはすべてこちらを主として使うこと**。"
        "`reference_benchmark`は独立系ヴィンテージショップEC等（現在の公開APIの制約上"
        "「現在在庫切れ」であることしか分からず、**いつ売れたかは一切不明**＝数ヶ月〜数年前の"
        "可能性もある）の完売実績で、trendの集計には最初から含まれていない。"
        "reference_benchmarkの数字をtrendの数字と混ぜて「市場全体の平均は◯円」のように語らない"
        "こと。reference_benchmarkは「◯◯（店名）の完売実績（時期不明・ベンチマーク参考値）」の"
        "ように、時期不明であることと参考情報である旨を明示した上で、trendとは別立ての独立した"
        "サブセクションで扱うこと。特定の1店舗が母数の大半を占める場合は、その店舗固有の傾向"
        "（高単価帯に強い店等）である可能性も明記すること。"
        "`trend.top_models`（ブランド×モデル/型番単位の件数・価格統計）はアイテムレベルの"
        "トレンド分析にそのまま使ってよい。さらに`trend.top_variants`（ブランド×モデル×"
        "era/variantタグ単位。タグは501XX/赤耳/ビッグE/66前期/66後期/黒カン/セルビッジ/"
        "デッドストック/日本製/アメリカ製/40s〜00s等の年代・仕様タグで、1アイテムに複数付く"
        "こともある）はモデルだけでは区別できない「同じ型番でも仕様・年代で価格が桁違いになる"
        "個体差」の分析に使うこと。件数が十分ある組み合わせを優先し、タグが付いていないアイテムが"
        "多い（＝仕様不明のまま出品されている）こと自体もアービトラージの余地として言及してよい。"
        "**重要**: `top_variants`のタグは出品タイトルの文字列一致から機械的に抽出したもので、"
        "実物の真贋確認や専門家による鑑定を経たものではない（出品者の自己申告ベース）。"
        "断定的に「これは正真正銘のビッグEだ」のように語らず、「ビッグEと表記された出品」"
        "「赤耳を謳う個体」のように出品側の表記であることが伝わる書き方をすること。特に"
        "`min_price`と`max_price`の差が極端に大きい組み合わせ（例: 同じタグ内で数百円〜数十万円）"
        "は、出品者の誤表記・大げさな煽り文句・比較文脈の誤検出が混入している可能性を示唆する"
        "ため、平均値をそのまま鵜呑みにせず、その旨（数値のばらつきが大きく実態を反映しきれて"
        "いない可能性）に触れること。",
        f"```json\n{json.dumps(stats, ensure_ascii=False)}\n```",
        "",
        f"## 追跡対象ブランド設定: {json.dumps(watch_brands, ensure_ascii=False)}",
        "",
        "## ハッシュタグ手動データ（data/manual/hashtags.csv）",
        f"```json\n{json.dumps(hashtags, ensure_ascii=False)}\n```",
        "",
        "## 収集アイテム明細（JSON配列。件数が多い場合は情報量の多いものを優先して抜粋済み）",
        f"```json\n{to_summary_json(items)}\n```",
    ]
    return "\n".join(parts)


def _has_wif_credentials() -> bool:
    """Workload Identity Federation env vars the Anthropic SDK auto-detects
    (see .github/workflows/weekly_report.yml, which sets all four)."""
    required = (
        "ANTHROPIC_FEDERATION_RULE_ID",
        "ANTHROPIC_ORGANIZATION_ID",
        "ANTHROPIC_SERVICE_ACCOUNT_ID",
    )
    has_identity_token = bool(
        os.environ.get("ANTHROPIC_IDENTITY_TOKEN")
        or os.environ.get("ANTHROPIC_IDENTITY_TOKEN_FILE")
    )
    return has_identity_token and all(os.environ.get(v) for v in required)


def generate_report(
    items: list[MarketItem],
    config: dict[str, Any],
    project_root: Path,
    quick: bool = False,
    focus_brands: list[str] | None = None,
) -> Path:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key and not _has_wif_credentials():
        raise RuntimeError(
            "No Anthropic credentials found. Either set ANTHROPIC_API_KEY "
            "(copy .env.example to .env locally, or an Actions secret) or "
            "configure Workload Identity Federation (ANTHROPIC_ORGANIZATION_ID, "
            "ANTHROPIC_SERVICE_ACCOUNT_ID, ANTHROPIC_FEDERATION_RULE_ID, and "
            "ANTHROPIC_IDENTITY_TOKEN[_FILE])."
        )

    report_cfg = config.get("report", {})
    model = os.environ.get("CLAUDE_MODEL") or report_cfg.get("model", "claude-sonnet-5")
    max_tokens = report_cfg.get("max_tokens", 8000)

    manual_dir = project_root / config.get("manual_data_dir", "data/manual")
    hashtags = _load_hashtags(manual_dir)

    system_prompt = _load_system_prompt()
    user_message = build_user_message(items, hashtags, config)

    tools = None
    if report_cfg.get("web_search_enabled", True):
        # Lets Claude look up recent X/Threads buzz around vintage/used
        # clothing itself during generation (see phase 1 of the system
        # prompt) instead of us scraping X/Threads directly — both of
        # which are either paywalled (X's search API) or don't expose a
        # third-party keyword-search endpoint at all (Threads API).
        tools = [
            {
                "type": "web_search_20260209",
                "name": "web_search",
                "max_uses": report_cfg.get("web_search_max_uses", 6),
            }
        ]

    client = anthropic.Anthropic(api_key=api_key) if api_key else anthropic.Anthropic()
    logger.info("Calling Claude (%s) to generate report from %d items", model, len(items))
    # Streaming, not a plain create(): a non-streaming call already took
    # ~10 minutes in one real run (right at the SDK's default HTTP
    # timeout), and a sibling run with the same code separately exhausted
    # the whole max_tokens budget on thinking + web_search tool calls
    # before writing any report text. Streaming removes the HTTP-timeout
    # risk, which is what actually lets max_tokens be raised further as
    # headroom against the second failure mode.
    with client.messages.stream(
        model=model,
        max_tokens=max_tokens,
        system=system_prompt,
        messages=[{"role": "user", "content": user_message}],
        **({"tools": tools} if tools else {}),
    ) as stream:
        response = stream.get_final_message()
    report_markdown = "".join(
        block.text for block in response.content if getattr(block, "type", None) == "text"
    )

    if not report_markdown.strip():
        block_types = [getattr(b, "type", "?") for b in response.content]
        raise RuntimeError(
            f"Claude returned no text content (stop_reason={response.stop_reason!r}, "
            f"content block types={block_types}). Refusing to write an empty report. "
            "This usually means max_tokens was hit before any report text was "
            "generated (e.g. spent on web_search tool calls) — try raising "
            "report.max_tokens or lowering report.web_search_max_uses in config.yaml."
        )

    output_dir = project_root / report_cfg.get("output_dir", "data/reports")
    output_dir.mkdir(parents=True, exist_ok=True)
    date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    # Quick-test and brand-focused runs (see collect.QUICK_SAMPLE_TIERS /
    # collect_all's `brands` param) get their own filename so they never
    # silently clobber a same-day production report.
    if focus_brands:
        slug = "-".join(b.lower().replace("'", "").replace(" ", "-") for b in focus_brands)
        suffix = f"-focus-{slug}"
        mode = f"focus-{slug}"
    elif quick:
        suffix = "-quick-test"
        mode = "quick-test"
    else:
        suffix = ""
        mode = "weekly"
    output_path = output_dir / f"{date_str}_vintage-resale-report{suffix}.md"
    output_path.write_text(report_markdown, encoding="utf-8")

    logger.info("Report written to %s", output_path)

    _save_levis_weekly_snapshot(items, project_root, mode)

    return output_path
