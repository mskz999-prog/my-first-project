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

from src.pipeline.catalog import (
    build_alias_index,
    build_model_index,
    catalog_brand_names,
    catalog_keywords,
    item_keyword_terms,
    load_brand_catalog,
    load_item_keywords,
)
from src.pipeline.normalize import MarketItem, dedupe, load_manual_csv, save_jsonl
from src.scrapers import base_ec, mercari, vintage_shops, yahoo_auction
from src.scrapers.base_scraper import ScraperError

logger = logging.getLogger(__name__)

# brand_catalog.yaml tier(s) swept in quick mode: just the "regular" tier
# (定番レギュラー — Champion, Levi's, Patagonia, Nike, etc., ~50 brands)
# instead of the full catalog's ~260 brands across all 7 tiers. Combined
# with item_keywords (kept in full — see collect_all), this is the
# "定番レギュラー + アイテムベース" sample requested for fast iteration on
# brand_catalog.yaml/scraper changes — see the --quick CLI flag in
# src/main.py. Tier-based rather than a fixed brand list so it stays in
# sync automatically as brands are added to/removed from that tier.
QUICK_SAMPLE_TIERS = {"regular"}


def _build_search_keywords(
    config: dict[str, Any],
    catalog: list[dict[str, Any]] | None = None,
    item_keywords: list[dict[str, Any]] | None = None,
) -> list[str]:
    """Base keywords + one "<brand> 古着" combo per watched brand, plus
    catalog-derived keywords: one "<brand> <model>" combo and one keyword
    per brand alias (see catalog_keywords), plus one standalone keyword per
    config/brand_catalog.yaml item_keywords entry.

    The base keyword list alone (e.g. plain "古着", "ヴィンテージ") tends to
    surface whatever is most generically popular; the per-brand combo
    ensures every brand in watch_brands gets its own dedicated search. The
    catalog combos go a level deeper — a specific model/型番 per search —
    which is what makes item-level (not just brand-level) trend analysis
    possible: a generic "Champion 古着" search gets buried in irrelevant
    results, but "Champion リバースウィーブ" surfaces exactly that model.
    item_keywords covers the flip side — garment/style terms
    ("ネルシャツ", "フライトジャケット") that show up in listings with no
    readable brand tag at all, so no brand+model combo would ever find them.
    """
    keywords = list(dict.fromkeys(config.get("keywords", [])))  # de-dupe, keep order
    for brand in config.get("watch_brands", []):
        combo = f"{brand} 古着"
        if combo not in keywords:
            keywords.append(combo)
    for combo in catalog_keywords(catalog or []):
        if combo not in keywords:
            keywords.append(combo)
    for term in item_keyword_terms(item_keywords or []):
        if term not in keywords:
            keywords.append(term)
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
    "キャップ・帽子": ("キャップ", "帽子", "ハット", "cap", "hat"),
}

# Era/variant descriptor vocabulary — the layer of detail sitting on top
# of `model` (e.g. Levi's 501) that actually drives vintage-denim pricing:
# 501xx vs. ビッグE vs. 赤耳 vs. 66前期/後期 vs. 黒カン vs. 90年代アメリカ製
# are all different things a "501" can be, and a flat model tag alone
# can't distinguish an item worth 3,000円 from one worth 300,000円 the
# way these terms can. Sellers routinely put them straight in the title
# as their own search keywords, so unlike brand/category/model (each item
# gets one), an item can legitimately carry several of these at once —
# see _fill_missing_tags, which appends every match instead of stopping
# at the first.
ERA_TAG_KEYWORDS: dict[str, tuple[str, ...]] = {
    "501XX": ("501xx",),
    "ダブルネーム": ("ダブルネーム",),
    "赤耳": ("赤耳", "赤みみ"),
    "黒耳": ("黒耳", "黒みみ"),
    "ビッグE": ("ビッグe", "ビッグイー", "big e"),
    "スモールe": ("スモールe", "small e"),
    "赤タブ": ("赤タブ",),
    "オレンジタブ": ("オレンジタブ",),
    "66前期": ("66前期",),
    "66後期": ("66後期",),
    "黒カン": ("黒カン", "黒缶"),
    "大戦モデル": ("大戦モデル", "大戦モデル", "wwii"),
    "セルビッジ": ("セルビッジ", "セルヴィッジ", "selvedge", "selvage"),
    "復刻": ("復刻", "リプロダクション", "リバイバル", "lvc"),
    "デッドストック": ("デッドストック", "dead stock", "新品未使用"),
    "日本製": ("日本製", "made in japan"),
    "アメリカ製": ("アメリカ製", "usa製", "made in usa"),
    "40s": ("40s", "40's", "1940s", "40年代"),
    "50s": ("50s", "50's", "1950s", "50年代"),
    "60s": ("60s", "60's", "1960s", "60年代"),
    "70s": ("70s", "70's", "1970s", "70年代"),
    "80s": ("80s", "80's", "1980s", "80年代"),
    "90s": ("90s", "90's", "1990s", "90年代"),
    "00s": ("00s", "00's", "2000s", "00年代", "ゼロ年代"),
}

