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
import time
from dataclasses import dataclass, field
from typing import Optional

import requests
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
