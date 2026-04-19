import json
from datetime import UTC, datetime, timedelta
from pathlib import Path
from uuid import uuid4

from app.models.campaign import CampaignSession


SESSION_STORAGE_FILE = Path("data/campaign_sessions.json")


class ManualReviewNotAvailableError(Exception):
    pass


def _to_utc_iso(value: datetime) -> str:
    return value.astimezone(UTC).isoformat().replace("+00:00", "Z")


def _try_parse_datetime(value: object) -> datetime | None:
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
    return None


def _canonicalize_temporal_fields(session: dict[str, object]) -> dict[str, object]:
    canonical = dict(session)
    for key in ("expires_at", "reminder_at"):
        parsed = _try_parse_datetime(canonical.get(key))
        if parsed is None:
            canonical.pop(key, None)
            continue
        canonical[key] = _to_utc_iso(parsed)
    return canonical


def _load_sessions() -> dict[str, dict]:
    if not SESSION_STORAGE_FILE.exists():
        return {}
    try:
        with SESSION_STORAGE_FILE.open("r", encoding="utf-8") as handle:
            sessions = json.load(handle)
    except (json.JSONDecodeError, OSError):
        return {}

    if not isinstance(sessions, dict):
        return {}

    normalized: dict[str, dict] = {}
    for session_id, payload in sessions.items():
        if not isinstance(session_id, str) or not isinstance(payload, dict):
            continue
        normalized[session_id] = _canonicalize_temporal_fields(payload)

    return normalized


def _save_sessions(sessions: dict[str, dict]) -> None:
    SESSION_STORAGE_FILE.parent.mkdir(parents=True, exist_ok=True)
    with SESSION_STORAGE_FILE.open("w", encoding="utf-8") as handle:
        json.dump(sessions, handle, indent=2)


def start_session(client_email: str) -> dict:
    session = CampaignSession(client_email=client_email)
    sessions = _load_sessions()
    session_payload = _canonicalize_temporal_fields(session.model_dump(mode="json"))
    sessions[session.campaign_session_id] = session_payload
    _save_sessions(sessions)
    return session_payload


def run_moderation_check(
    campaign_session_id: str,
    campaign_id: str,
    safety_score: int,
    audience_match_score: int,
) -> dict[str, int | str]:
    sessions = _load_sessions()
    session = sessions.get(campaign_session_id)
    if session is None:
        raise ValueError("Session not found")

    session["ai_attempt_count"] = int(session.get("ai_attempt_count", 0)) + 1
    ai_attempt_count = int(session["ai_attempt_count"])

    if safety_score >= 75 and audience_match_score >= 70:
        decision = "PASS"
    elif ai_attempt_count >= 3:
        decision = "MANUAL_REVIEW_OFFERED"
    else:
        decision = "REVISION_REQUIRED"

    session["latest_moderation_decision"] = decision

    sessions[campaign_session_id] = session
    _save_sessions(sessions)

    return {
        "campaign_session_id": campaign_session_id,
        "campaign_id": campaign_id,
        "decision": decision,
        "ai_attempt_count": ai_attempt_count,
    }


def set_manual_review_choice(campaign_session_id: str, accepted: bool) -> dict:
    sessions = _load_sessions()
    session = sessions.get(campaign_session_id)
    if session is None:
        raise ValueError("Session not found")

    if session.get("latest_moderation_decision") != "MANUAL_REVIEW_OFFERED":
        raise ManualReviewNotAvailableError("Manual review is not available yet")

    if accepted:
        manual_review_ticket_id = f"MREV-{uuid4().hex[:4].upper()}"
        session["status"] = "UNDER_MANUAL_REVIEW"
        session["manual_review_ticket_id"] = manual_review_ticket_id
        session.pop("expires_at", None)
        session.pop("reminder_at", None)
        reminder_hours_before_expiry = 0
    else:
        now = datetime.now(UTC)
        session["status"] = "DRAFT_HELD"
        session["manual_review_ticket_id"] = None
        session["expires_at"] = _to_utc_iso(now + timedelta(hours=12))
        session["reminder_at"] = _to_utc_iso(now + timedelta(hours=7))
        reminder_hours_before_expiry = 5

    session = _canonicalize_temporal_fields(session)
    sessions[campaign_session_id] = session
    _save_sessions(sessions)

    return {
        "campaign_session_id": campaign_session_id,
        "status": session["status"],
        "expires_at": session.get("expires_at"),
        "reminder_at": session.get("reminder_at"),
        "reminder_hours_before_expiry": reminder_hours_before_expiry,
        "manual_review_ticket_id": session.get("manual_review_ticket_id"),
    }


