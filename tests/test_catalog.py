import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.pipeline.catalog import (
    build_model_index,
    catalog_brand_names,
    catalog_keywords,
    load_brand_catalog,
)

SAMPLE_CATALOG = [
    {"brand": "Champion", "tier": "regular", "models": ["リバースウィーブ", "T1011"]},
    {"brand": "Levi's", "tier": "regular", "models": ["501"]},
]


def test_catalog_keywords_builds_brand_model_combos():
    keywords = catalog_keywords(SAMPLE_CATALOG)
    assert keywords == ["Champion リバースウィーブ", "Champion T1011", "Levi's 501"]


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
