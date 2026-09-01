import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.scrapers import vintage_shops
from src.scrapers.base_scraper import find_product_card_candidates
from bs4 import BeautifulSoup


def test_paginate_url_adds_and_overwrites_page_param():
    assert vintage_shops._paginate_url("https://x.example/list", 1) == "https://x.example/list"
    assert (
        vintage_shops._paginate_url("https://x.example/list?sort=price", 3)
        == "https://x.example/list?sort=price&page=3"
    )


def test_find_product_card_candidates_requires_price_and_alt_text():
    html = """
    <div class="itemlist">
      <a href="/shopdetail/000000012345/">
        <img alt="70s Levi's デニムジャケット">
        <p>¥28,000</p>
      </a>
    </div>
    <a href="/logo"><img alt=""></a>
    <a href="/no-price"><img alt="ロゴだけ"></a>
    """
    soup = BeautifulSoup(html, "lxml")
    candidates = find_product_card_candidates(soup)
    assert len(candidates) == 1
    assert candidates[0]["price"] == 28000
    assert "Levi's" in candidates[0]["title"]


def test_scrape_shopify_json_marks_sold_when_no_variant_available():
    fake_response = MagicMock()
    fake_response.json.return_value = {
        "products": [
            {
                "title": "90s Champion リバースウィーブ",
                "handle": "champion-reverse-weave-90s",
                "variants": [{"price": "12800.00", "available": False}],
            },
            {
                "title": "Levi's 501 66前期",
                "handle": "levis-501",
                "variants": [{"price": "15000.00", "available": True}],
            },
        ]
    }
    empty_response = MagicMock()
    empty_response.json.return_value = {"products": []}

    with patch("src.scrapers.base_scraper.RateLimitedSession.get") as mock_get:
        mock_get.side_effect = [fake_response, empty_response]
        shop_cfg = {
            "name": "acorn",
            "strategy": "shopify_json",
            "base_url": "https://acorn-onlinestore.com",
            "max_pages": 5,
        }
        items = vintage_shops.scrape([shop_cfg])

    assert len(items) == 2
    by_title = {i.title: i for i in items}
    assert by_title["90s Champion リバースウィーブ"].is_sold is True
    assert by_title["Levi's 501 66前期"].is_sold is False
    assert by_title["90s Champion リバースウィーブ"].price == 12800


def test_scrape_raises_when_no_shop_yields_items():
    from src.scrapers.base_scraper import ScraperError

    with patch("src.scrapers.base_scraper.RateLimitedSession.get") as mock_get:
        mock_get.side_effect = Exception("network down")
        try:
            vintage_shops.scrape([{"name": "x", "strategy": "shopify_json", "base_url": "https://x.example"}])
            assert False, "expected ScraperError"
        except ScraperError:
            pass
