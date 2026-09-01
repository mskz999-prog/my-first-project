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


def load_brand_catalog(path: Path = CATALOG_PATH) -> list[dict[str, Any]]:
    """Returns a list of {"brand": str, "tier": str, "models": list[str]}.

    Returns an empty list (rather than raising) if the file is missing —
    the catalog is an enhancement, not a hard dependency; the pipeline
    should still run on config.yaml's watch_brands alone without it.
    """
    if not path.exists():
        return []
    with path.open("r", encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}
    return data.get("catalog", [])


def catalog_keywords(catalog: list[dict[str, Any]]) -> list[str]:
    """One "<brand> <model>" search keyword per catalog entry."""
    keywords: list[str] = []
    for entry in catalog:
        brand = entry.get("brand")
        if not brand:
            continue
        for model in entry.get("models", []):
            keywords.append(f"{brand} {model}")
    return keywords


def catalog_brand_names(catalog: list[dict[str, Any]]) -> list[str]:
    return [entry["brand"] for entry in catalog if entry.get("brand")]


def build_model_index(catalog: list[dict[str, Any]]) -> dict[str, list[str]]:
    """brand -> [model, ...], for post-hoc title-matching tagging."""
    return {
        entry["brand"]: list(entry.get("models", []))
        for entry in catalog
        if entry.get("brand")
    }
