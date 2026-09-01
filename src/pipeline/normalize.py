"""Common schema for market data collected from every source, plus
normalization / dedupe helpers used before handing data to the report
generator.
"""
from __future__ import annotations

import csv
import json
from collections import defaultdict
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable, Optional


@dataclass
class MarketItem:
    source: str                       # "mercari" | "yahoo_auction" | "base_ec" | "manual"
    title: str
    price: Optional[int] = None       # sold / listed price in JPY
    is_sold: bool = True
    brand: Optional[str] = None
    model: Optional[str] = None       # representative model/型番 from config/brand_catalog.yaml
    category: Optional[str] = None
    size: Optional[str] = None
    condition: Optional[str] = None
    tags: list[str] = field(default_factory=list)
    listed_at: Optional[str] = None   # ISO8601
    sold_at: Optional[str] = None     # ISO8601
    time_to_sell_hours: Optional[float] = None
    url: Optional[str] = None
    shop_name: Optional[str] = None   # for BASE listings
    collected_at: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )

    def dedupe_key(self) -> tuple:
        return (self.source, self.url or self.title, self.price)


def dedupe(items: Iterable[MarketItem]) -> list[MarketItem]:
    seen: set[tuple] = set()
    result: list[MarketItem] = []
    for item in items:
        key = item.dedupe_key()
        if key in seen:
            continue
        seen.add(key)
        result.append(item)
    return result


def save_jsonl(items: Iterable[MarketItem], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        for item in items:
            f.write(json.dumps(asdict(item), ensure_ascii=False) + "\n")


def load_jsonl(path: Path) -> list[MarketItem]:
    if not path.exists():
        return []
    items = []
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            items.append(MarketItem(**json.loads(line)))
    return items


def load_manual_csv(path: Path, source: str = "manual") -> list[MarketItem]:
    """Load a manually-exported CSV as a fallback / supplement data source.

    Expected columns (extra columns are ignored, missing ones default to
    None/empty): title, price, is_sold, brand, model, category, size,
    condition, tags (comma-separated), listed_at, sold_at, url, shop_name.
    """
    if not path.exists():
        return []
    items: list[MarketItem] = []
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            tags_raw = (row.get("tags") or "").strip()
            price_raw = (row.get("price") or "").strip()
            items.append(
                MarketItem(
                    source=row.get("source") or source,
                    title=row.get("title", "").strip(),
                    price=int(price_raw) if price_raw.isdigit() else None,
                    is_sold=str(row.get("is_sold", "true")).lower() not in ("false", "0", ""),
                    brand=(row.get("brand") or "").strip() or None,
                    model=(row.get("model") or "").strip() or None,
                    category=(row.get("category") or "").strip() or None,
                    size=(row.get("size") or "").strip() or None,
                    condition=(row.get("condition") or "").strip() or None,
                    tags=[t.strip() for t in tags_raw.split(",") if t.strip()],
                    listed_at=(row.get("listed_at") or "").strip() or None,
                    sold_at=(row.get("sold_at") or "").strip() or None,
                    url=(row.get("url") or "").strip() or None,
                    shop_name=(row.get("shop_name") or "").strip() or None,
                )
            )
    return items


def to_summary_json(items: list[MarketItem], max_items: int = 400) -> str:
    """Serialize (a capped number of) items to compact JSON for the LLM prompt.

    Capping keeps the prompt within a reasonable token budget even when a
    scraper returns a large volume of listings. The cap is split evenly
    *per source* (not one global top-N ranking) — a source that happens to
    return far more raw volume than the others (e.g. one vintage-shop
    Shopify store with thousands of SKUs, vs. a scraper that's only
    surfacing a couple hundred usable items) would otherwise crowd out
    every other source's items from the sample entirely, skewing the
    analysis toward whichever source scraped the most rather than what's
    actually representative. Within each source's allotment, the most
    information-dense items (sold, with price and brand) are prioritized.
    """
    def score(item: MarketItem) -> tuple:
        return (
            item.is_sold,
            item.brand is not None,
            item.price is not None,
        )

    by_source: dict[str, list[MarketItem]] = defaultdict(list)
    for item in items:
        by_source[item.source].append(item)

    per_source_cap = max(1, max_items // len(by_source)) if by_source else max_items

    ranked: list[MarketItem] = []
    for source_items in by_source.values():
        ranked.extend(sorted(source_items, key=score, reverse=True)[:per_source_cap])

    return json.dumps([asdict(i) for i in ranked], ensure_ascii=False)
