import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.scrapers.yahoo_auction import _JST, _parse_end_datetime, _parse_page


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
