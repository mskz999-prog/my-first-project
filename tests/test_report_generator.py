import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.pipeline.normalize import MarketItem
from src.pipeline.report_generator import (
    TREND_HISTORY_DIR,
    TREND_HISTORY_FILE,
    _quick_stats,
    _save_levis_weekly_snapshot,
    _week_start,
)


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


def test_quick_stats_top_variants_breaks_down_by_era_tag_and_counts_multi_tag_items_once_per_tag():
    items = [
        # A plain 501 vs. a rare 赤耳+ビッグE 501 — same model, wildly different market.
        MarketItem(source="yahoo_auction", title="x", price=8000, brand="Levi's", model="501", tags=[]),
        MarketItem(
            source="mercari", title="y", price=280000, brand="Levi's", model="501", tags=["赤耳", "ビッグE"]
        ),
    ]
    stats = _quick_stats(items)
    variants = {(v["brand"], v["model"], v["tag"]): v for v in stats["trend"]["top_variants"]}

    assert variants[("Levi's", "501", "赤耳")]["sold_count"] == 1
    assert variants[("Levi's", "501", "赤耳")]["avg_price"] == 280000
    assert variants[("Levi's", "501", "ビッグE")]["avg_price"] == 280000
    # The untagged item contributes to top_models but not top_variants.
    assert ("Levi's", "501", "") not in variants


def test_week_start_returns_the_monday_of_the_containing_week():
    # 2026-09-03 is a Thursday; that week's Monday is 2026-08-31.
    assert _week_start("2026-09-03T09:05:00+09:00") == "2026-08-31"
    # 2026-08-31 is itself a Monday.
    assert _week_start("2026-08-31T00:00:00+09:00") == "2026-08-31"


def test_week_start_returns_none_for_unparseable_timestamp():
    assert _week_start("not-a-date") is None


def test_save_levis_weekly_snapshot_buckets_by_real_sold_week(tmp_path):
    items = [
        # Two Levi's yahoo_auction items in the same week (Mon 2026-08-31).
        MarketItem(
            source="yahoo_auction", title="x", price=8000, brand="Levi's", model="501",
            sold_at="2026-09-01T09:00:00+09:00",
        ),
        MarketItem(
            source="yahoo_auction", title="y", price=12000, brand="Levi's", model="501",
            sold_at="2026-09-03T20:00:00+09:00",
        ),
        # A different week (Mon 2026-08-24).
        MarketItem(
            source="yahoo_auction", title="z", price=4000, brand="Levi's", model="505",
            sold_at="2026-08-26T12:00:00+09:00",
        ),
        # Not Levi's — must not leak into the snapshot.
        MarketItem(
            source="yahoo_auction", title="w", price=6000, brand="Champion",
            sold_at="2026-09-01T09:00:00+09:00",
        ),
        # Levi's but from mercari (no real sold date available) — must be
        # excluded entirely rather than bucketed under some fake week.
        MarketItem(source="mercari", title="v", price=9000, brand="Levi's", model="501"),
    ]

    _save_levis_weekly_snapshot(items, tmp_path, "focus-levis")

    history_path = tmp_path / TREND_HISTORY_DIR / TREND_HISTORY_FILE
    assert TREND_HISTORY_FILE == "levis_weekly.jsonl"
    lines = [json.loads(line) for line in history_path.read_text(encoding="utf-8").strip().splitlines()]
    by_week = {entry["week_start"]: entry for entry in lines}

    assert set(by_week) == {"2026-08-24", "2026-08-31"}
    assert by_week["2026-08-31"]["mode"] == "focus-levis"
    assert by_week["2026-08-31"]["levis_overall"]["sold_count"] == 2
    assert by_week["2026-08-31"]["levis_overall"]["avg_price"] == 10000
    assert [m["model"] for m in by_week["2026-08-31"]["top_models"]] == ["501"]
    assert by_week["2026-08-24"]["levis_overall"]["sold_count"] == 1
    assert by_week["2026-08-24"]["levis_overall"]["avg_price"] == 4000


def test_save_levis_weekly_snapshot_skips_when_nothing_qualifies(tmp_path):
    items = [
        MarketItem(source="mercari", title="y", price=6000, brand="Levi's", model="501"),
        MarketItem(source="yahoo_auction", title="z", price=4000, brand="Champion"),
    ]

    _save_levis_weekly_snapshot(items, tmp_path, "weekly")

    assert not (tmp_path / TREND_HISTORY_DIR / TREND_HISTORY_FILE).exists()