# Tags that assert genuine vintage/original-era authenticity — as opposed
# to 復刻/デッドストック/日本製/アメリカ製, which describe a real attribute
# regardless of whether the garment is old or a modern remake. When a title
# also signals "this is a modern reproduction" (see
# _REPRODUCTION_INDICATOR_KEYWORDS below), these get stripped even though
# the era keyword itself matched cleanly — see _fill_missing_tags.
_AUTHENTICITY_TAGS = frozenset(
    {
        "501XX", "ダブルネーム", "赤耳", "黒耳", "ビッグE", "スモールe",
        "赤タブ", "オレンジタブ", "66前期", "66後期", "黒カン", "大戦モデル",
        "セルビッジ", "40s", "50s", "60s", "70s", "80s", "90s", "00s",
    }
)

# Real-world case that motivated this: Levi's officially sells reissue
# lines (LVC etc.) using the historical year/era straight in the product
# name — "1966モデル 501", "1947復刻" — so a title can cleanly match "60s"
# or "66後期" while being a brand-new, mass-produced remake, not the
# genuine article the tag implies. This is a title-wide check (unlike
# _TAG_DISQUALIFYING_SUFFIXES/PREFIXES's local window) since a "復刻"
# mention anywhere in the title describes the whole product, not just the
# word next to it.
_REPRODUCTION_INDICATOR_KEYWORDS = ("復刻", "リプロダクション", "リバイバル", "lvc")

# Multi-item lot/bundle listings ("60〜90s 501 まとめ売り 3本セット") quote
# one price for several garments of possibly-mixed authenticity and era —
# treating that price as representative of any single tag it happens to
# mention (era tags especially) skews the aggregate badly, so these are
# excluded from authenticity tagging the same way reproductions are.
_BUNDLE_INDICATOR_KEYWORDS = ("まとめ売り", "まとめて", "セット販売", "本セット", "点セット", "福袋")


# Qualifiers that mean a nearby keyword match is describing what the item
# is *not*, or only resembles — "501xxではない" (not a 501XX), "赤耳風"
# (red-selvedge-*ish*), "フェイクビッグE" (fake Big E). These era tags
# carry huge price implications (a genuine ビッグE can be worth 10-100x an
# ordinary one), so a plain substring match without this check would
# regularly mislabel comparison/disclaimer text as a confirmed attribute.
# Suffix qualifiers (checked just after a match) vs. prefix qualifiers
# (checked just before) reflect where each actually appears in Japanese —
# "風"/"っぽい" trail the noun, "偽"/"フェイク" lead it.
_TAG_DISQUALIFYING_SUFFIXES = (
    "ではない", "じゃない", "でない", "ではありません", "風", "っぽい",
    "みたい", "タイプ", "レプリカ", "コピー", "もどき", "テイスト",
    "インスパイア", "オマージュ", "風合い",
)
_TAG_DISQUALIFYING_PREFIXES = ("偽", "フェイク", "ニセ", "非")
_TAG_CONTEXT_WINDOW = 8


def _era_tag_context_disqualifies(title_lower: str, match_start: int, match_end: int) -> bool:
    after = title_lower[match_end : match_end + _TAG_CONTEXT_WINDOW]
    before = title_lower[max(0, match_start - _TAG_CONTEXT_WINDOW) : match_start]
    if any(q in after for q in _TAG_DISQUALIFYING_SUFFIXES):
        return True
    if any(q in before for q in _TAG_DISQUALIFYING_PREFIXES):
        return True
    return False


