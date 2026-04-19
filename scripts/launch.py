#!/usr/bin/env python3
"""
Marketing Engine Launcher

Starts both backend and frontend servers for development/testing.
"""
import subprocess
import sys
import time
import webbrowser
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.resolve()
BACKEND_DIR = PROJECT_ROOT / "apps" / "backend"
FRONTEND_DIR = PROJECT_ROOT / "apps" / "frontend"


def print_status(msg: str) -> None:
    print(f"[launcher] {msg}")


def main():
    print_status("Marketing Engine Launcher")
    print("=" * 40)

    # Seed data first
    print_status("Seeding analytics data...")
    seed_result = subprocess.run(
        [sys.executable, "scripts/seed_phase13_analytics.py", "--profile", "pilot", "--reset"],
        cwd=PROJECT_ROOT,
        capture_output=True,
    )
    if seed_result.returncode == 0:
        print_status("Analytics data seeded")
    else:
        print_status(f"Seed warning: {seed_result.stderr.decode()}")

    # Start backend
    print_status("Starting backend (port 8000)...")
    backend = subprocess.Popen(
        ["uvicorn", "app.main:app", "--reload", "--port", "8000"],
        cwd=BACKEND_DIR,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )

    # Start frontend
    print_status("Starting frontend (port 3000)...")
    frontend = subprocess.Popen(
        ["pnpm", "dev"],
        cwd=FRONTEND_DIR,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )

    # Wait for servers
    print_status("Waiting for servers to start...")
    time.sleep(5)

    print("=" * 40)
    print_status("Servers running!")
    print("")
    print("Endpoints:")
    print("  Frontend: http://localhost:3000")
    print("  Backend: http://localhost:8000")
    print("  API Docs: http://localhost:8000/docs")
    print("")
    print("Pages to test:")
    print("  http://localhost:3000/analytics")
    print("  http://localhost:3000/quality-gate")
    print("  http://localhost:3000/campaign-execute?requestId=CMP-PILOT-001")
    print("")
    print("Press Ctrl+C to stop servers")

    # Open browser
    try:
        webbrowser.open("http://localhost:3000/analytics")
    except:
        pass

    try:
        backend.wait()
    except KeyboardInterrupt:
        print_status("Stopping servers...")
        backend.terminate()
        frontend.terminate()
        backend.wait()
        frontend.wait()
        print_status("Servers stopped")
        sys.exit(0)


if __name__ == "__main__":
    main()