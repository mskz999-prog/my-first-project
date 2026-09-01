import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.pipeline.catalog import (
    build_alias_index,
    build_model_index,
    catalog_brand_names,
    catalog_keywords,
    item_keyword_terms,
    load_brand_catalog,
    load_item_keywords,
)

SAMPLE_CATALOG = [
    {"brand": "Champion", "tier": "regular", "models": ["リバースウィーブ", "T1011"]},
    {"brand": "Levi's", "tier": "regular", "models": ["501"]},
]

SAMPLE_CATALOG_WITH_ALIASES = [
    {"brand": "Sears", "tier": "vintage-specialty", "models": ["フランネルシャツ"], "aliases": ["シアーズ"]},
    {"brand": "Levi's", "tier": "regular", "models": ["501"]},
]


def test_catalog_keywords_builds_brand_model_combos():
    keywords = catalog_keywords(SAMPLE_CATALOG)
    assert keywords == ["Champion リバースウィーブ", "Champion T1011", "Levi's 501"]


def test_catalog_keywords_includes_standalone_alias_keyword():
    keywords = catalog_keywords(SAMPLE_CATALOG_WITH_ALIASES)
    assert "Sears フランネルシャツ" in keywords
    assert "シアーズ" in keywords  # alias itself, not crossed with every model
    assert "Levi's 501" in keywords


def test_build_alias_index_only_includes_brands_with_aliases():
    index = build_alias_index(SAMPLE_CATALOG_WITH_ALIASES)
    assert index == {"Sears": ["シアーズ"]}


def test_item_keyword_terms_extracts_plain_terms():
    item_keywords = [{"term": "ネルシャツ", "category": "シャツ"}, {"term": "カバーオール", "category": "オーバーオール"}]
    assert item_keyword_terms(item_keywords) == ["ネルシャツ", "カバーオール"]


def test_catalog_brand_names_lists_each_brand_once():
    assert catalog_brand_names(SAMPLE_CATALOG) == ["Champion", "Levi's"]


def test_build_model_index_maps_brand_to_models():
    index = build_model_index(SAMPLE_CATALOG)
    assert index == {"Champion": ["リバースウィーブ", "T1011"], "Levi's": ["501"]}


def test_load_brand_catalog_missing_file_returns_empty_list():
    assert load_brand_catalog(Path("/nonexistent/brand_catalog.yaml")) == []


def test_real_brand_catalog_loads_and_has_expected_scale():
    # The actual shipped config/brand_catalog.yaml — a regression guard
    # against it accidentally being emptied or malformed, and a rough
    # sanity check that it's still in the "several hundred combos" range
    # it was designed for (broad item/model-level search coverage).
    catalog = load_brand_catalog()
    assert len(catalog) > 100
    total_combos = sum(len(entry["models"]) for entry in catalog)
    assert total_combos >= 300
    brands = catalog_brand_names(catalog)
    assert len(brands) == len(set(brands))  # no duplicate brand entries

    # A handful of brands specifically flagged as missing in feedback —
    # regression guard against them silently disappearing again.
    for expected_brand in (
        "Big Mac", "Arrow", "Towncraft", "Sears", "Montgomery Ward", "Five Brothers", "Delmar",
        "Santa Cruz", "Thrasher", "Birdhouse",
    ):
        assert expected_brand in brands


def test_real_brand_catalog_has_katakana_aliases_for_most_brands():
    # Many Yahoo/Mercari listings and buyer searches use the katakana
    # brand name, not the Roman-alphabet one — a regression guard against
    # the alias data (added specifically to fix under-collection/under-
    # tagging of those listings) being emptied out again.
    catalog = load_brand_catalog()
    aliased = build_alias_index(catalog)
    assert len(aliased) >= 100
    assert aliased["Sears"] == ["シアーズ"]


def test_real_item_keywords_load_and_have_categories():
    item_keywords = load_item_keywords()
    assert len(item_keywords) >= 30
    terms = item_keyword_terms(item_keywords)
    for expected_term in ("ネルシャツ", "フライトジャケット", "ダービージャケット", "ヴィンテージスウェット", "カバーオール"):
        assert expected_term in terms
    assert all(ik.get("category") for ik in item_keywords)