def generate_template(
    campaign_session_id: str,
    template_type: str,
    style_preference: str = "",
) -> dict[str, str]:
    sessions = _load_sessions()
    session = sessions.get(campaign_session_id)
    if session is None:
        raise ValueError("Session not found")

    template_id = f"TPL-{uuid4().hex[:8].upper()}"

    template_content = _generate_template_content(template_type, style_preference)

    session["template_id"] = template_id
    session["template_type"] = template_type
    session["template_content"] = template_content
    sessions[campaign_session_id] = session
    _save_sessions(sessions)

    return {
        "template_id": template_id,
        "campaign_session_id": campaign_session_id,
        "template_type": template_type,
        "content": template_content,
        "generated_at": _to_utc_iso(datetime.now(UTC)),
    }


def _generate_template_content(template_type: str, style_preference: str) -> str:
    templates = {
        "email": "Dear valued customer,\n\nWe are excited to share our latest offerings with you...\n\nBest regards",
        "sms": "Your exclusive offer awaits! Visit us today for special deals.",
        "social": "Check out our latest campaign! #SpecialOffer #ExclusiveDeal",
    }
    return templates.get(template_type, "Template content placeholder")


def resume_session(campaign_session_id: str, resume_method: str) -> dict:
    sessions = _load_sessions()
    session = sessions.get(campaign_session_id)
    if session is None:
        raise ValueError("Session not found")

    status = session.get("status", "")

    if status == "DRAFT_HELD":
        expires_at = _try_parse_datetime(session.get("expires_at"))
        if expires_at and expires_at < datetime.now(UTC):
            session["status"] = "EXPIRED"
            sessions[campaign_session_id] = session
            _save_sessions(sessions)
            return {
                "campaign_session_id": campaign_session_id,
                "status": "EXPIRED",
                "resume_token": None,
                "expires_at": None,
            }

    resume_token = f"RST-{uuid4().hex[:8].upper()}"
    session["resume_token"] = resume_token
    session["status"] = "ACTIVE"
    sessions[campaign_session_id] = session
    _save_sessions(sessions)

    return {
        "campaign_session_id": campaign_session_id,
        "status": "ACTIVE",
        "resume_token": resume_token,
        "expires_at": _to_utc_iso(datetime.now(UTC) + timedelta(hours=24)),
    }


def complete_manual_review_decision(
    campaign_session_id: str,
    decision: str,
    admin_notes: str = "",
) -> dict:
    sessions = _load_sessions()
    session = sessions.get(campaign_session_id)
    if session is None:
        raise ValueError("Session not found")

    if session.get("status") != "UNDER_MANUAL_REVIEW":
        raise ValueError("Session is not under manual review")

    if decision == "approved":
        session["status"] = "APPROVED"
        payment_link_eligible = True
        status = "APPROVED"
    else:
        session["status"] = "DRAFT_HELD"
        session["admin_notes"] = admin_notes
        payment_link_eligible = False
        status = "DRAFT_HELD"

    sessions[campaign_session_id] = session
    _save_sessions(sessions)

    return {
        "campaign_session_id": campaign_session_id,
        "status": status,
        "payment_link_eligible": payment_link_eligible,
    }
