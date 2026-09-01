"""Yahoo!オークション closedsearch scraper.

Uses the public "落札相場" (closed / completed listings) search page:
    https://auctions.yahoo.co.jp/closedsearch/closedsearch/<keyword>/0

This page is server-rendered HTML, viewable without login (it's the same
page used by public price-research sites such as aucfan), so it is scraped
with plain requests + BeautifulSoup rather than a headless browser.

Items are found by their item-page URL pattern (`/jp/auction/<id>`) rather
than by CSS class names — Yahoo's generated class names carry hashed
suffixes that churn on every frontend deploy, while the auction item URL
scheme has stayed stable for years. See
`src.scrapers.base_scraper.find_item_candidates`.

Pagination: the first page is confirmed at `.../<keyword>/0`. Appending a
raw offset as an extra path segment (`.../<keyword>/50`) 404s — that was
never actually a working pagination scheme, just an untested guess.
Page 2+ instead tries `?b=<1-indexed start>` (the classic Yahoo Auctions
"begin at" convention), which is unconfirmed too; if it also 404s, the
per-keyword scrape simply stops there (same degrade-to-page-1 behavior as
before), it does not raise.
"""
from __future__ import annotations

import logging
import urllib.parse

from bs4 import BeautifulSoup

from src.pipeline.normalize import MarketItem
from src.scrapers.base_scraper import RateLimitedSession, ScraperError, find_item_candidates

logger = logging.getLogger(__name__)

BASE_URL = "https://auctions.yahoo.co.jp/closedsearch/closedsearch/{keyword}/0"
ITEM_URL_FRAGMENT = "/jp/auction/"


def _build_url(keyword: str, page: int) -> str:
    encoded = urllib.parse.quote(keyword, safe="")
    base = BASE_URL.format(keyword=encoded)
    if page <= 0:
        return base
    return f"{base}?b={page * 50 + 1}"


def _parse_page(html: str) -> list[MarketItem]:
    soup = BeautifulSoup(html, "lxml")
    items: list[MarketItem] = []

    candidates = find_item_candidates(soup, ITEM_URL_FRAGMENT)
    if candidates:
        # TEMPORARY DEBUG: many Yahoo items came back with price=None in a
        # prior run. Log the first candidate's raw surrounding text so we
        # can see in the Actions log whether a ¥/円 marker is actually
        # present near the price (vs. rendered as an icon/image, which
        # extract_price can't see as text). Remove once confirmed either
        # way — cheap to keep for a run or two given the low item count.
        first = candidates[0]
        logger.info(
            "yahoo_auction: sample candidate title=%r price=%r container_text=%r",
            first["title"][:60],
            first["price"],
            first["container_text"][:150],
        )

    for candidate in candidates:
        if not candidate["title"]:
            continue
        href = candidate["href"]
        url = href if href.startswith("http") else f"https://page.auctions.yahoo.co.jp{href}"
        items.append(
            MarketItem(
                source="yahoo_auction",
                title=candidate["title"],
                price=candidate["price"],
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
