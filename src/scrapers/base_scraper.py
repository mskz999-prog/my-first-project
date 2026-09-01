"""Shared HTTP utilities for all scrapers.

Design goals:
- Be a polite client: fixed minimum interval between requests, retries with
  backoff on transient failures, a realistic (but honest) User-Agent.
- Never crash the whole pipeline: a scraper failure is caught by the
  orchestrator (see pipeline/collect.py) and simply yields zero items for
  that source, so manual data + the other sources still produce a report.

IMPORTANT (compliance): the sites targeted by scrapers in this package are
third-party services with their own Terms of Service. Automated access may
be restricted or prohibited by those terms. Review each site's ToS and
robots.txt before enabling a scraper in config/config.yaml, keep request
intervals conservative, and prefer official APIs or manual export
(data/manual/) where automated access is not permitted.
"""
from __future__ import annotations

import logging
import re
import time
from dataclasses import dataclass, field
from typing import Any, Optional

import requests
from bs4 import BeautifulSoup, Tag
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

logger = logging.getLogger(__name__)

DEFAULT_USER_AGENT = (
    "Mozilla/5.0 (compatible; VintageResaleMarketResearchBot/1.0; "
    "+market-research-personal-use)"
)


@dataclass
class RateLimitedSession:
    """A requests.Session wrapper enforcing a minimum interval between calls."""

    interval_sec: float = 2.0
    timeout_sec: float = 15.0
    user_agent: str = DEFAULT_USER_AGENT
    _session: requests.Session = field(default_factory=requests.Session, init=False)
    _last_request_ts: float = field(default=0.0, init=False)

    def __post_init__(self) -> None:
        self._session.headers.update({"User-Agent": self.user_agent})

    def _wait_for_slot(self) -> None:
        elapsed = time.monotonic() - self._last_request_ts
        remaining = self.interval_sec - elapsed
        if remaining > 0:
            time.sleep(remaining)

    @retry(
        reraise=True,
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=20),
        retry=retry_if_exception_type((requests.ConnectionError, requests.Timeout)),
    )
    def get(self, url: str, **kwargs) -> requests.Response:
        self._wait_for_slot()
        kwargs.setdefault("timeout", self.timeout_sec)
        response = self._session.get(url, **kwargs)
        self._last_request_ts = time.monotonic()
        response.raise_for_status()
        return response

    @retry(
        reraise=True,
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=20),
        retry=retry_if_exception_type((requests.ConnectionError, requests.Timeout)),
    )
    def post(self, url: str, **kwargs) -> requests.Response:
        self._wait_for_slot()
        kwargs.setdefault("timeout", self.timeout_sec)
        response = self._session.post(url, **kwargs)
        self._last_request_ts = time.monotonic()
        response.raise_for_status()
        return response


class ScraperError(RuntimeError):
    """Raised when a scraper cannot produce results; caught by the orchestrator."""


def safe_int(value: Optional[str]) -> Optional[int]:
    if value is None:
        return None
    digits = "".join(ch for ch in value if ch.isdigit())
    return int(digits) if digits else None


_PRICE_PATTERN = re.compile(r"[¥￥]\s?([\d,]{2,})|([\d,]{2,})\s?円")
# Fallback for sites that render the currency mark as an icon/image rather
# than text (so no ¥/円 character actually appears near the number) — a
# bare comma-grouped number with 3+ digits (e.g. "8,500"). Looser and more
# prone to false positives (could match a date, quantity, etc.), so it's
# only tried when the anchored pattern above finds nothing.
_BARE_NUMBER_PATTERN = re.compile(r"\b\d{1,3}(?:,\d{3})+\b")


def extract_price(text: str) -> Optional[int]:
    """Find a JPY price (¥1,234 or 1,234円) anywhere in a text blob.

    Falls back to a bare comma-grouped number (e.g. "8,500") if no ¥/円
    marker is found — see _BARE_NUMBER_PATTERN.
    """
    match = _PRICE_PATTERN.search(text)
    if match:
        return safe_int(match.group(1) or match.group(2))
    fallback = _BARE_NUMBER_PATTERN.search(text)
    return safe_int(fallback.group(0)) if fallback else None


def find_item_candidates(
    soup: BeautifulSoup,
    href_substring: str,
    max_ancestor_levels: int = 4,
) -> list[dict[str, Any]]:
    """Markup-agnostic item extraction: find every ``<a href>`` containing
    ``href_substring`` (a stable item-page URL fragment, e.g. ``/item/`` or
    ``/items/``), then look at a small ancestor chain around each link for a
    nearby price and a title.

    This deliberately avoids depending on exact CSS class names — those
    change with every theme/frontend redesign — in favor of two things that
    stay stable for years: the shape of an item-page URL, and the presence
    of a price string near it. It trades a bit of precision (occasional
    wrong price picked up from a neighboring element) for being far less
    likely to silently return zero results after a markup change.
    """
    seen_hrefs: set[str] = set()
    candidates: list[dict[str, Any]] = []

    for a in soup.find_all("a", href=True):
        href = a["href"]
        if href_substring not in href or href in seen_hrefs:
            continue
        seen_hrefs.add(href)

        container_text = _ancestor_text(a, max_ancestor_levels)

        title = None
        img = a.find("img")
        if img and img.get("alt"):
            title = img["alt"].strip()
        if not title:
            title = a.get_text(" ", strip=True)
        if not title:
            title = container_text[:80]

        candidates.append(
            {
                "href": href,
                "title": title or None,
                "price": extract_price(container_text),
                "container_text": container_text,
            }
        )

    return candidates


def _ancestor_text(tag: Tag, max_ancestor_levels: int) -> str:
    """Walk up from `tag`, collecting text from the smallest ancestor that
    plausibly represents "this one item's card" — stopping *before*
    climbing into any ancestor that contains more than one ``<a href>``,
    since that means we've reached a shared list/grid wrapper and would
    otherwise bleed a neighboring item's price/title into this one.
    """
    container: Tag = tag
    for _ in range(max_ancestor_levels):
        parent = container.parent
        if not isinstance(parent, Tag):
            break
        if len(parent.find_all("a", href=True)) > 1:
            break
        container = parent
    return container.get_text(" ", strip=True)


def find_product_card_candidates(
    soup: BeautifulSoup,
    max_ancestor_levels: int = 4,
    require_price: bool = True,
) -> list[dict[str, Any]]:
    """Looser variant of `find_item_candidates` for shops whose product-page
    URL scheme isn't confidently known: instead of filtering by URL
    fragment, treat any ``<a>`` wrapping an ``<img alt="...">`` with a price
    nearby as a product card. Requiring a price by default filters out
    navigation/logo links that happen to wrap an image.
    """
    seen_hrefs: set[str] = set()
    candidates: list[dict[str, Any]] = []

    for a in soup.find_all("a", href=True):
        href = a["href"]
        if href in seen_hrefs:
            continue
        img = a.find("img")
        alt = img.get("alt", "").strip() if img else ""
        if not alt:
            continue

        container_text = _ancestor_text(a, max_ancestor_levels)
        price = extract_price(container_text)
        if require_price and price is None:
            continue

        seen_hrefs.add(href)
        candidates.append(
            {
                "href": href,
                "title": alt,
                "price": price,
                "container_text": container_text,
            }
        )

    return candidates
