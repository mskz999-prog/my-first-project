"""Loads config/brand_catalog.yaml — the definitive-brand x representative-
model list used to (1) generate fine-grained search keywords for Yahoo/
Mercari so item/model-level trends can be analyzed, not just brand-level,
and (2) tag scraped items with brand/model after the fact.

Kept separate from config.yaml: the catalog is a large, mostly-static data
list (hundreds of entries) rather than a runtime tuning knob, and editing
it shouldn't require touching the pipeline's operational settings.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml

CATALOG_PATH = Path(__file__).resolve().parent.parent.parent / "config" / "brand_catalog.yaml"


def _load_yaml(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    with path.open("r", encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def load_brand_catalog(path: Path = CATALOG_PATH) -> list[dict[str, Any]]:
    """Returns a list of {"brand", "tier", "models", "aliases"?}.

    `aliases` (a list of common Japanese/katakana renderings, e.g. "Sears"
    -> ["シアーズ"]) is optional and only present for brands with a
    well-established katakana name — many Yahoo/Mercari listings and
    buyer searches use the katakana form, not the Roman-alphabet brand
    name, so relying on the English spelling alone under-collects and
    under-tags those brands' items.

    Returns an empty list (rather than raising) if the file is missing —
    the catalog is an enhancement, not a hard dependency; the pipeline
    should still run on config.yaml's watch_brands alone without it.
    """
    return _load_yaml(path).get("catalog", [])


def load_item_keywords(path: Path = CATALOG_PATH) -> list[dict[str, Any]]:
    """Returns a list of {"term": str, "category": str} — brand-agnostic
    garment/style search terms (e.g. "ネルシャツ", "フライトジャケット")
    that wouldn't be found by any brand+model combo, since a lot of
    real resale volume is listed without a readable brand tag at all.
    """
    return _load_yaml(path).get("item_keywords", [])


def catalog_keywords(catalog: list[dict[str, Any]]) -> list[str]:
    """One "<brand> <model>" search keyword per catalog entry, plus one
    keyword per brand alias (standalone, not crossed with every model —
    that would multiply keyword count for ~180 aliased brands) so
    katakana-titled listings for aliased brands get surfaced too.
    """
    keywords: list[str] = []
    for entry in catalog:
        brand = entry.get("brand")
        if not brand:
            continue
        for model in entry.get("models", []):
            keywords.append(f"{brand} {model}")
        keywords.extend(entry.get("aliases", []))
    return keywords


def item_keyword_terms(item_keywords: list[dict[str, Any]]) -> list[str]:
    return [ik["term"] for ik in item_keywords if ik.get("term")]


def catalog_brand_names(catalog: list[dict[str, Any]]) -> list[str]:
    return [entry["brand"] for entry in catalog if entry.get("brand")]


def build_model_index(catalog: list[dict[str, Any]]) -> dict[str, list[str]]:
    """brand -> [model, ...], for post-hoc title-matching tagging."""
    return {
        entry["brand"]: list(entry.get("models", []))
        for entry in catalog
        if entry.get("brand")
    }


def build_alias_index(catalog: list[dict[str, Any]]) -> dict[str, list[str]]:
    """brand -> [alias, ...], for post-hoc title-matching tagging against
    katakana-titled listings (see load_brand_catalog's docstring). Only
    brands with at least one alias appear in the returned dict.
    """
    return {
        entry["brand"]: list(entry["aliases"])
        for entry in catalog
        if entry.get("brand") and entry.get("aliases")
    }
