from datetime import UTC, datetime
from pathlib import Path
import json
from uuid import uuid4

def _get_data_dir() -> Path:
    cwd = Path.cwd()
    for _ in range(5):
        if (cwd / "data").exists():
            return cwd / "data"
        cwd = cwd.parent
    return Path("data")

DATA_DIR = _get_data_dir()
SCHEDULER_FILE = DATA_DIR / "campaign_schedules.json"


def _load_schedules() -> dict:
    if not SCHEDULER_FILE.exists():
        return {}
    with open(SCHEDULER_FILE) as f:
        return json.load(f)


def _save_schedules(schedules: dict) -> None:
    SCHEDULER_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(SCHEDULER_FILE, "w") as f:
        json.dump(schedules, f, indent=2)


def schedule_campaign(campaign_id: str, scheduled_at: datetime, timezone: str = "UTC") -> dict:
    schedules = _load_schedules()
    schedules[campaign_id] = {
        "campaign_id": campaign_id,
        "scheduled_at": scheduled_at.isoformat(),
        "timezone": timezone,
        "status": "scheduled",
    }
    _save_schedules(schedules)
    return schedules[campaign_id]


def get_scheduled_campaigns() -> list[dict]:
    schedules = _load_schedules()
    return list(schedules.values())


def get_due_campaigns() -> list[dict]:
    schedules = _load_schedules()
    now = datetime.now(UTC)
    due = []
    for campaign in schedules.values():
        scheduled = datetime.fromisoformat(campaign["scheduled_at"].replace("Z", "+00:00"))
        if campaign["status"] == "scheduled" and scheduled <= now:
            due.append(campaign)
    return due


def cancel_scheduled(campaign_id: str) -> dict | None:
    schedules = _load_schedules()
    if campaign_id in schedules:
        schedules[campaign_id]["status"] = "cancelled"
        _save_schedules(schedules)
        return schedules[campaign_id]
    return None


def mark_executing(campaign_id: str) -> dict | None:
    schedules = _load_schedules()
    if campaign_id in schedules:
        schedules[campaign_id]["status"] = "executing"
        _save_schedules(schedules)
        return schedules[campaign_id]
    return None


def mark_completed(campaign_id: str) -> dict | None:
    schedules = _load_schedules()
    if campaign_id in schedules:
        schedules[campaign_id]["status"] = "completed"
        _save_schedules(schedules)
        return schedules[campaign_id]
    return None


def mark_failed(campaign_id: str) -> dict | None:
    schedules = _load_schedules()
    if campaign_id in schedules:
        schedules[campaign_id]["status"] = "failed"
        _save_schedules(schedules)
        return schedules[campaign_id]
    return None


def execute_due_campaigns() -> list[dict]:
    """Find and execute all due campaigns."""
    from app.services import dispatch_service, execution_service

    due = get_due_campaigns()
    results = []
    for campaign in due:
        campaign_id = campaign["campaign_id"]
        mark_executing(campaign_id)
        try:
            campaign = dispatch_service.get_campaign_for_dispatch(campaign_id)
            dispatch_service.ensure_dispatch_gate(campaign)
            exec_record = execution_service.start_execution(campaign_id)
            execution_service.complete_execution(
                execution_id=exec_record["execution_id"],
                contacts_attempted=0,
                contacts_delivered=0,
                errors=[],
            )
            mark_completed(campaign_id)
            results.append({"campaign_id": campaign_id, "status": "completed"})
        except Exception as e:
            mark_failed(campaign_id)
            results.append({"campaign_id": campaign_id, "status": "failed", "error": str(e)})
    return results