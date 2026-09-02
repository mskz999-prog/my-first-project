import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.pipeline.catalog import catalog_brand_names, load_brand_catalog
from src.pipeline.collect import (
    QUICK_SAMPLE_BRANDS,
    _build_search_keywords,
    _fill_missing_brands,
    _fill_missing_category,
    _fill_missing_model,
)
from src.pipeline.normalize import MarketItem


def test_fill_missing_brands_matches_title_case_insensitively():
    items = [
        MarketItem(source="mercari", title="90s Champion リバースウィーブ 刺繍ロゴ", price=8000),
        MarketItem(source="yahoo_auction", title="levi's 501 66前期 デニム", price=12000),
        MarketItem(source="vintage_shop", title="ノーブランド チェックシャツ", price=3000),
    ]
    _fill_missing_brands(items, ["Champion", "Levi's", "Patagonia"])

    assert items[0].brand == "Champion"
    assert items[1].brand == "Levi's"
    assert items[2].brand is None


def test_fill_missing_brands_does_not_overwrite_existing_brand():
    items = [MarketItem(source="manual", title="Champion スウェット", price=1000, brand="ExistingBrand")]
    _fill_missing_brands(items, ["Champion"])
    assert items[0].brand == "ExistingBrand"


def test_fill_missing_brands_falls_back_to_katakana_alias():
    # Real-world case that motivated adding aliases: a listing titled
    # entirely in katakana ("シアーズ") never contains the English "Sears"
    # substring, so the plain watch_brands check alone always misses it.
    items = [
        MarketItem(source="mercari", title="シアーズ フランネルシャツ 90s", price=4000),
        MarketItem(source="yahoo_auction", title="Sears flannel shirt", price=3500),
    ]
    _fill_missing_brands(items, ["Sears"], {"Sears": ["シアーズ"]})

    assert items[0].brand == "Sears"  # canonical name even though matched via alias
    assert items[1].brand == "Sears"  # plain English match still takes priority


def test_fill_missing_category_matches_genre_keywords():
    items = [
        MarketItem(source="mercari", title="90s Champion リバースウィーブ スウェット", price=8000),
        MarketItem(source="yahoo_auction", title="Carhartt コンビオール 40s", price=200000),
        MarketItem(source="vintage_shop", title="ノーカテゴリのアイテム", price=1000),
    ]
    _fill_missing_category(items)

    assert items[0].category == "スウェット"
    assert items[1].category == "オーバーオール"
    assert items[2].category is None


def test_fill_missing_category_does_not_overwrite_existing_category():
    items = [MarketItem(source="manual", title="Champion スウェット", price=1000, category="ExistingCategory")]
    _fill_missing_category(items)
    assert items[0].category == "ExistingCategory"


def test_build_search_keywords_adds_brand_combos():
    config = {"keywords": ["古着"], "watch_brands": ["Champion", "Levi's"]}
    keywords = _build_search_keywords(config)
    assert "古着" in keywords
    assert "Champion 古着" in keywords
    assert "Levi's 古着" in keywords


def test_build_search_keywords_adds_catalog_model_combos():
    config = {"keywords": ["古着"], "watch_brands": []}
    catalog = [{"brand": "Champion", "tier": "regular", "models": ["リバースウィーブ", "T1011"]}]
    keywords = _build_search_keywords(config, catalog)
    assert "Champion リバースウィーブ" in keywords
    assert "Champion T1011" in keywords


def test_build_search_keywords_adds_item_keyword_terms():
    config = {"keywords": ["古着"], "watch_brands": []}
    item_keywords = [{"term": "ネルシャツ", "category": "シャツ"}, {"term": "フライトジャケット", "category": "ジャケット"}]
    keywords = _build_search_keywords(config, None, item_keywords)
    assert "ネルシャツ" in keywords
    assert "フライトジャケット" in keywords


def test_quick_sample_brands_all_exist_in_the_real_catalog():
    # collect_all(quick=True) filters the real catalog down to just
    # QUICK_SAMPLE_BRANDS — a regression guard against that list drifting
    # out of sync with brand_catalog.yaml (e.g. a renamed/removed brand),
    # which would silently shrink quick mode's coverage to nothing.
    brands = set(catalog_brand_names(load_brand_catalog()))
    missing = [b for b in QUICK_SAMPLE_BRANDS if b not in brands]
    assert missing == []


def test_quick_mode_catalog_filter_shrinks_keyword_count():
    # collect_all itself touches the network, so this exercises the same
    # filtering logic it applies (`brand in QUICK_SAMPLE_BRANDS`) directly
    # against the real catalog, confirming quick mode is actually smaller.
    config = {"keywords": ["古着"], "watch_brands": []}
    full_catalog = load_brand_catalog()
    quick_catalog = [e for e in full_catalog if e.get("brand") in QUICK_SAMPLE_BRANDS]

    full_keywords = _build_search_keywords(config, full_catalog)
    quick_keywords = _build_search_keywords(config, quick_catalog)

    assert len(quick_catalog) == len(QUICK_SAMPLE_BRANDS)
    assert len(quick_keywords) < len(full_keywords) / 4


def test_fill_missing_model_only_matches_within_the_items_own_brand():
    items = [
        MarketItem(source="mercari", title="Champion 90s リバースウィーブ 刺繍ロゴ", price=8000, brand="Champion"),
        MarketItem(source="mercari", title="ノーブランド リバースウィーブ風 スウェット", price=3000, brand=None),
        MarketItem(source="manual", title="Levi's 501 66前期", price=12000, brand="Levi's", model="already-set"),
    ]
    model_index = {"Champion": ["リバースウィーブ", "T1011"], "Levi's": ["501", "505"]}
    _fill_missing_model(items, model_index)

    assert items[0].model == "リバースウィーブ"
    assert items[1].model is None  # no brand tagged, so model matching is skipped
    assert items[2].model == "already-set"  # pre-set value is never overwritten
