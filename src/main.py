"""CLI entrypoint for the vintage-resale content automation pipeline.

Usage:
    python -m src.main run                 # collect data + generate report
    python -m src.main collect              # collect data only (saves data/raw/*.jsonl)
    python -m src.main report --input FILE  # generate report from a saved jsonl file
    python -m src.main run --quick          # fast test run: sample brands + full item_keywords
    python -m src.main run --brands "Levi's"  # focused single/few-brand test run
"""
from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path

import yaml
from dotenv import load_dotenv

from src.pipeline.collect import collect_all
from src.pipeline.normalize import load_jsonl
from src.pipeline.report_generator import generate_report

PROJECT_ROOT = Path(__file__).resolve().parent.parent
CONFIG_PATH = PROJECT_ROOT / "config" / "config.yaml"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


def load_config() -> dict:
    with CONFIG_PATH.open("r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def _parse_brands(raw: str | None) -> list[str] | None:
    if not raw:
        return None
    return [b.strip() for b in raw.split(",") if b.strip()]


def cmd_collect(args: argparse.Namespace) -> None:
    config = load_config()
    items, saved_path = collect_all(config, PROJECT_ROOT, quick=args.quick, brands=_parse_brands(args.brands))
    logger.info("Collected %d normalized items.", len(items))
    # Printed on its own to stdout (separate from the logging output above,
    # which goes through the logging formatter) so a caller/CI step can
    # capture just the path, e.g. `LATEST=$(python -m src.main collect | tail -1)`.
    print(saved_path)


def cmd_report(args: argparse.Namespace) -> None:
    config = load_config()
    brands = _parse_brands(args.brands)
    if args.input:
        items = load_jsonl(Path(args.input))
        if not items:
            logger.error("No items found in %s", args.input)
            sys.exit(1)
    else:
        items, _saved_path = collect_all(config, PROJECT_ROOT, quick=args.quick, brands=brands)

    if not items:
        logger.error(
            "No market data available from any source (scrapers + manual). "
            "Add data to data/manual/ or check scraper configuration."
        )
        sys.exit(1)

    output_path = generate_report(items, config, PROJECT_ROOT, quick=args.quick, focus_brands=brands)
    print(output_path)


def cmd_run(args: argparse.Namespace) -> None:
    cmd_report(args)


def main() -> None:
    load_dotenv(PROJECT_ROOT / ".env")

    parser = argparse.ArgumentParser(description="Vintage resale content automation")
    subparsers = parser.add_subparsers(dest="command", required=True)

    quick_help = (
        "Restrict config/brand_catalog.yaml to a small representative brand "
        "sample (item_keywords stays in full) for a fast end-to-end test run "
        "— minutes instead of hours. See collect.QUICK_SAMPLE_TIERS."
    )
    brands_help = (
        "Comma-separated exact brand_catalog.yaml brand name(s), e.g. "
        "\"Levi's\" or \"Levi's,Wrangler\" — replaces the whole keyword set "
        "with just that brand's catalog combos/aliases (no config.yaml "
        "keywords, no item_keywords) for a narrow, fast, directly-"
        "inspectable test run. Takes priority over --quick."
    )

    p_collect = subparsers.add_parser("collect", help="Collect market data only")
    p_collect.add_argument("--quick", action="store_true", help=quick_help)
    p_collect.add_argument("--brands", help=brands_help, default=None)
    p_collect.set_defaults(func=cmd_collect)

    p_report = subparsers.add_parser("report", help="Generate report (collect + generate, or from --input)")
    p_report.add_argument("--input", help="Path to a saved data/raw/*.jsonl file", default=None)
    p_report.add_argument("--quick", action="store_true", help=quick_help + " (ignored with --input)")
    p_report.add_argument("--brands", help=brands_help + " (collection scope ignored with --input)", default=None)
    p_report.set_defaults(func=cmd_report)

    p_run = subparsers.add_parser("run", help="Full pipeline: collect + generate report")
    p_run.add_argument("--input", help="Path to a saved data/raw/*.jsonl file (skips collection)", default=None)
    p_run.add_argument("--quick", action="store_true", help=quick_help + " (ignored with --input)")
    p_run.add_argument("--brands", help=brands_help + " (collection scope ignored with --input)", default=None)
    p_run.set_defaults(func=cmd_run)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
