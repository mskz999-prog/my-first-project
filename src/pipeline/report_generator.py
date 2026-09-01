"""Builds the market-data summary + calls Claude to generate the note
report / carousel plan / reel script, and writes the result to disk.
"""
from __future__ import annotations

import csv
import json
import logging
import os
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from statistics import mean, median
from typing import Any

import anthropic

from src.pipeline.normalize import MarketItem, to_summary_json

logger = logging.getLogger(__name__)

PROMPT_PATH = Path(__file__).resolve().parent.parent / "prompts" / "system_prompt.md"


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


def _quick_stats(items: list[MarketItem]) -> dict[str, Any]:
    """Compute a small set of aggregate stats server-side (not by the LLM)
    so the report's headline numbers are exact, not model-estimated.

    Includes min/max alongside avg/median specifically so an implausible
    outlier (e.g. a mis-extracted price) is visible in the numbers handed
    to the model, instead of only surfacing once buried in an average.
    """
    sold = [i for i in items if i.is_sold and i.price]
    prices = [i.price for i in sold if i.price]

    brand_prices: dict[str, list[int]] = defaultdict(list)
    category_prices: dict[str, list[int]] = defaultdict(list)
    brand_category_prices: dict[tuple[str, str], list[int]] = defaultdict(list)
    for i in sold:
        if not i.price:
            continue
        if i.brand:
            brand_prices[i.brand].append(i.price)
        if i.category:
            category_prices[i.category].append(i.price)
        if i.brand and i.category:
            brand_category_prices[(i.brand, i.category)].append(i.price)

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

    by_source = Counter(i.source for i in items)
    overall = _price_block(prices)

    source_prices: dict[str, list[int]] = defaultdict(list)
    for i in sold:
        if i.price:
            source_prices[i.source].append(i.price)
    by_source_stats = [
        {
            "source": source,
            "item_count": by_source.get(source, 0),
            "has_recency_signal": source in ("yahoo_auction", "mercari"),
            **_price_block(prices_),
        }
        for source, prices_ in source_prices.items()
    ]

    return {
        "total_items": len(items),
        "total_sold_with_price": len(sold),
        "overall_avg_price": overall["avg_price"],
        "overall_median_price": overall["median_price"],
        "overall_min_price": overall["min_price"],
        "overall_max_price": overall["max_price"],
        "items_by_source": dict(by_source),
        "by_source_price_stats": by_source_stats,
        "top_brands": top_brands,
        "top_categories": top_categories,
        "brand_category_breakdown": brand_category_breakdown,
    }


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
        "重要: `by_source_price_stats`の`has_recency_signal`に注意すること。"
        "`yahoo_auction`と`mercari`は「直近の落札/売却」を検索した結果なので比較的直近の"
        "取引を反映しているが、`vintage_shop`（独立系ショップEC）は現在の公開APIの制約上"
        "「現在在庫切れ」であることしか分からず、**いつ売れたかは一切不明**（数ヶ月〜数年前の"
        "可能性もある）。`vintage_shop`のデータを「今週の成約」「今週売れた」のように断定的に"
        "書かないこと。「◯◯（店名）の完売実績（時期不明・ベンチマーク参考値）」のように、"
        "時期不明であることを明示した上で扱うこと。また特定の1店舗が母数の大半を占める場合は、"
        "その店舗固有の傾向（高単価帯に強い店等）である可能性を明記し、市場全体の傾向として"
        "一般化しすぎないこと。",
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
    output_path = output_dir / f"{date_str}_vintage-resale-report.md"
    output_path.write_text(report_markdown, encoding="utf-8")

    logger.info("Report written to %s", output_path)
    return output_path
