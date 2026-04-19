from datetime import date, timedelta

from app.services import campaign_service


_DEFAULT_CAMPAIGN_STATE = {
    "payment_status": "PENDING",
    "content_approval_status": "PENDING",
    "is_locked": False,
}


_DISPATCH_CAMPAIGNS: dict[str, dict[str, object]] = {
    "CMP-123": {
        "campaign_id": "CMP-123",
        **_DEFAULT_CAMPAIGN_STATE,
    }
}


def _email_weekday_offset(start: date, week: int) -> int:
    return (start.toordinal() + (week * 3)) % 7


class CampaignNotFoundError(ValueError):
    pass


def get_campaign_for_dispatch(campaign_id: str) -> dict[str, object]:
    existing = _DISPATCH_CAMPAIGNS.get(campaign_id)
    if existing is not None:
        return dict(existing)

    sessions = campaign_service._load_sessions()
    
    session = None
    for sid, sess in sessions.items():
        if sid.replace("SES-", "CMP-") == campaign_id or sid == campaign_id:
            session = sess
            break
    
    if session is None:
        session = sessions.get(campaign_id)
    
    if session is None:
        session = sessions.get(f"SES-{campaign_id.replace('CMP-', '')}")
    
    if session is None:
        raise CampaignNotFoundError(f"Campaign not found: {campaign_id}")

    status = session.get("status", "ACTIVE")
    
    payment_status = "COMPLETED" if status in ("ACTIVE", "PASS", "APPROVED") else "PENDING"
    content_approval_status = "APPROVED_BY_HUMAN" if status in ("PASS", "APPROVED") else "PENDING"
    is_locked = status in ("APPROVED",)

    return {
        "campaign_id": campaign_id,
        "payment_status": payment_status,
        "content_approval_status": content_approval_status,
        "is_locked": is_locked,
    }


def ensure_dispatch_gate(campaign: dict[str, object]) -> None:
    if campaign.get("payment_status") != "COMPLETED":
        raise ValueError("Payment must be completed before dispatch")
    if campaign.get("content_approval_status") != "APPROVED_BY_HUMAN":
        raise ValueError("Human approval required before dispatch")
    if not campaign.get("is_locked"):
        raise ValueError("Campaign must be locked before dispatch")


def build_schedule(start_date: str, duration_weeks: int, channels: list[str]) -> dict[str, list[str]]:
    if duration_weeks <= 0:
        raise ValueError("duration_weeks must be greater than zero")

    start = date.fromisoformat(start_date)
    schedule: dict[str, list[str]] = {}

    for channel in channels:
        if channel == "email":
            schedule[channel] = [
                (start + timedelta(weeks=week, days=_email_weekday_offset(start=start, week=week))).isoformat()
                for week in range(duration_weeks)
            ]
        elif channel == "sms":
            schedule[channel] = [(start + timedelta(weeks=week)).isoformat() for week in range(0, duration_weeks, 2)]
        else:
            raise ValueError(f"Unsupported channel: {channel}")

    return schedule


def start_dispatch(
    campaign_id: str,
    start_date: str,
    duration_weeks: int,
    channels: list[str],
) -> dict[str, object]:
    campaign = get_campaign_for_dispatch(campaign_id)
    ensure_dispatch_gate(campaign)
    schedule = build_schedule(start_date=start_date, duration_weeks=duration_weeks, channels=channels)

    return {
        "campaign_id": campaign_id,
        "status": "SCHEDULED",
        "schedule": schedule,
    }