def _title_confirms_era_tag(title_lower: str, keywords: tuple[str, ...]) -> bool:
    """True if any occurrence of any of `keywords` in the title isn't
    immediately disqualified by a negation/comparison word nearby. A
    keyword can appear more than once (or under more than one alias) —
    only one clean, unqualified occurrence is needed to confirm the tag.
    """
    for kw in keywords:
        start = 0
        while True:
            idx = title_lower.find(kw, start)
            if idx == -1:
                break
            if not _era_tag_context_disqualifies(title_lower, idx, idx + len(kw)):
                return True
            start = idx + 1
    return False


def _fill_missing_tags(items: list[MarketItem]) -> None:
    """Best-effort era/variant descriptor tagging (see ERA_TAG_KEYWORDS) —
    a finer layer than _fill_missing_model, since e.g. all of "Levi's 501",
    "Levi's 501 赤耳 66前期", and "Levi's 501 90年代アメリカ製" share the
    same `model` but are wildly different items to a vintage buyer.

    Unlike brand/category/model, multiple tags can legitimately apply to
    one item at once (a single listing can be 赤耳 *and* ビッグE *and*
    66前期), so every matching keyword is appended rather than stopping at
    the first hit. Skips items that already have manual tags — a manual
    CSV row's tags are curated by hand and trusted as-is, not merged with
    inferred ones.

    This is still title-text pattern matching, not verified authentication
    — a seller can misdescribe an item (honestly or not) and the tag will
    still apply. _era_tag_context_disqualifies filters the most common
    local false-positive pattern (negation/comparison wording immediately
    next to the keyword); reproduction lines and multi-item lots are a
    second, title-wide pattern (see _AUTHENTICITY_TAGS above) that strips
    the authenticity-implying tags even when the keyword match itself was
    clean — a title can say "1966モデル 501" with zero negation wording
    while still being a brand-new LVC reissue, not a real 1966 pair.
    report_generator's prompt carries the remaining residual risk ("this
    is seller-claimed, not verified") through to the report text.
    """
    for item in items:
        if item.tags:
            continue
        title_lower = item.title.lower()
        matched = [
            tag
            for tag, keywords in ERA_TAG_KEYWORDS.items()
            if _title_confirms_era_tag(title_lower, keywords)
        ]
        if matched and (
            any(kw in title_lower for kw in _REPRODUCTION_INDICATOR_KEYWORDS)
            or any(kw in title_lower for kw in _BUNDLE_INDICATOR_KEYWORDS)
        ):
            matched = [tag for tag in matched if tag not in _AUTHENTICITY_TAGS]
        if matched:
            item.tags = matched


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


def _fill_missing_brands(
    items: list[MarketItem],
    watch_brands: list[str],
    brand_aliases: dict[str, list[str]] | None = None,
) -> None:
    """Best-effort brand tagging by matching watch_brands (and their
    Japanese/katakana aliases) against the title.

    None of the scrapers extract a structured brand field (Yahoo/Mercari/
    vintage-shop titles are free text), so every scraped item's `brand`
    starts out None — only manually-entered CSV rows had one. That left
    _quick_stats' brand breakdown effectively empty even with thousands of
    real items collected, so the report had nothing concrete to say about
    watch_brands and fell back to generic, ungrounded-sounding text. This
    fills `brand` in place wherever a watched brand's name (case-insensitive)
    appears in the title and no brand was already set (e.g. from a manual
    CSV, which is trusted as-is and left untouched).

    `watch_brands` is expected to already include the brand_catalog.yaml
    brand names (see collect_all) so this also tags items against the much
    larger catalog, not just the handful of headline watch_brands in
    config.yaml. `brand_aliases` (brand -> katakana names, from
    catalog.build_alias_index) is checked as a fallback when the English
    brand name itself doesn't appear — many Japanese-titled listings write
    the brand in katakana only (e.g. "シアーズ"), which would never match
    the English "Sears" substring check alone. Either way `item.brand` is
    always set to the canonical (English) brand name for consistency.
    """
    if not watch_brands:
        return
    lowered_brands = [(b, b.lower()) for b in watch_brands]
    lowered_aliases = [
        (brand, alias.lower())
        for brand, aliases in (brand_aliases or {}).items()
        for alias in aliases
    ]
    for item in items:
        if item.brand:
            continue
        title_lower = item.title.lower()
        for original, lowered in lowered_brands:
            if lowered in title_lower:
                item.brand = original
                break
        else:
            for original, lowered in lowered_aliases:
                if lowered in title_lower:
                    item.brand = original
                    break


