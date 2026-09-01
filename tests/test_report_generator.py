import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.pipeline.normalize import MarketItem
from src.pipeline.report_generator import _quick_stats


def test_quick_stats_excludes_vintage_shop_from_trend_aggregates():
    items = [
        MarketItem(source="yahoo_auction", title="Champion スウェット", price=5000, brand="Champion"),
        MarketItem(source="mercari", title="Champion スウェット", price=6000, brand="Champion"),
        # A single high-end vintage_shop item that would badly skew a blended average.
        MarketItem(source="vintage_shop", title="Champion 40s スウェット", price=300000, brand="Champion"),
    ]
    stats = _quick_stats(items)

    assert stats["trend"]["overall"]["avg_price"] == 5500
    assert stats["trend"]["sources"] == ["manual", "mercari", "yahoo_auction"]
    assert stats["reference_benchmark"]["overall"]["avg_price"] == 300000
    assert stats["reference_benchmark"]["sources"] == ["vintage_shop"]

    # Brand ranking built from trend items only should not carry the
    # vintage_shop outlier's price into Champion's numbers.
    champion_trend = next(b for b in stats["trend"]["top_brands"] if b["brand"] == "Champion")
    assert champion_trend["avg_price"] == 5500


def test_quick_stats_top_models_breaks_down_by_brand_and_model():
    items = [
        MarketItem(source="yahoo_auction", title="x", price=8000, brand="Levi's", model="501"),
        MarketItem(source="mercari", title="y", price=12000, brand="Levi's", model="501"),
        MarketItem(source="yahoo_auction", title="z", price=4000, brand="Levi's", model="505"),
    ]
    stats = _quick_stats(items)
    models = {(m["brand"], m["model"]): m for m in stats["trend"]["top_models"]}

    assert models[("Levi's", "501")]["sold_count"] == 2
    assert models[("Levi's", "501")]["avg_price"] == 10000
    assert models[("Levi's", "505")]["sold_count"] == 1
