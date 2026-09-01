"""Orchestrates all configured data sources into one normalized dataset.

Each scraper is isolated in its own try/except: a failure (site structure
changed, network blocked, ToS-driven access restriction, etc.) is logged
and that source simply contributes zero scraped items — it never aborts
the run. Manual CSV data (data/manual/) is always loaded in addition to
whatever scrapers succeed, so the pipeline degrades gracefully down to
"pure manual data in, report out" rather than failing closed.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from src.pipeline.normalize import MarketItem, dedupe, load_manual_csv, save_jsonl
from src.scrapers import base_ec, mercari, yahoo_auction
from src.scrapers.base_scraper import ScraperError

logger = logging.getLogger(__name__)


def collect_all(config: dict[str, Any], project_root: Path) -> list[MarketItem]:
    items: list[MarketItem] = []
    sources_cfg = config.get("sources", {})
    keywords = config.get("keywords", [])

    yahoo_cfg = sources_cfg.get("yahoo_auction", {})
    if yahoo_cfg.get("enabled") and keywords:
        try:
            items.extend(
                yahoo_auction.scrape(
                    keywords=keywords,
                    max_pages_per_keyword=yahoo_cfg.get("max_pages_per_keyword", 3),
                    request_interval_sec=yahoo_cfg.get("request_interval_sec", 2.5),
                )
            )
            logger.info("yahoo_auction: collected %d items", len(items))
        except ScraperError as exc:
            logger.warning("yahoo_auction: skipped — %s", exc)

    mercari_cfg = sources_cfg.get("mercari", {})
    if mercari_cfg.get("enabled") and keywords:
        try:
            mercari_items = mercari.scrape(
                keywords=keywords,
                status=mercari_cfg.get("status", "sold_out"),
                max_items_per_keyword=mercari_cfg.get("max_items_per_keyword", 100),
                request_interval_sec=mercari_cfg.get("request_interval_sec", 3.0),
            )
            items.extend(mercari_items)
            logger.info("mercari: collected %d items", len(mercari_items))
        except ScraperError as exc:
            logger.warning(
                "mercari: skipped (%s) — relying on data/manual/ for Mercari data", exc
            )

    base_cfg = sources_cfg.get("base_ec", {})
    if base_cfg.get("enabled") and base_cfg.get("shop_urls"):
        try:
            base_items = base_ec.scrape(
                shop_urls=base_cfg["shop_urls"],
                request_interval_sec=base_cfg.get("request_interval_sec", 2.0),
            )
            items.extend(base_items)
            logger.info("base_ec: collected %d items", len(base_items))
        except ScraperError as exc:
            logger.warning("base_ec: skipped — %s", exc)

    # Manual fallback / supplement — always loaded regardless of scraper outcomes.
    manual_dir = project_root / config.get("manual_data_dir", "data/manual")
    manual_count = 0
    if manual_dir.exists():
        for csv_path in manual_dir.glob("*.csv"):
            if csv_path.name == "hashtags.csv":
                continue  # handled separately by the report generator, not as MarketItems
            manual_items = load_manual_csv(csv_path)
            items.extend(manual_items)
            manual_count += len(manual_items)
    logger.info("manual: loaded %d items from %s", manual_count, manual_dir)

    deduped = dedupe(items)
    logger.info("collect_all: %d raw -> %d after dedupe", len(items), len(deduped))

    raw_dir = project_root / "data" / "raw"
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    save_jsonl(deduped, raw_dir / f"collected_{timestamp}.jsonl")

    return deduped
