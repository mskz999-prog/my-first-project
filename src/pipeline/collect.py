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
from src.scrapers import base_ec, mercari, vintage_shops, yahoo_auction
from src.scrapers.base_scraper import ScraperError

logger = logging.getLogger(__name__)


def _build_search_keywords(config: dict[str, Any]) -> list[str]:
    """Base keywords + one "<brand> 古着" combo per watched brand.

    The base keyword list alone (e.g. plain "古着", "ヴィンテージ") tends to
    surface whatever is most generically popular; adding a per-brand combo
    ensures every brand in watch_brands gets its own dedicated search, so
    both mainstream and vintage-specific items across all tracked brands
    are covered rather than just whatever ranks highest for broad terms.
    """
    keywords = list(dict.fromkeys(config.get("keywords", [])))  # de-dupe, keep order
    for brand in config.get("watch_brands", []):
        combo = f"{brand} 古着"
        if combo not in keywords:
            keywords.append(combo)
    return keywords


# Genre/category keyword dictionary for _fill_missing_category. Ordered
# so more specific terms are checked before terms they could be confused
# with (e.g. "オーバーオール" before a generic catch-all would matter more
# once one exists; for now order mostly doesn't matter since categories
# are mutually distinct enough).
GENRE_KEYWORDS: dict[str, tuple[str, ...]] = {
    "スウェット": ("スウェット", "sweat shirt", "sweatshirt"),
    "パーカー": ("パーカー", "フーディー", "hoodie"),
    "Tシャツ": ("tシャツ", "t-shirt", "tシャツ"),
    "デニム": ("デニム", "ジーンズ", "denim", "jeans"),
    "オーバーオール": ("オーバーオール", "コンビオール", "つなぎ", "coverall", "overall"),
    "ジャケット": ("ジャケット", "ブルゾン", "jacket"),
    "フリース": ("フリース", "fleece", "シンチラ", "synchilla"),
    "シャツ": ("シャツ", "shirt"),
    "コート": ("コート", "coat"),
    "ニット・セーター": ("ニット", "セーター", "knit", "sweater"),
    "ベスト": ("ベスト", "vest"),
    "パンツ": ("パンツ", "ズボン", "pants", "trousers"),
    "ショーツ": ("ショーツ", "ショートパンツ", "shorts"),
    "バッグ": ("バッグ", "bag"),
}


def _fill_missing_category(items: list[MarketItem]) -> None:
    """Best-effort genre tagging by matching a keyword dictionary against
    the title, the same approach as _fill_missing_brands. Lets
    _quick_stats (and the report) break brand-level numbers down by
    garment type instead of lumping e.g. all Champion items together
    regardless of whether they're sweatshirts or t-shirts.
    """
    for item in items:
        if item.category:
            continue
        title_lower = item.title.lower()
        for genre, keywords in GENRE_KEYWORDS.items():
            if any(kw in title_lower for kw in keywords):
                item.category = genre
                break


def _fill_missing_brands(items: list[MarketItem], watch_brands: list[str]) -> None:
    """Best-effort brand tagging by matching watch_brands against the title.

    None of the scrapers extract a structured brand field (Yahoo/Mercari/
    vintage-shop titles are free text), so every scraped item's `brand`
    starts out None — only manually-entered CSV rows had one. That left
    _quick_stats' brand breakdown effectively empty even with thousands of
    real items collected, so the report had nothing concrete to say about
    watch_brands and fell back to generic, ungrounded-sounding text. This
    fills `brand` in place wherever a watched brand's name (case-insensitive)
    appears in the title and no brand was already set (e.g. from a manual
    CSV, which is trusted as-is and left untouched).
    """
    if not watch_brands:
        return
    lowered_brands = [(b, b.lower()) for b in watch_brands]
    for item in items:
        if item.brand:
            continue
        title_lower = item.title.lower()
        for original, lowered in lowered_brands:
            if lowered in title_lower:
                item.brand = original
                break


def collect_all(config: dict[str, Any], project_root: Path) -> tuple[list[MarketItem], Path]:
    """Collect from every enabled source and return (items, saved_jsonl_path)."""
    items: list[MarketItem] = []
    sources_cfg = config.get("sources", {})
    search_keywords = _build_search_keywords(config)

    yahoo_cfg = sources_cfg.get("yahoo_auction", {})
    if yahoo_cfg.get("enabled") and search_keywords:
        try:
            yahoo_items = yahoo_auction.scrape(
                keywords=search_keywords,
                max_pages_per_keyword=yahoo_cfg.get("max_pages_per_keyword", 3),
                request_interval_sec=yahoo_cfg.get("request_interval_sec", 2.5),
            )
            items.extend(yahoo_items)
            logger.info("yahoo_auction: collected %d items", len(yahoo_items))
        except ScraperError as exc:
            logger.warning("yahoo_auction: skipped — %s", exc)

    mercari_cfg = sources_cfg.get("mercari", {})
    if mercari_cfg.get("enabled") and search_keywords:
        try:
            mercari_items = mercari.scrape(
                keywords=search_keywords,
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
                sold_out_only=base_cfg.get("sold_out_only", False),
            )
            items.extend(base_items)
            logger.info("base_ec: collected %d items", len(base_items))
        except ScraperError as exc:
            logger.warning("base_ec: skipped — %s", exc)

    vintage_shops_cfg = sources_cfg.get("vintage_shops", {})
    if vintage_shops_cfg.get("enabled") and vintage_shops_cfg.get("shops"):
        try:
            shop_items = vintage_shops.scrape(
                shops=vintage_shops_cfg["shops"],
                request_interval_sec=vintage_shops_cfg.get("request_interval_sec", 2.5),
            )
            items.extend(shop_items)
            logger.info("vintage_shops: collected %d items", len(shop_items))
        except ScraperError as exc:
            logger.warning("vintage_shops: skipped — %s", exc)

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
    _fill_missing_brands(deduped, config.get("watch_brands", []))
    _fill_missing_category(deduped)
    brand_tagged = sum(1 for i in deduped if i.brand)
    category_tagged = sum(1 for i in deduped if i.category)
    logger.info(
        "collect_all: %d raw -> %d after dedupe (%d have a brand tag, %d have a category tag)",
        len(items),
        len(deduped),
        brand_tagged,
        category_tagged,
    )

    raw_dir = project_root / "data" / "raw"
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    saved_path = raw_dir / f"collected_{timestamp}.jsonl"
    save_jsonl(deduped, saved_path)

    return deduped, saved_path
