from datetime import UTC, datetime
from pathlib import Path
import json
from uuid import uuid4

SERVICE_FILE = Path(__file__).resolve()
DATA_DIR = SERVICE_FILE.parent.parent.parent.parent.parent / "data"

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
    """Find and execute all due campaigns with actual message dispatch."""
    from app.services import dispatch_service, execution_service, campaign_service, contact_service

    due = get_due_campaigns()
    results = []
    for campaign in due:
        campaign_id = campaign["campaign_id"]
        mark_executing(campaign_id)
        try:
            campaign = dispatch_service.get_campaign_for_dispatch(campaign_id)
            dispatch_service.ensure_dispatch_gate(campaign)

            sessions = campaign_service._load_sessions()
            session = sessions.get(campaign_id)
            if not session:
                session = next(
                    (s for sid, s in sessions.items() if sid.replace("SES-", "CMP-") == campaign_id),
                    None,
                )
            if not session:
                raise ValueError(f"Session not found for campaign {campaign_id}")

            reach_limit = session.get("estimated_reachable", 100)
            contacts = contact_service.list_contacts(
                limit=reach_limit, offset=0, include_opt_out=False,
            )
            if not contacts:
                raise ValueError(f"No contacts available for campaign {campaign_id}")

            exec_record = execution_service.start_execution(
                campaign_id=campaign_id,
                session_id=session.get("id", campaign_id),
            )
            contact_ids = execution_service.get_execution_contacts(exec_record["execution_id"]) or []

            stats = execution_service.dispatch_campaign(
                session_id=session.get("id", campaign_id),
                session=session,
                contact_ids=contact_ids,
            )

            recipient_email = session.get("client_email")
            execution_service.complete_execution(
                execution_id=exec_record["execution_id"],
                contacts_attempted=len(contact_ids),
                contacts_delivered=stats["contacts_delivered"],
                errors=stats["errors"],
                recipient=recipient_email,
            )
            mark_completed(campaign_id)
            results.append({
                "campaign_id": campaign_id,
                "status": "completed",
                "contacts_attempted": len(contact_ids),
                "contacts_delivered": stats["contacts_delivered"],
                "email_sent": stats["email_sent"],
                "sms_sent": stats["sms_sent"],
            })
        except Exception as e:
            mark_failed(campaign_id)
            results.append({"campaign_id": campaign_id, "status": "failed", "error": str(e)})
    return results