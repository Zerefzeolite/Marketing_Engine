#!/usr/bin/env python3
"""
Phase 13 analytics data seed script.

Usage:
    python scripts/seed_phase13_analytics.py --profile pilot --reset
    python scripts/seed_phase13_analytics.py --profile growth --reset
"""
import argparse
import json
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent.resolve()
PROJECT_ROOT = SCRIPT_DIR.parent
DATA_DIR = PROJECT_ROOT / "data"
FIXTURES_DIR = DATA_DIR / "fixtures"
RUNTIME_FILE = DATA_DIR / "campaign_metrics.json"


def load_fixture(profile: str) -> dict:
    fixture_path = FIXTURES_DIR / f"analytics_{profile}.json"
    if not fixture_path.exists():
        raise FileNotFoundError(f"Fixture not found: {fixture_path}")
    with open(fixture_path) as f:
        return json.load(f)


def reset_analytics(fixture: dict) -> None:
    campaigns = fixture.get("campaigns", [])
    metrics = {}
    for campaign in campaigns:
        campaign_id = campaign.get("campaign_id")
        if campaign_id:
            metrics[campaign_id] = campaign
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(RUNTIME_FILE, "w") as f:
        json.dump(metrics, f, indent=2)
    print(f"Reset analytics with {len(metrics)} campaigns from {fixture.get('profile', 'unknown')} profile")


def main():
    parser = argparse.ArgumentParser(description="Seed Phase 13 analytics data")
    parser.add_argument("--profile", required=True, choices=["pilot", "growth"], help="Seed profile")
    parser.add_argument("--reset", action="store_true", help="Reset analytics before seeding")
    args = parser.parse_args()

    fixture = load_fixture(args.profile)
    if args.reset:
        reset_analytics(fixture)
    else:
        raise ValueError("--reset is required for deterministic seeding")


if __name__ == "__main__":
    main()