"""BASE (thebase.in) shop storefront scraper.

Scrapes the public product listing page of configured BASE shops
(config.yaml -> sources.base_ec.shop_urls) and flags items whose product
card shows a "SOLD OUT" badge. BASE storefronts are static server-rendered
HTML, which makes this comparatively more stable than the Mercari scraper.

Only add shop URLs you have the right to monitor under that shop's terms
of use / robots.txt — this is intended for tracking your own shop or
publicly benchmarking competitor pricing at a low, respectful request
rate (see request_interval_sec in config.yaml).
"""
from __future__ import annotations

import logging
import urllib.parse
from typing import Optional

from bs4 import BeautifulSoup

from src.pipeline.normalize import MarketItem
from src.scrapers.base_scraper import RateLimitedSession, ScraperError, safe_int

logger = logging.getLogger(__name__)


def _shop_name_from_url(shop_url: str) -> str:
    host = urllib.parse.urlparse(shop_url).netloc
    return host.split(".")[0] if host else shop_url


def _parse_listing_page(html: str, shop_name: str, shop_url: str) -> list[MarketItem]:
    soup = BeautifulSoup(html, "lxml")
    items: list[MarketItem] = []

    # BASE's default themes render each product as an <li> with a class
    # containing "item-list" / "item_index"; kept loose for theme variance.
    cards = soup.select("li[class*='item-list'], li[class*='item_index'], div[class*='item-box']")
    for card in cards:
        title_el = card.select_one("[class*='item-name'], [class*='item_name'], .item-list__title")
        price_el = card.select_one("[class*='item-price'], [class*='item_price']")
        link_el = card.select_one("a[href]")

        if not title_el or not link_el:
            continue

        title = title_el.get_text(strip=True)
        if not title:
            continue

        sold_badge = card.select_one("[class*='soldout'], [class*='sold-out'], [class*='sold_out']")
        is_sold = sold_badge is not None

        href = link_el.get("href")
        url = urllib.parse.urljoin(shop_url, href) if href else None

        items.append(
            MarketItem(
                source="base_ec",
                title=title,
                price=safe_int(price_el.get_text(strip=True)) if price_el else None,
                is_sold=is_sold,
                url=url,
                shop_name=shop_name,
            )
        )
    return items


def scrape_shop(
    shop_url: str,
    session: RateLimitedSession,
    sold_out_only: bool = True,
) -> list[MarketItem]:
    shop_name = _shop_name_from_url(shop_url)
    response = session.get(shop_url)
    items = _parse_listing_page(response.text, shop_name, shop_url)

    if not items:
        logger.warning(
            "base_ec: no product cards parsed for %s — theme markup may "
            "differ from the default BASE templates this scraper targets.",
            shop_url,
        )

    if sold_out_only:
        return [i for i in items if i.is_sold]
    return items


def scrape(
    shop_urls: list[str],
    request_interval_sec: float = 2.0,
    sold_out_only: bool = True,
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
