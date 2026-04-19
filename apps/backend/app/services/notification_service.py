from datetime import UTC, datetime
from pathlib import Path
import json
from uuid import uuid4

SERVICE_FILE = Path(__file__).resolve()
DATA_DIR = SERVICE_FILE.parent.parent.parent.parent.parent / "data"

NOTIFICATIONS_FILE = DATA_DIR / "notifications.json"


def _load_notifications() -> dict:
    if not NOTIFICATIONS_FILE.exists():
        return {}
    with open(NOTIFICATIONS_FILE) as f:
        return json.load(f)


def _save_notifications(notifications: dict) -> None:
    NOTIFICATIONS_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(NOTIFICATIONS_FILE, "w") as f:
        json.dump(notifications, f, indent=2)


def send_notification(
    type: str,
    title: str,
    message: str,
    campaign_id: str | None = None,
    recipient: str | None = None,
) -> dict:
    notifications = _load_notifications()
    notification_id = f"NOTIF-{uuid4().hex[:8].upper()}"
    now = datetime.now(UTC).isoformat()
    notifications[notification_id] = {
        "notification_id": notification_id,
        "type": type,
        "title": title,
        "message": message,
        "campaign_id": campaign_id,
        "recipient": recipient,
        "status": "sent",
        "sent_at": now,
    }
    _save_notifications(notifications)
    return notifications[notification_id]


def on_campaign_executed(campaign_id: str, contacts_delivered: int) -> dict:
    return send_notification(
        type="campaign_executed",
        title="Campaign Executed",
        message=f"Campaign {campaign_id} has been executed. {contacts_delivered} contacts delivered.",
        campaign_id=campaign_id,
    )


def on_campaign_completed(campaign_id: str, success_count: int, error_count: int) -> dict:
    return send_notification(
        type="campaign_completed",
        title="Campaign Completed",
        message=f"Campaign {campaign_id} completed. {success_count} successful, {error_count} errors.",
        campaign_id=campaign_id,
    )


def on_campaign_failed(campaign_id: str, error: str) -> dict:
    return send_notification(
        type="campaign_failed",
        title="Campaign Failed",
        message=f"Campaign {campaign_id} failed: {error}",
        campaign_id=campaign_id,
    )


def list_notifications(
    campaign_id: str | None = None,
    limit: int = 50,
) -> list[dict]:
    notifications = _load_notifications()
    result = list(notifications.values())
    if campaign_id:
        result = [n for n in result if n.get("campaign_id") == campaign_id]
    return sorted(result, key=lambda x: x.get("sent_at", ""), reverse=True)[:limit]