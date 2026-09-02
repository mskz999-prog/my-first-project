import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.pipeline.catalog import catalog_keywords, load_brand_catalog
from src.pipeline.collect import (
    QUICK_SAMPLE_TIERS,
    _build_search_keywords,
    _fill_missing_brands,
    _fill_missing_category,
    _fill_missing_model,
    _fill_missing_tags,
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


def test_quick_sample_tier_exists_in_the_real_catalog_with_expected_scale():
    # collect_all(quick=True) filters the real catalog down to just
    # QUICK_SAMPLE_TIERS ("regular"/定番レギュラー) — a regression guard
    # against that tier silently emptying out (e.g. every entry
    # retagged to a different tier name), which would shrink quick
    # mode's coverage to nothing.
    catalog = load_brand_catalog()
    quick_catalog = [e for e in catalog if e.get("tier") in QUICK_SAMPLE_TIERS]
    assert len(quick_catalog) >= 20


def test_quick_mode_catalog_filter_shrinks_keyword_count():
    # collect_all itself touches the network, so this exercises the same
    # filtering logic it applies (`tier in QUICK_SAMPLE_TIERS`) directly
    # against the real catalog, confirming quick mode is actually smaller.
    config = {"keywords": ["古着"], "watch_brands": []}
    full_catalog = load_brand_catalog()
    quick_catalog = [e for e in full_catalog if e.get("tier") in QUICK_SAMPLE_TIERS]

    full_keywords = _build_search_keywords(config, full_catalog)
    quick_keywords = _build_search_keywords(config, quick_catalog)

    assert 0 < len(quick_catalog) < len(full_catalog)
    assert len(quick_keywords) < len(full_keywords) / 2


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


def test_fill_missing_tags_matches_multiple_era_tags_at_once():
    # The real-world case that motivated this: a "501" listing is a
    # completely different item depending on whether it's 赤耳/ビッグE/
    # 66前期 or none of those — a single flat `model` tag can't capture
    # that, but several of these tags can legitimately co-occur.
    items = [
        MarketItem(source="mercari", title="Levi's 501 赤耳 ビッグE 66前期 デニム", price=180000, brand="Levi's", model="501"),
        MarketItem(source="yahoo_auction", title="Levi's 501 90年代 アメリカ製", price=8000, brand="Levi's", model="501"),
        MarketItem(source="mercari", title="ノーブランドのジーンズ", price=3000),
    ]
    _fill_missing_tags(items)

    assert set(items[0].tags) == {"赤耳", "ビッグE", "66前期"}
    assert set(items[1].tags) == {"90s", "アメリカ製"}
    assert items[2].tags == []


def test_fill_missing_tags_does_not_overwrite_manual_tags():
    items = [MarketItem(source="manual", title="Levi's 501 赤耳", price=50000, tags=["curated-tag"])]
    _fill_missing_tags(items)
    assert items[0].tags == ["curated-tag"]


def test_fill_missing_tags_ignores_negated_or_comparison_wording():
    # The exact false-positive pattern flagged as a real concern: a title
    # that mentions a rare tag only to say the item ISN'T that, or merely
    # resembles it, should not get the tag — these terms carry a 10-100x
    # price difference, so a naive substring match would badly mislead the
    # aggregated top_variants stats.
    items = [
        MarketItem(source="mercari", title="Levi's 501 501xxではない普通のデニム", price=6000, brand="Levi's"),
        MarketItem(source="mercari", title="Levi's 501 赤耳風の色落ち加工", price=4000, brand="Levi's"),
        MarketItem(source="mercari", title="フェイクビッグE 501 レプリカ品", price=3000, brand="Levi's"),
        MarketItem(source="mercari", title="本物の501xx 赤耳 ビッグE デニム", price=250000, brand="Levi's"),
    ]
    _fill_missing_tags(items)

    assert items[0].tags == []
    assert items[1].tags == []
    assert items[2].tags == []
    assert set(items[3].tags) == {"501XX", "赤耳", "ビッグE"}


def test_fill_missing_tags_confirms_when_a_second_clean_occurrence_exists():
    # One occurrence is disqualified ("赤耳ではない") but a second, clean
    # occurrence of the same keyword elsewhere in the title should still
    # confirm the tag — sellers sometimes repeat a term in both a comparison
    # and a genuine description.
    items = [
        MarketItem(source="mercari", title="赤耳ではないと思ったら実は赤耳でした 501", price=90000, brand="Levi's"),
    ]
    _fill_missing_tags(items)
    assert "赤耳" in items[0].tags


def test_brand_focused_filtering_narrows_catalog_to_one_brand():
    # collect_all(brands=[...]) touches the network, so this exercises the
    # same filtering logic it applies directly against the real catalog:
    # only Levi's entries survive, and the resulting keyword set is just
    # Levi's brand+model combos and aliases (no config.yaml keywords, no
    # item_keywords) — a focused run for e.g. checking era-tag accuracy.
    catalog = load_brand_catalog()
    focused = [e for e in catalog if e.get("brand", "").lower() in {"levi's"}]

    assert len(focused) == 1
    assert focused[0]["brand"] == "Levi's"

    keywords = catalog_keywords(focused)
    assert all(k.startswith("Levi's") or k in focused[0].get("aliases", []) for k in keywords)
    assert "Levi's 501" in keywords
