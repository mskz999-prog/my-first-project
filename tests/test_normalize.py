import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.pipeline.normalize import MarketItem, dedupe, load_manual_csv, to_summary_json


def test_dedupe_removes_exact_duplicates():
    items = [
        MarketItem(source="manual", title="A", price=1000, url="http://x/1"),
        MarketItem(source="manual", title="A", price=1000, url="http://x/1"),
        MarketItem(source="manual", title="B", price=2000, url="http://x/2"),
    ]
    result = dedupe(items)
    assert len(result) == 2


def test_load_manual_csv_template_parses():
    path = Path(__file__).resolve().parent.parent / "data" / "manual" / "items_template.csv"
    items = load_manual_csv(path)
    assert len(items) == 1
    assert items[0].brand == "Champion"
    assert items[0].price == 8500
    assert items[0].tags == ["90s", "刺繍ロゴ", "アメカジ"]


def test_to_summary_json_is_valid_json_array():
    items = [MarketItem(source="manual", title="A", price=1000)]
    payload = to_summary_json(items)
    assert payload.startswith("[")
    assert "A" in payload


def test_to_summary_json_caps_item_count():
    items = [MarketItem(source="manual", title=f"item-{i}", price=i) for i in range(10)]
    payload = to_summary_json(items, max_items=3)
    import json

    parsed = json.loads(payload)
    assert len(parsed) == 3
