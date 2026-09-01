import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.pipeline.collect import (
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
