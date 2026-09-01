"""Generic scraper for independently-run vintage/used-clothing shop
websites — as opposed to Mercari/Yahoo Auctions/BASE, each of these shops
runs on its own platform, configured in config.yaml under
sources.vintage_shops.shops.

Each shop entry picks a `strategy`:

- "link_pattern": the shop's product pages follow a known, stable URL
  fragment (e.g. "/view/item/", "/products/detail/") — extracted with
  `find_item_candidates`.
- "generic_card": the product-page URL scheme isn't confidently known;
  falls back to `find_product_card_candidates` (any linked image with a
  price nearby). Looser, so more prone to false positives, but doesn't
  need a confirmed URL pattern.
- "shopify_json": the shop runs on Shopify, which exposes a public
  `/products.json` endpoint. Far more reliable than HTML scraping —
  prefer this whenever a shop turns out to run on Shopify.

A shop's `list_urls` entries can set `force_sold: true` for a page that is
inherently sold-only (e.g. a dedicated "SOLD OUT" category), so every item
found there is recorded as sold regardless of any on-page badge text.

As with every other scraper here: platform/markup details are
best-effort and can drift. A shop that stops matching is logged and
skipped — it does not abort collection from the other shops or sources.
"""
from __future__ import annotations

import logging
import urllib.parse
from typing import Any

from bs4 import BeautifulSoup

from src.pipeline.normalize import MarketItem
from src.scrapers.base_scraper import (
    RateLimitedSession,
    ScraperError,
    find_item_candidates,
    find_product_card_candidates,
)

logger = logging.getLogger(__name__)

SOLD_OUT_KEYWORDS = ("SOLD OUT", "sold out", "Sold Out", "SOLDOUT", "売り切れ", "完売")


def _looks_sold(text: str) -> bool:
    return any(kw in text for kw in SOLD_OUT_KEYWORDS)


def _paginate_url(url: str, page: int) -> str:
    if page <= 1:
        return url
    parsed = urllib.parse.urlsplit(url)
    query = urllib.parse.parse_qs(parsed.query)
    query["page"] = [str(page)]
    return urllib.parse.urlunsplit(parsed._replace(query=urllib.parse.urlencode(query, doseq=True)))


def _scrape_html_shop(shop_cfg: dict[str, Any], session: RateLimitedSession) -> list[MarketItem]:
    shop_name = shop_cfg["name"]
    strategy = shop_cfg.get("strategy", "link_pattern")
    item_url_fragment = shop_cfg.get("item_url_fragment")
    max_pages = shop_cfg.get("max_pages", 5)
    items: list[MarketItem] = []

    if strategy == "link_pattern" and not item_url_fragment:
        raise ScraperError(f"{shop_name}: strategy=link_pattern requires item_url_fragment")

    for list_entry in shop_cfg.get("list_urls", []):
        url_base = list_entry["url"]
        force_sold = bool(list_entry.get("force_sold", False))

        for page in range(1, max_pages + 1):
            url = _paginate_url(url_base, page)
            try:
                response = session.get(url)
            except Exception as exc:  # noqa: BLE001
                logger.warning("%s: request failed for %s: %s", shop_name, url, exc)
                break

            soup = BeautifulSoup(response.text, "lxml")
            if strategy == "generic_card":
                candidates = find_product_card_candidates(soup)
            else:
                candidates = find_item_candidates(soup, item_url_fragment)

            if not candidates:
                logger.info(
                    "%s: no items parsed on page %d for %s (end of results, or "
                    "markup changed)",
                    shop_name,
                    page,
                    url_base,
                )
                break

            for c in candidates:
                if not c["title"]:
                    continue
                href = c["href"]
                item_url = href if href.startswith("http") else urllib.parse.urljoin(url, href)
                items.append(
                    MarketItem(
                        source="vintage_shop",
                        title=c["title"],
                        price=c["price"],
                        is_sold=force_sold or _looks_sold(c["container_text"]),
                        url=item_url,
                        shop_name=shop_name,
                    )
                )

    return items


def _scrape_shopify_shop(shop_cfg: dict[str, Any], session: RateLimitedSession) -> list[MarketItem]:
    shop_name = shop_cfg["name"]
    base_url = shop_cfg["base_url"].rstrip("/")
    max_pages = shop_cfg.get("max_pages", 10)
    items: list[MarketItem] = []

    for page in range(1, max_pages + 1):
        url = f"{base_url}/products.json?limit=250&page={page}"
        try:
            response = session.get(url)
            data = response.json()
        except Exception as exc:  # noqa: BLE001
            logger.warning("%s: products.json request failed (page %d): %s", shop_name, page, exc)
            break

        products = data.get("products", [])
        if not products:
            break

        for product in products:
            title = product.get("title")
            variants = product.get("variants", [])
            if not title or not variants:
                continue
            prices = [float(v["price"]) for v in variants if v.get("price") is not None]
            price = int(min(prices)) if prices else None
            is_sold = not any(v.get("available") for v in variants)
            handle = product.get("handle", "")
            items.append(
                MarketItem(
                    source="vintage_shop",
                    title=title,
                    price=price,
                    is_sold=is_sold,
                    url=f"{base_url}/products/{handle}" if handle else base_url,
                    shop_name=shop_name,
                )
            )

    return items


def scrape(shops: list[dict[str, Any]], request_interval_sec: float = 2.5) -> list[MarketItem]:
    session = RateLimitedSession(interval_sec=request_interval_sec)
    all_items: list[MarketItem] = []

    for shop_cfg in shops:
        shop_name = shop_cfg.get("name", "unknown")
        try:
            if shop_cfg.get("strategy") == "shopify_json":
                shop_items = _scrape_shopify_shop(shop_cfg, session)
            else:
                shop_items = _scrape_html_shop(shop_cfg, session)
            all_items.extend(shop_items)
            logger.info("%s: collected %d items", shop_name, len(shop_items))
        except Exception as exc:  # noqa: BLE001
            logger.warning("%s: skipped due to error: %s", shop_name, exc)

    if not all_items:
        raise ScraperError("vintage_shops: no items collected from any configured shop")
    return all_items
