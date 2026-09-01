"""Mercari (jp.mercari.com) sold-item scraper.

Mercari's search results are populated client-side after the page loads —
a plain HTTP GET no longer reliably returns them in the initial HTML (the
frontend fetches them via a signed internal API call). Rather than
reverse-engineer that signing scheme, this module drives a real headless
Chromium browser (Playwright) to the search page and lets Mercari's own
frontend JS make its (self-signed) API calls, then reads the resulting
DOM. This is slower than a plain HTTP scraper but far more robust to
Mercari frontend changes than replicating their API auth would be.

Items are found by their item-page URL pattern (`/item/<id>`) rather than
CSS class names — see `src.scrapers.base_scraper.find_item_candidates`.

Requires Playwright's Chromium browser to be installed in the runtime
(`playwright install --with-deps chromium` — wired into
.github/workflows/weekly_report.yml). If Playwright or its browser isn't
available, `scrape()` raises ScraperError like every other scraper here,
and the pipeline falls back to data/manual/ for Mercari data.
"""
from __future__ import annotations

import logging
import time
import urllib.parse

from bs4 import BeautifulSoup

from src.pipeline.normalize import MarketItem
from src.scrapers.base_scraper import ScraperError, find_item_candidates

logger = logging.getLogger(__name__)

SEARCH_URL = "https://jp.mercari.com/search"
ITEM_URL_FRAGMENT = "/item/"

_BROWSER_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)


def _build_url(keyword: str, status: str) -> str:
    params = {"keyword": keyword, "status": status}
    return f"{SEARCH_URL}?{urllib.parse.urlencode(params)}"


def _scrape_with_browser(
    keywords: list[str],
    status: str,
    max_items_per_keyword: int,
    request_interval_sec: float,
) -> list[MarketItem]:
    try:
        from playwright.sync_api import sync_playwright
    except ImportError as exc:
        raise ScraperError(
            "mercari: playwright is not installed (pip install playwright && "
            "playwright install chromium)"
        ) from exc

    items: list[MarketItem] = []

    with sync_playwright() as p:
        try:
            browser = p.chromium.launch(headless=True)
        except Exception as exc:  # noqa: BLE001
            raise ScraperError(
                f"mercari: failed to launch Chromium (is it installed? "
                f"`playwright install --with-deps chromium`): {exc}"
            ) from exc

        try:
            page = browser.new_page(user_agent=_BROWSER_USER_AGENT)
            for keyword in keywords:
                url = _build_url(keyword, status)
                try:
                    page.goto(url, wait_until="networkidle", timeout=30000)
                    page.wait_for_selector(f"a[href*='{ITEM_URL_FRAGMENT}']", timeout=15000)
                except Exception as exc:  # noqa: BLE001
                    logger.warning(
                        "mercari: page load/render failed for '%s' (no results, "
                        "or frontend structure changed): %s",
                        keyword,
                        exc,
                    )
                    time.sleep(request_interval_sec)
                    continue

                # Mercari lazy-loads results as the page is scrolled — only
                # the items in the initial viewport render otherwise
                # (observed capped at ~10/keyword with no scrolling at
                # all). Scroll repeatedly, stopping once no new items
                # appear across a couple of consecutive attempts (a single
                # stall can just be lazy-load network lag) or the target
                # is reached.
                item_selector = f"a[href*='{ITEM_URL_FRAGMENT}']"
                previous_count = page.locator(item_selector).count()
                stalls = 0
                for _ in range(20):
                    if previous_count >= max_items_per_keyword:
                        break
                    page.mouse.wheel(0, 6000)
                    page.wait_for_timeout(1200)
                    current_count = page.locator(item_selector).count()
                    if current_count <= previous_count:
                        stalls += 1
                        if stalls >= 2:
                            break
                    else:
                        stalls = 0
                        previous_count = current_count

                html = page.content()
                soup = BeautifulSoup(html, "lxml")
                candidates = find_item_candidates(soup, ITEM_URL_FRAGMENT)
                for candidate in candidates[:max_items_per_keyword]:
                    if not candidate["title"]:
                        continue
                    href = candidate["href"]
                    item_url = href if href.startswith("http") else f"https://jp.mercari.com{href}"
                    items.append(
                        MarketItem(
                            source="mercari",
                            title=candidate["title"],
                            price=candidate["price"],
                            is_sold=(status == "sold_out"),
                            url=item_url,
                        )
                    )
                logger.info("mercari: '%s' -> %d items", keyword, len(candidates))
                time.sleep(request_interval_sec)
        finally:
            browser.close()

    return items


def scrape(
    keywords: list[str],
    status: str = "sold_out",
    max_items_per_keyword: int = 100,
    request_interval_sec: float = 3.0,
) -> list[MarketItem]:
    items = _scrape_with_browser(keywords, status, max_items_per_keyword, request_interval_sec)

    if not items:
        raise ScraperError(
            "mercari: no items collected — page structure may have changed; "
            "falling back to data/manual/ for Mercari data"
        )
    return items
