"""CLI entrypoint for the vintage-resale content automation pipeline.

Usage:
    python -m src.main run                 # collect data + generate report
    python -m src.main collect              # collect data only (saves data/raw/*.jsonl)
    python -m src.main report --input FILE  # generate report from a saved jsonl file
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


def cmd_collect(_args: argparse.Namespace) -> None:
    config = load_config()
    items = collect_all(config, PROJECT_ROOT)
    logger.info("Collected %d normalized items (saved under data/raw/).", len(items))


def cmd_report(args: argparse.Namespace) -> None:
    config = load_config()
    if args.input:
        items = load_jsonl(Path(args.input))
        if not items:
            logger.error("No items found in %s", args.input)
            sys.exit(1)
    else:
        items = collect_all(config, PROJECT_ROOT)

    if not items:
        logger.error(
            "No market data available from any source (scrapers + manual). "
            "Add data to data/manual/ or check scraper configuration."
        )
        sys.exit(1)

    output_path = generate_report(items, config, PROJECT_ROOT)
    print(output_path)


def cmd_run(args: argparse.Namespace) -> None:
    cmd_report(args)


def main() -> None:
    load_dotenv(PROJECT_ROOT / ".env")

    parser = argparse.ArgumentParser(description="Vintage resale content automation")
    subparsers = parser.add_subparsers(dest="command", required=True)

    p_collect = subparsers.add_parser("collect", help="Collect market data only")
    p_collect.set_defaults(func=cmd_collect)

    p_report = subparsers.add_parser("report", help="Generate report (collect + generate, or from --input)")
    p_report.add_argument("--input", help="Path to a saved data/raw/*.jsonl file", default=None)
    p_report.set_defaults(func=cmd_report)

    p_run = subparsers.add_parser("run", help="Full pipeline: collect + generate report")
    p_run.add_argument("--input", help="Path to a saved data/raw/*.jsonl file (skips collection)", default=None)
    p_run.set_defaults(func=cmd_run)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
