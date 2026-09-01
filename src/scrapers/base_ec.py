"""BASE (thebase.in) shop storefront scraper.

Scrapes the public product listing page of configured BASE shops
(config.yaml -> sources.base_ec.shop_urls). Items are found by their
product-page URL pattern (`/items/<id>`) rather than CSS class names,
which drift across BASE's many storefront themes — see
`src.scrapers.base_scraper.find_item_candidates`. A "SOLD OUT" badge is
detected by keyword search in the text around the link.

Only add shop URLs you have the right to monitor under that shop's terms
of use / robots.txt — this is intended for tracking your own shop or
publicly benchmarking competitor pricing at a low, respectful request
rate (see request_interval_sec in config.yaml).
"""
from __future__ import annotations

import logging
import urllib.parse

from bs4 import BeautifulSoup

from src.pipeline.normalize import MarketItem
from src.scrapers.base_scraper import RateLimitedSession, ScraperError, find_item_candidates

logger = logging.getLogger(__name__)

ITEM_URL_FRAGMENT = "/items/"
SOLD_OUT_KEYWORDS = ("SOLD OUT", "sold out", "Sold Out", "売り切れ", "完売")


def _shop_name_from_url(shop_url: str) -> str:
    host = urllib.parse.urlparse(shop_url).netloc
    return host.split(".")[0] if host else shop_url


def _parse_listing_page(html: str, shop_name: str, shop_url: str) -> list[MarketItem]:
    soup = BeautifulSoup(html, "lxml")
    items: list[MarketItem] = []

    for candidate in find_item_candidates(soup, ITEM_URL_FRAGMENT):
        if not candidate["title"]:
            continue
        is_sold = any(kw in candidate["container_text"] for kw in SOLD_OUT_KEYWORDS)
        url = urllib.parse.urljoin(shop_url, candidate["href"])
        items.append(
            MarketItem(
                source="base_ec",
                title=candidate["title"],
                price=candidate["price"],
                is_sold=is_sold,
                url=url,
                shop_name=shop_name,
            )
        )
    return items


def scrape_shop(
    shop_url: str,
    session: RateLimitedSession,
    sold_out_only: bool = False,
) -> list[MarketItem]:
    shop_name = _shop_name_from_url(shop_url)
    response = session.get(shop_url)
    items = _parse_listing_page(response.text, shop_name, shop_url)

    if not items:
        logger.warning(
            "base_ec: no product links found for %s — theme markup may "
            "differ from what this scraper's URL-pattern heuristic expects.",
            shop_url,
        )

    if sold_out_only:
        return [i for i in items if i.is_sold]
    return items


def scrape(
    shop_urls: list[str],
    request_interval_sec: float = 2.0,
    sold_out_only: bool = False,
) -> list[MarketItem]:
    session = RateLimitedSession(interval_sec=request_interval_sec)
    results: list[MarketItem] = []
    for shop_url in shop_urls:
        try:
            results.extend(scrape_shop(shop_url, session, sold_out_only))
        except Exception as exc:  # noqa: BLE001
            logger.warning("base_ec: shop '%s' failed: %s", shop_url, exc)

    if not results:
        raise ScraperError("base_ec: no items collected from any configured shop")
    return results
