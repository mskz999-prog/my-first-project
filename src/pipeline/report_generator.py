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


def _quick_stats(items: list[MarketItem]) -> dict[str, Any]:
    """Compute a small set of aggregate stats server-side (not by the LLM)
    so the report's headline numbers are exact, not model-estimated."""
    sold = [i for i in items if i.is_sold and i.price]
    prices = [i.price for i in sold if i.price]

    brand_counter = Counter(i.brand for i in sold if i.brand)
    brand_prices: dict[str, list[int]] = defaultdict(list)
    for i in sold:
        if i.brand and i.price:
            brand_prices[i.brand].append(i.price)

    top_brands = [
        {
            "brand": brand,
            "sold_count": count,
            "avg_price": round(mean(brand_prices[brand])) if brand_prices[brand] else None,
            "median_price": round(median(brand_prices[brand])) if brand_prices[brand] else None,
        }
        for brand, count in brand_counter.most_common(15)
    ]

    by_source = Counter(i.source for i in items)

    return {
        "total_items": len(items),
        "total_sold_with_price": len(sold),
        "overall_avg_price": round(mean(prices)) if prices else None,
        "overall_median_price": round(median(prices)) if prices else None,
        "items_by_source": dict(by_source),
        "top_brands": top_brands,
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
    response = client.messages.create(
        model=model,
        max_tokens=max_tokens,
        system=system_prompt,
        messages=[{"role": "user", "content": user_message}],
        **({"tools": tools} if tools else {}),
    )
    report_markdown = "".join(
        block.text for block in response.content if getattr(block, "type", None) == "text"
    )

    output_dir = project_root / report_cfg.get("output_dir", "data/reports")
    output_dir.mkdir(parents=True, exist_ok=True)
    date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    output_path = output_dir / f"{date_str}_vintage-resale-report.md"
    output_path.write_text(report_markdown, encoding="utf-8")

    logger.info("Report written to %s", output_path)
    return output_path
