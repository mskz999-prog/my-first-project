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


def test_find_item_candidates_ignores_breadcrumb_links_to_reach_price():
    # Real Yahoo Auctions closedsearch markup, captured via production
    # debug logging: category breadcrumb links ("チャンピオン", "男性用",
    # "パンツ、スラックス" — each pointing at a *different* search-results
    # URL) sit in the same container as the title/image/price for one
    # single item. The previous fix (tolerate duplicate hrefs to the same
    # item) didn't help here, because these breadcrumb hrefs are genuinely
    # distinct from each other and from the item link — so the naive
    # "stop at >1 distinct href" rule still stopped one level too early,
    # before ever reaching the price. Only hrefs matching href_substring
    # should count toward that decision.
    html = """
    <li class="sc-aa346514-5 jCEbVo">
      <div class="sc-a3c2172c-0 bnwGXF">
        <div class="sc-a3c2172c-1 fJhthk">
          <a class="sc-a3c2172c-5 kcJSbX" href="https://auctions.yahoo.co.jp/jp/auction/x123">
            <div class="sc-a3c2172c-6 emYpnB">
              <img alt="Champion リバースウィーブ 90s">
            </div>
          </a>
        </div>
        <div class="sc-a3c2172c-2 eJRmnl">
          <div class="sc-a3c2172c-3 eZMrCH">
            <ol class="sc-a3c2172c-10 enNsYe">
              <li><a href="https://auctions.yahoo.co.jp/closedsearch/closedsearch?p=x&auccat=111">チャンピオン</a></li>
              <li><a href="https://auctions.yahoo.co.jp/closedsearch/closedsearch?p=x&auccat=222">男性用</a></li>
              <li><a href="https://auctions.yahoo.co.jp/closedsearch/closedsearch?p=x&auccat=333">パンツ、スラックス</a></li>
            </ol>
            <p><a class="sc-a3c2172c-12 erzZUV" href="https://auctions.yahoo.co.jp/jp/auction/x123" title="Champion リバースウィーブ 90s">Champion リバースウィーブ 90s</a></p>
            <div class="sc-a3c2172c-4 lllBNh">
              <div class="sc-a3c2172c-14 price">8,500円</div>
            </div>
          </div>
        </div>
      </div>
    </li>
    """
    soup = BeautifulSoup(html, "lxml")
    candidates = find_item_candidates(soup, "/jp/auction/")
    assert len(candidates) == 1
    assert candidates[0]["price"] == 8500


def test_find_item_candidates_still_prevents_bleeding_between_two_real_items():
    # Guard against over-correcting: when an ancestor holds links to two
    # *different* items that both match href_substring, climbing must
    # still stop before merging their prices/titles.
    html = """
    <ul>
      <li>
        <a href="/jp/auction/item-a">
          <img alt="Item A">
        </a>
        <span>1,000円</span>
      </li>
      <li>
        <a href="/jp/auction/item-b">
          <img alt="Item B">
        </a>
        <span>2,000円</span>
      </li>
    </ul>
    """
    soup = BeautifulSoup(html, "lxml")
    candidates = find_item_candidates(soup, "/jp/auction/")
    assert len(candidates) == 2
    prices = {c["href"]: c["price"] for c in candidates}
    assert prices["/jp/auction/item-a"] == 1000
    assert prices["/jp/auction/item-b"] == 2000


def test_find_item_candidates_reads_price_from_aria_label():
    # Real Mercari markup, captured via production debug logging: the
    # price only exists inside an aria-label attribute for screen readers
    # ("...売り切れ 19,000円 US$124.83") — there's no matching visible text
    # node anywhere in the card, so get_text() alone can never see it no
    # matter how the ancestor climb is tuned.
    html = """
    <li class="sc-bcd1c877-2 cvAXgx" data-testid="item-cell">
      <div>
        <a class="sc-bcd1c877-1 lpjZwE" data-testid="thumbnail-link" href="/item/m64340477850" target="_blank">
          <div aria-label="HOMME PLISSÉ ISSEY MIYAKE パンツの画像 売り切れ 19,000円 US$124.83" class="merItemThumbnail" role="img">
            <figure>
              <div aria-label="HOMME PLISSÉ ISSEY MIYAKE パンツのサムネイル" role="img">
                <img alt="HOMME PLISSÉ ISSEY MIYAKE パンツのサムネイル">
              </div>
            </figure>
          </div>
        </a>
      </div>
    </li>
    """
    soup = BeautifulSoup(html, "lxml")
    candidates = find_item_candidates(soup, "/item/")
    assert len(candidates) == 1
    assert candidates[0]["price"] == 19000


def test_find_item_candidates_dedupes_repeated_links():
    html = """
    <a href="/item/m1"><img alt="A"><span>1,000円</span></a>
    <a href="/item/m1"><img alt="A"><span>1,000円</span></a>
    """
    soup = BeautifulSoup(html, "lxml")
    candidates = find_item_candidates(soup, "/item/")
    assert len(candidates) == 1
