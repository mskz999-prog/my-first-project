import json
import sys
from datetime import datetime, timedelta
from pathlib import Path
from unittest.mock import MagicMock, patch

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.scrapers.base_scraper import RateLimitedSession
from src.scrapers.yahoo_auction import (
    BACKFILL_WINDOW_DAYS,
    _JST,
    _load_backfill_state,
    _parse_end_datetime,
    _parse_page,
    _save_backfill_state,
    scrape,
    scrape_keyword,
)


def test_parse_end_datetime_extracts_month_day_time_from_real_card_text():
    # Real container_text captured from a live run (see the commit that
    # removed YAHOO_DATE_DEBUG) — confirms the actual on-page format.
    text = (
        "送料無料 鑑定付き ジーンズ リーバイス W33 LEVIS 501 BIGE ビッグE "
        "リーバイス ヴィンテージ 落札 189,800 円 開始 189,800 円 1 9/3 09:05 "
        "終了 出品中の商品 95.7% 神奈川県 から発送 出品 入札件数 残り時間"
    )
    reference = datetime(2026, 9, 3, 12, 0, tzinfo=_JST)

    result = _parse_end_datetime(text, reference)

    assert result == "2026-09-03T09:05:00+09:00"


def test_parse_end_datetime_infers_previous_year_across_new_year_boundary():
    # Scraping in early January but the card reads "12/30" — that auction
    # closed in December, so it must be *last* year, not this one (Yahoo
    # never shows a year, and closedsearch only returns already-closed
    # auctions, so a date implying "the future" is always wrong).
    text = "落札 5,000 円 開始 1 円 3 12/30 20:00 終了"
    reference = datetime(2027, 1, 2, 10, 0, tzinfo=_JST)

    result = _parse_end_datetime(text, reference)

    assert result == "2026-12-30T20:00:00+09:00"


def test_parse_end_datetime_returns_none_when_pattern_is_absent():
    reference = datetime(2026, 9, 3, 12, 0, tzinfo=_JST)
    assert _parse_end_datetime("落札 5,000 円 開始 1 円 送料無料", reference) is None


def test_parse_page_populates_sold_at_on_items():
    html = """
    <html><body>
      <div>
        <a href="/jp/auction/x123">
          <img alt="Levi's 501 66前期" />
        </a>
        <span>落札 46,000 円 開始 10,000 円 5 9/2 23:14 終了</span>
      </div>
    </body></html>
    """
    reference = datetime(2026, 9, 3, 12, 0, tzinfo=_JST)

    items = _parse_page(html, reference_time=reference)

    assert len(items) == 1
    assert items[0].sold_at == "2026-09-02T23:14:00+09:00"
    assert items[0].price == 46000


def _card_html(item_id: str, price: int, dt: datetime) -> str:
    end_str = f"{dt.month}/{dt.day} {dt.hour:02d}:{dt.minute:02d}"
    return (
        f'<div><a href="/jp/auction/{item_id}"><img alt="Title {item_id}" /></a>'
        f"<span>落札 {price:,} 円 開始 {price:,} 円 1 {end_str} 終了</span></div>"
    )


def test_scrape_keyword_backfill_stops_once_the_180_day_wall_is_reached():
    # Real closedsearch results are newest-closed-first, so a backfill
    # naturally runs into Yahoo's ~180-day retention wall at some page —
    # this confirms scrape_keyword stops right there instead of guessing a
    # fixed page count (and never fetches the page after that one).
    now = datetime.now(_JST)
    cutoff = now - timedelta(days=BACKFILL_WINDOW_DAYS)
    within_window = now - timedelta(days=5)
    past_the_wall = now - timedelta(days=200)
    never_reached = now - timedelta(days=300)

    page0 = MagicMock()
    page0.text = f"<html><body>{_card_html('a1', 1000, within_window)}</body></html>"
    page1 = MagicMock()
    page1.text = f"<html><body>{_card_html('a2', 2000, past_the_wall)}</body></html>"
    page2 = MagicMock()
    page2.text = f"<html><body>{_card_html('a3', 3000, never_reached)}</body></html>"

    with patch("src.scrapers.base_scraper.RateLimitedSession.get") as mock_get:
        mock_get.side_effect = [page0, page1, page2]
        session = RateLimitedSession()
        items = scrape_keyword("Levi's 501", session, backfill_cutoff=cutoff)

    assert mock_get.call_count == 2  # page2 must never be requested
    assert len(items) == 2


def test_backfill_state_roundtrips_through_json(tmp_path):
    state_path = tmp_path / "state.json"
    _save_backfill_state(state_path, {"Levi's 501": "2026-09-03T00:00:00+00:00"})

    assert _load_backfill_state(state_path) == {"Levi's 501": "2026-09-03T00:00:00+00:00"}


def test_load_backfill_state_returns_empty_dict_when_file_is_missing(tmp_path):
    assert _load_backfill_state(tmp_path / "missing.json") == {}


def test_scrape_backfills_unknown_keywords_and_stays_shallow_for_known_ones(tmp_path):
    now = datetime.now(_JST)
    recent = now - timedelta(days=2)

    new_page0 = MagicMock()
    new_page0.text = f"<html><body>{_card_html('n1', 1000, recent)}</body></html>"
    new_page1 = MagicMock()
    new_page1.text = "<html><body></body></html>"  # no more results -> backfill stops
    known_page0 = MagicMock()
    known_page0.text = f"<html><body>{_card_html('k1', 2000, recent)}</body></html>"

    state_path = tmp_path / "data" / "trends" / "yahoo_backfill_state.json"
    state_path.parent.mkdir(parents=True)
    state_path.write_text(json.dumps({"known keyword": "2026-01-01T00:00:00+00:00"}), encoding="utf-8")

    with patch("src.scrapers.base_scraper.RateLimitedSession.get") as mock_get:
        mock_get.side_effect = [new_page0, new_page1, known_page0]
        items = scrape(
            keywords=["new keyword", "known keyword"],
            max_pages_per_keyword=1,
            project_root=tmp_path,
        )

    assert len(items) == 2
    saved_state = json.loads(state_path.read_text(encoding="utf-8"))
    assert "new keyword" in saved_state
    assert "known keyword" in saved_state


def test_scrape_caps_new_backfills_per_run_and_leaves_the_rest_pending(tmp_path):
    now = datetime.now(_JST)
    recent = now - timedelta(days=2)

    a_page0 = MagicMock()
    a_page0.text = f"<html><body>{_card_html('a1', 1000, recent)}</body></html>"
    a_page1 = MagicMock()
    a_page1.text = "<html><body></body></html>"
    b_shallow = MagicMock()
    b_shallow.text = f"<html><body>{_card_html('b1', 2000, recent)}</body></html>"

    with patch("src.scrapers.base_scraper.RateLimitedSession.get") as mock_get:
        mock_get.side_effect = [a_page0, a_page1, b_shallow]
        scrape(
            keywords=["kw-a", "kw-b"],
            max_pages_per_keyword=1,
            project_root=tmp_path,
            backfill_keywords_per_run=1,
        )

    saved_state = json.loads(
        (tmp_path / "data" / "trends" / "yahoo_backfill_state.json").read_text(encoding="utf-8")
    )
    assert "kw-a" in saved_state
    assert "kw-b" not in saved_state  # budget exhausted — stays pending for a future run
