import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from bs4 import BeautifulSoup

from src.scrapers.base_scraper import extract_price, find_item_candidates


def test_extract_price_yen_symbol():
    assert extract_price("¥16,800") == 16800


def test_extract_price_yen_suffix():
    assert extract_price("8,500円") == 8500


def test_extract_price_no_match():
    assert extract_price("SOLD OUT") is None


def test_extract_price_falls_back_to_bare_comma_number():
    # Some sites render the yen mark as an icon/image, not text — no ¥/円
    # character actually appears near the number.
    assert extract_price("8,500") == 8500


def test_extract_price_prefers_yen_marker_over_bare_number():
    # When both a marked price and an unrelated bare number are present,
    # the anchored ¥/円 match should win (it's checked first).
    assert extract_price("¥8,500 (在庫 1,234)") == 8500


def test_find_item_candidates_yahoo_like_markup():
    html = """
    <li class="Product_abc123">
      <a href="/jp/auction/x123456789">
        <img alt="Champion リバースウィーブ 90s" src="...">
        <span class="Product_price_xyz">8,500円</span>
      </a>
    </li>
    """
    soup = BeautifulSoup(html, "lxml")
    candidates = find_item_candidates(soup, "/jp/auction/")
    assert len(candidates) == 1
    assert candidates[0]["price"] == 8500
    assert "Champion" in candidates[0]["title"]


def test_find_item_candidates_base_like_markup_with_soldout():
    html = """
    <div class="item-box">
      <a href="/items/12345678">
        <img alt="Patagonia レトロX フリース">
        <p class="price">¥16,800</p>
        <span class="badge-soldout">SOLD OUT</span>
      </a>
    </div>
    """
    soup = BeautifulSoup(html, "lxml")
    candidates = find_item_candidates(soup, "/items/")
    assert candidates[0]["price"] == 16800
    assert "SOLD OUT" in candidates[0]["container_text"]


def test_find_item_candidates_climbs_past_duplicate_hrefs_to_reach_price():
    # Real-world Yahoo Auctions markup: a thumbnail link AND a separate
    # title link both point at the same item, with the price sitting in a
    # sibling element two levels up. Confirmed via production logs that
    # naively stopping the ancestor climb at "more than one <a> tag"
    # (rather than more than one *distinct* href) caused this to return
    # price=None for nearly every Yahoo item.
    html = """
    <li class="Product">
      <a href="/jp/auction/x123"><img alt=""></a>
      <div class="info">
        <a href="/jp/auction/x123">Champion リバースウィーブ 90s</a>
        <span>送料無料</span>
        <span>8,500円</span>
      </div>
    </li>
    """
    soup = BeautifulSoup(html, "lxml")
    candidates = find_item_candidates(soup, "/jp/auction/")
    assert len(candidates) == 1
    assert candidates[0]["price"] == 8500


def test_find_item_candidates_dedupes_repeated_links():
    html = """
    <a href="/item/m1"><img alt="A"><span>1,000円</span></a>
    <a href="/item/m1"><img alt="A"><span>1,000円</span></a>
    """
    soup = BeautifulSoup(html, "lxml")
    candidates = find_item_candidates(soup, "/item/")
    assert len(candidates) == 1
