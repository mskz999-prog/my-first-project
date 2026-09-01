"""Yahoo!オークション closedsearch scraper.

Uses the public "落札相場" (closed / completed listings) search page:
    https://auctions.yahoo.co.jp/closedsearch/closedsearch/<keyword>/<page*50>

This page is server-rendered HTML, viewable without login (it's the same
page used by public price-research sites such as aucfan), so it is scraped
with plain requests + BeautifulSoup rather than a headless browser.

NOTE: Yahoo may change this page's markup at any time. If the CSS
selectors below stop matching, `parse_listing` returns an empty list for
that page and a warning is logged — it will not crash the pipeline. Verify
current selectors against a live page if results look empty.
"""
from __future__ import annotations

import logging
import urllib.parse
from typing import Optional

from bs4 import BeautifulSoup

from src.pipeline.normalize import MarketItem
from src.scrapers.base_scraper import RateLimitedSession, ScraperError, safe_int

logger = logging.getLogger(__name__)

BASE_URL = "https://auctions.yahoo.co.jp/closedsearch/closedsearch/{keyword}/{offset}"


def _build_url(keyword: str, page: int) -> str:
    encoded = urllib.parse.quote(keyword, safe="")
    offset = page * 50
    return BASE_URL.format(keyword=encoded, offset=offset)


def _parse_page(html: str) -> list[MarketItem]:
    soup = BeautifulSoup(html, "lxml")
    items: list[MarketItem] = []

    # Each result is a <li> product card; selector kept loose (class
    # *contains* "Product") since Yahoo's generated class names carry
    # hashed suffixes that change over time.
    cards = soup.select("li[class*='Product']")
    for card in cards:
        title_el = card.select_one("[class*='Product__title']") or card.select_one("a")
        price_el = card.select_one("[class*='Product__price']")
        link_el = card.select_one("a[href]")

        if not title_el or not link_el:
            continue

        title = title_el.get_text(strip=True)
        price = safe_int(price_el.get_text(strip=True)) if price_el else None
        url = link_el.get("href")

        if not title:
            continue

        items.append(
            MarketItem(
                source="yahoo_auction",
                title=title,
                price=price,
                is_sold=True,
                url=url,
            )
        )
    return items


def scrape_keyword(
    keyword: str,
    session: RateLimitedSession,
    max_pages: int = 3,
) -> list[MarketItem]:
    all_items: list[MarketItem] = []
    for page in range(max_pages):
        url = _build_url(keyword, page)
        try:
            response = session.get(url)
        except Exception as exc:  # noqa: BLE001 - log and continue, don't abort the run
            logger.warning("yahoo_auction: request failed for %s: %s", url, exc)
            break

        page_items = _parse_page(response.text)
        if not page_items:
            logger.info(
                "yahoo_auction: no items parsed on page %d for '%s' (end of "
                "results, or markup changed)",
                page,
                keyword,
            )
            break
        all_items.extend(page_items)

    return all_items


def scrape(
    keywords: list[str],
    max_pages_per_keyword: int = 3,
    request_interval_sec: float = 2.5,
) -> list[MarketItem]:
    session = RateLimitedSession(interval_sec=request_interval_sec)
    results: list[MarketItem] = []
    for keyword in keywords:
        try:
            results.extend(scrape_keyword(keyword, session, max_pages_per_keyword))
        except Exception as exc:  # noqa: BLE001
            logger.warning("yahoo_auction: keyword '%s' failed: %s", keyword, exc)
    if not results:
        raise ScraperError("yahoo_auction: no items collected for any keyword")
    return results
