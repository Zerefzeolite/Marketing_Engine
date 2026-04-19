#!/usr/bin/env python3
"""
Marketing Engine Launcher

Run this to seed data and get instructions for starting the app.
"""
import subprocess
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.resolve()


def main():
    print("=" * 50)
    print("Marketing Engine - Quick Start")
    print("=" * 50)
    print()

    # Seed data
    print("[1/3] Seeding analytics data...")
    seed_script = PROJECT_ROOT / "scripts" / "seed_phase13_analytics.py"
    result = subprocess.run(
        [sys.executable, str(seed_script), "--profile", "pilot", "--reset"],
        capture_output=True,
    )
    if result.returncode == 0:
        print("       Done!")
    else:
        print(f"       Warning: {result.stderr.decode()[:100]}")

    print()
    print("[2/3] Starting backend...")
    print("       Command: cd apps/backend && uvicorn app.main:app --reload --port 8000")
    print()
    print("[3/3] Starting frontend...")
    print("       Command: cd apps/frontend && pnpm dev")
    print()
    print("=" * 50)
    print("ENDPOINTS TO TEST")
    print("=" * 50)
    print()
    print("Frontend Pages:")
    print("  http://localhost:3000/analytics")
    print("  http://localhost:3000/quality-gate")
    print("  http://localhost:3000/campaign-execute?requestId=CMP-PILOT-001")
    print()
    print("API Endpoints (see http://localhost:8000/docs for all):")
    print("  GET  /api/campaigns/aggregated     # Analytics data")
    print("  GET  /api/campaigns/scheduled     # Scheduled campaigns")
    print("  POST /api/campaigns/{id}/schedule # Schedule campaign")
    print("  POST /api/campaigns/{id}/execute  # Execute campaign")
    print("  GET  /api/campaigns/executions    # Execution history")
    print("  GET  /api/contacts               # Contact list")
    print("  POST /api/contacts/import        # Import contacts")
    print("  GET  /api/notifications          # Notification log")
    print()


if __name__ == "__main__":
    main()