def _fill_missing_model(items: list[MarketItem], model_index: dict[str, list[str]]) -> None:
    """Best-effort model/型番 tagging: only attempted for items that already
    have a brand (from _fill_missing_brands or a manual CSV) matching a
    brand_catalog.yaml entry, and only matches that brand's own model list
    — a bare "501" or "MA-1" is too ambiguous to match brand-agnostically,
    but is unambiguous once we know the item is already tagged as Levi's
    or Alpha Industries. This is what enables item/model-level trend
    breakdowns (see report_generator._quick_stats' top_models), not just
    brand-level ones.
    """
    if not model_index:
        return
    for item in items:
        if item.model or not item.brand:
            continue
        models = model_index.get(item.brand)
        if not models:
            continue
        title_lower = item.title.lower()
        for model in models:
            if model.lower() in title_lower:
                item.model = model
                break


def collect_all(
    config: dict[str, Any],
    project_root: Path,
    quick: bool = False,
    brands: list[str] | None = None,
) -> tuple[list[MarketItem], Path]:
    """Collect from every enabled source and return (items, saved_jsonl_path).

    `quick=True` restricts config/brand_catalog.yaml to QUICK_SAMPLE_TIERS
    (just "regular"/定番レギュラー) while keeping item_keywords in full —
    the "定番レギュラー + アイテムベース" sample — so a full collect+report
    cycle finishes in well under an hour instead of several, for iterating
    on catalog/scraper changes without waiting for the full ~450-combo,
    7-tier sweep every time.

    `brands` (a list of exact brand_catalog.yaml brand names, e.g.
    ["Levi's"]) narrows further and differently: an ad-hoc single/few-brand
    test run, e.g. to check era/variant tagging accuracy against real
    listings for one brand without the noise or runtime of everything
    else. When set, this *replaces* the whole keyword set with just that
    brand's catalog combos + aliases (no config.yaml keywords/watch_brands,
    no item_keywords) — takes priority over `quick`, since the point is a
    narrow, fast, directly-inspectable run.
    """
    items: list[MarketItem] = []
    sources_cfg = config.get("sources", {})
    catalog = load_brand_catalog()
    item_keywords = load_item_keywords()
    if brands:
        wanted = {b.lower() for b in brands}
        catalog = [e for e in catalog if e.get("brand", "").lower() in wanted]
        search_keywords = catalog_keywords(catalog)
        logger.info(
            "collect_all: brand-focused mode — %s -> %d catalog entries, %d keywords",
            brands,
            len(catalog),
            len(search_keywords),
        )
    else:
        if quick:
            full_count = len(catalog)
            catalog = [e for e in catalog if e.get("tier") in QUICK_SAMPLE_TIERS]
            logger.info(
                "collect_all: quick mode — catalog restricted to %d/%d brands (tiers: %s)",
                len(catalog),
                full_count,
                ", ".join(sorted(QUICK_SAMPLE_TIERS)),
            )
        search_keywords = _build_search_keywords(config, catalog, item_keywords)
    logger.info(
        "collect_all: %d total search keywords (%d brand_catalog.yaml entries, "
        "%d item_keywords entries)",
        len(search_keywords),
        len(catalog),
        len(item_keywords) if not brands else 0,
    )

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
    watch_brands = list(dict.fromkeys(config.get("watch_brands", []) + catalog_brand_names(catalog)))
    _fill_missing_brands(deduped, watch_brands, build_alias_index(catalog))
    _fill_missing_model(deduped, build_model_index(catalog))
    _fill_missing_category(deduped)
    _fill_missing_tags(deduped)
    brand_tagged = sum(1 for i in deduped if i.brand)
    model_tagged = sum(1 for i in deduped if i.model)
    category_tagged = sum(1 for i in deduped if i.category)
    era_tagged = sum(1 for i in deduped if i.tags)
    logger.info(
        "collect_all: %d raw -> %d after dedupe (%d have a brand tag, %d have a model tag, "
        "%d have a category tag, %d have an era/variant tag)",
        len(items),
        len(deduped),
        brand_tagged,
        model_tagged,
        category_tagged,
        era_tagged,
    )

    raw_dir = project_root / "data" / "raw"
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    saved_path = raw_dir / f"collected_{timestamp}.jsonl"
    save_jsonl(deduped, saved_path)

    return deduped, saved_path
