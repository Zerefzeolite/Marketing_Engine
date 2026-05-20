import json
from pathlib import Path
from uuid import uuid4

from . import payment_service


def new_request_id() -> str:
    return f"REQ-{uuid4().hex[:8]}"


def _count_contacts() -> int:
    contacts_file = Path(__file__).resolve().parent.parent.parent.parent / "data" / "contacts.json"
    if not contacts_file.exists():
        return 0
    with open(contacts_file) as f:
        try:
            contacts = json.load(f)
            return len(contacts) if isinstance(contacts, dict) else 0
        except (json.JSONDecodeError, TypeError):
            return 0


def _channel_breakdown() -> dict[str, int]:
    contacts_file = Path(__file__).resolve().parent.parent.parent.parent / "data" / "contacts.json"
    counts: dict[str, int] = {"email": 0, "sms": 0, "both": 0}
    if not contacts_file.exists():
        return counts
    with open(contacts_file) as f:
        try:
            contacts = json.load(f)
        except (json.JSONDecodeError, TypeError):
            return counts
    if not isinstance(contacts, dict):
        return counts
    for contact in contacts.values():
        channel = contact.get("preferred_channel", "email")
        if channel in counts:
            counts[channel] += 1
    return counts


_INTAKE_FILE = Path(__file__).resolve().parent.parent.parent.parent / "data" / "intake_requests.json"


def _load_intake() -> dict:
    if not _INTAKE_FILE.exists():
        return {}
    with open(_INTAKE_FILE) as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return {}


def _save_intake(data: dict) -> None:
    _INTAKE_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(_INTAKE_FILE, "w") as f:
        json.dump(data, f, indent=2)


def save_submission(request_id: str, payload: dict) -> None:
    intake = _load_intake()
    intake[request_id] = {
        "request_id": request_id,
        "business_name": payload.get("business_name", ""),
        "contact_email": payload.get("contact_email", ""),
        "campaign_objective": payload.get("campaign_objective", ""),
        "preferred_channel": payload.get("preferred_channel", "email"),
        "budget_min": payload.get("budget_min", 0),
        "budget_max": payload.get("budget_max"),
    }
    _save_intake(intake)


def estimate_summary(request_id: str) -> dict[str, int | str]:
    contact_count = _count_contacts()
    channels = _channel_breakdown()
    total_opted = channels["email"] + channels["sms"] + channels["both"]

    email_count = channels["email"] + channels["both"]
    sms_count = channels["sms"] + channels["both"]

    estimated = max(contact_count, 100)
    confidence = "high" if contact_count > 500 else ("medium" if contact_count > 50 else "low")

    return {
        "schema_version": "1.0",
        "request_id": request_id,
        "estimated_reachable": estimated,
        "channel_split": f"email: {email_count}, sms: {sms_count}",
        "total_contacts": contact_count,
        "confidence": confidence,
    }


def recommend_summary(estimated_reachable: int, budget_min: int) -> dict[str, str]:
    if estimated_reachable >= 1500 or budget_min >= 12000:
        package = "premium"
    elif estimated_reachable >= 800 or budget_min >= 5000:
        package = "growth"
    else:
        package = "starter"

    return {
        "schema_version": "1.0",
        "recommended_package": package,
        "rationale_summary": "Recommendation is based on budget and projected reach.",
    }


def get_flow_status(request_id: str) -> dict:
    """
    Returns the current flow status for a request.
    Shows what step the client is on and what's needed next.
    """
    has_consent = payment_service.has_consent(request_id)
    payment = payment_service.get_payment_by_request_id(request_id)
    payment_verified = payment_service.is_payment_verified(request_id) if payment else False
    
    if not has_consent:
        return {
            "schema_version": "1.0",
            "request_id": request_id,
            "current_step": "consent",
            "next_action": "Record consent",
            "warning": None,
        }
    
    if not payment:
        return {
            "schema_version": "1.0",
            "request_id": request_id,
            "current_step": "payment",
            "next_action": "Submit payment",
            "warning": None,
        }
    
    if not payment_verified:
        wait_warning = (
            "Bank transfer requires verification (24-48 hrs). "
            "Your campaign will launch after approval."
        )
        return {
            "schema_version": "1.0",
            "request_id": request_id,
            "current_step": "verification",
            "next_action": "Await admin approval",
            "warning": wait_warning,
        }
    
    return {
        "schema_version": "1.0",
        "request_id": request_id,
        "current_step": "ready",
        "next_action": "Execute campaign",
        "warning": None,
    }
