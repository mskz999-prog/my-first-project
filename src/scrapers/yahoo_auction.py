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
import re
import urllib.parse
from datetime import datetime, timedelta, timezone

from bs4 import BeautifulSoup

from src.pipeline.normalize import MarketItem
from src.scrapers.base_scraper import RateLimitedSession, ScraperError, find_item_candidates

logger = logging.getLogger(__name__)

BASE_URL = "https://auctions.yahoo.co.jp/closedsearch/closedsearch/{keyword}/0"
ITEM_URL_FRAGMENT = "/jp/auction/"

_JST = timezone(timedelta(hours=9))

# Each closedsearch result card includes the auction's close date/time right
# next to "終了" (e.g. "1 9/3 09:05 終了"), confirmed against real page
# content — see the commit that removed YAHOO_DATE_DEBUG. No year is ever
# shown, since Yahoo always displays it relative to "now".
_END_DATE_PATTERN = re.compile(r"(\d{1,2})/(\d{1,2})\s+(\d{1,2}):(\d{2})\s*終了")


def _parse_end_datetime(text: str, reference_time: datetime) -> str | None:
    """Extract the auction's close date/time from a result card's text and
    return it as an ISO8601 string (JST), or None if the pattern isn't
    found (e.g. a markup change) — sold_at is best-effort, never required.

    The card never shows a year, only "M/D HH:MM". Yahoo's closedsearch
    only ever returns already-*closed* auctions, so a parsed month/day that
    would land more than a day after `reference_time` (the scrape time)
    can't be this year — it must be from a year ago (e.g. scraping in
    January but the parsed date reads "12/30").
    """
    match = _END_DATE_PATTERN.search(text)
    if not match:
        return None
    month, day, hour, minute = (int(g) for g in match.groups())
    try:
        candidate = datetime(reference_time.year, month, day, hour, minute, tzinfo=_JST)
    except ValueError:
        return None
    if candidate > reference_time + timedelta(days=1):
        candidate = candidate.replace(year=reference_time.year - 1)
    return candidate.isoformat()


def _build_url(keyword: str, page: int) -> str:
    encoded = urllib.parse.quote(keyword, safe="")
    base = BASE_URL.format(keyword=encoded)
    if page <= 0:
        return base
    return f"{base}?b={page * 50 + 1}"


def _parse_page(html: str, reference_time: datetime | None = None) -> list[MarketItem]:
    soup = BeautifulSoup(html, "lxml")
    items: list[MarketItem] = []
    reference_time = reference_time or datetime.now(_JST)

    candidates = find_item_candidates(soup, ITEM_URL_FRAGMENT)

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
                sold_at=_parse_end_datetime(candidate["container_text"], reference_time),
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
