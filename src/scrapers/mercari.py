"""Mercari (jp.mercari.com) sold-item scraper — BEST EFFORT / FRAGILE.

Mercari does not offer a public API and actively hardens its site against
automated access (its official mobile/web clients sign search requests
with a DPoP proof-of-possession token that changes with app releases).
Reverse-engineering that signing scheme is out of scope here, and would be
fragile even if implemented.

Instead, this module scrapes the public search results page HTML for a
`status=sold_out` search and looks for the embedded Next.js data payload
(`<script id="__NEXT_DATA__" type="application/json">`) that Mercari's
web frontend hydrates from — a common, comparatively more stable pattern
for Next.js sites than reverse-engineering the signed API directly.

This WILL break whenever Mercari changes its frontend build, and is
expected to require maintenance. When it fails, `scrape()` raises
ScraperError, which the orchestrator (pipeline/collect.py) catches — the
pipeline falls back to whatever is in data/manual/ for Mercari data
instead of stopping the whole run.

Before relying on this in production, verify current behavior against a
live page and adjust `_extract_items_from_next_data` to match the current
JSON shape.
"""
from __future__ import annotations

import json
import logging
import urllib.parse
from typing import Any, Optional

from bs4 import BeautifulSoup

from src.pipeline.normalize import MarketItem
from src.scrapers.base_scraper import RateLimitedSession, ScraperError

logger = logging.getLogger(__name__)

SEARCH_URL = "https://jp.mercari.com/search"


def _build_url(keyword: str, status: str) -> str:
    params = {"keyword": keyword, "status": status}
    return f"{SEARCH_URL}?{urllib.parse.urlencode(params)}"


def _find_next_data(html: str) -> Optional[dict[str, Any]]:
    soup = BeautifulSoup(html, "lxml")
    script = soup.find("script", id="__NEXT_DATA__")
    if not script or not script.string:
        return None
    try:
        return json.loads(script.string)
    except json.JSONDecodeError:
        return None


def _walk_for_item_lists(node: Any) -> list[dict[str, Any]]:
    """Recursively search the Next.js data tree for lists of item-shaped dicts.

    Mercari nests search results several levels deep inside
    `props.pageProps...`; rather than hardcode a brittle exact path, walk
    the tree and collect any list whose dicts look like product items
    (have both an id/name-like key and a price-like key).
    """
    found: list[dict[str, Any]] = []

    def looks_like_item(d: dict[str, Any]) -> bool:
        keys = {k.lower() for k in d.keys()}
        has_name = bool({"name", "title"} & keys)
        has_price = bool({"price"} & keys)
        return has_name and has_price

    def walk(n: Any) -> None:
        if isinstance(n, dict):
            if looks_like_item(n):
                found.append(n)
            for v in n.values():
                walk(v)
        elif isinstance(n, list):
            for v in n:
                walk(v)

    walk(node)
    return found


def _to_market_item(raw: dict[str, Any]) -> Optional[MarketItem]:
    title = raw.get("name") or raw.get("title")
    price = raw.get("price")
    item_id = raw.get("id") or raw.get("itemId")
    if not title or price is None:
        return None
    try:
        price_int = int(price)
    except (TypeError, ValueError):
        price_int = None

    status = str(raw.get("status", "")).lower()
    is_sold = "sold" in status if status else True

    return MarketItem(
        source="mercari",
        title=str(title),
        price=price_int,
        is_sold=is_sold,
        brand=(raw.get("brand") or {}).get("name") if isinstance(raw.get("brand"), dict) else raw.get("brand"),
        size=(raw.get("itemSize") or {}).get("name") if isinstance(raw.get("itemSize"), dict) else raw.get("size"),
        condition=raw.get("itemConditionName") or raw.get("condition"),
        url=f"https://jp.mercari.com/item/{item_id}" if item_id else None,
    )


def scrape_keyword(
    keyword: str,
    session: RateLimitedSession,
    status: str = "sold_out",
    max_items: int = 100,
) -> list[MarketItem]:
    url = _build_url(keyword, status)
    response = session.get(url)
    data = _find_next_data(response.text)
    if data is None:
        logger.warning(
            "mercari: could not locate __NEXT_DATA__ payload for '%s' — "
            "page structure may have changed, or results are loaded via a "
            "signed API call the server-rendered HTML doesn't include.",
            keyword,
        )
        return []

    raw_items = _walk_for_item_lists(data)
    items = [i for i in (_to_market_item(r) for r in raw_items) if i]
    return items[:max_items]


def scrape(
    keywords: list[str],
    status: str = "sold_out",
    max_items_per_keyword: int = 100,
    request_interval_sec: float = 3.0,
) -> list[MarketItem]:
    session = RateLimitedSession(interval_sec=request_interval_sec)
    results: list[MarketItem] = []
    for keyword in keywords:
        try:
            results.extend(
                scrape_keyword(keyword, session, status, max_items_per_keyword)
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("mercari: keyword '%s' failed: %s", keyword, exc)

    if not results:
        raise ScraperError(
            "mercari: no items collected — frontend structure likely changed; "
            "falling back to data/manual/ for Mercari data"
        )
    return results
