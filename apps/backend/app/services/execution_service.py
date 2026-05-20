import asyncio
from datetime import UTC, datetime
from pathlib import Path
import json
from uuid import uuid4

SERVICE_FILE = Path(__file__).resolve()
DATA_DIR = SERVICE_FILE.parent.parent.parent.parent / "data"

EXECUTIONS_FILE = DATA_DIR / "executions.json"
EXECUTION_CONTACTS_FILE = DATA_DIR / "execution_contacts.json"
CONTACTS_FILE = DATA_DIR / "contacts.json"
SESSIONS_FILE = DATA_DIR / "sessions.json"


def _load_json(file_path: Path) -> dict:
    if not file_path.exists():
        return {}
    with open(file_path) as f:
        return json.load(f)


def _save_json(file_path: Path, data: dict) -> None:
    file_path.parent.mkdir(parents=True, exist_ok=True)
    with open(file_path, "w") as f:
        json.dump(data, f, indent=2)


def start_execution(campaign_id: str, session_id: str | None = None) -> dict:
    """Start a new campaign execution, selecting and storing contact IDs."""
    # Load contacts
    contacts = _load_json(CONTACTS_FILE)
    
    # Select contacts for this campaign
    selected_contact_ids = _select_contacts(campaign_id, contacts, session_id)
    
    execution_id = f"EXEC-{uuid4().hex[:8].upper()}"
    now = datetime.now(UTC).isoformat()
    
    execution_record = {
        "execution_id": execution_id,
        "campaign_id": campaign_id,
        "session_id": session_id,
        "status": "RUNNING",
        "contact_ids": selected_contact_ids,  # Store exact contact IDs
        "total_contacts": len(selected_contact_ids),
        "started_at": now,
        "completed_at": None,
        "errors": [],
    }
    
    # Save execution record
    executions = _load_json(EXECUTIONS_FILE)
    executions[execution_id] = execution_record
    _save_json(EXECUTIONS_FILE, executions)
    
    # Save execution-to-contact mapping
    exec_contacts = _load_json(EXECUTION_CONTACTS_FILE)
    exec_contacts[execution_id] = {
        "execution_id": execution_id,
        "contact_ids": selected_contact_ids,
        "campaign_id": campaign_id,
        "created_at": now,
    }
    _save_json(EXECUTION_CONTACTS_FILE, exec_contacts)
    
    return execution_record


def _select_contacts(campaign_id: str, contacts: dict, session_id: str | None = None) -> list[str]:
    """
    Select contacts for campaign execution.
    - Excludes opt-outs
    - Respects preferred channel
    - Enforces reach limit from session
    - Avoids duplicates (by email)
    """
    # Get session data for reach limit and channel
    sessions = _load_json(SESSIONS_FILE)
    session = sessions.get(session_id, {}) if session_id else {}
    
    reach_limit = session.get("estimated_reachable", 1000)
    channel_split = session.get("channel_split", "email: 100%")
    
    # Determine preferred channel filter
    preferred_channel = None
    if "email: 100%" in channel_split:
        preferred_channel = "email"
    elif "sms: 100%" in channel_split:
        preferred_channel = "sms"
    # If "both" or split, no filter (include all)
    
    # Select contacts
    selected = []
    seen_emails = set()
    
    for contact_id, contact in contacts.items():
        # Skip opt-outs
        if contact.get("opt_out", False):
            continue
        
        # Skip duplicates by email
        email = contact.get("email", "")
        if email in seen_emails:
            continue
        seen_emails.add(email)
        
        # Filter by preferred channel (if specified)
        if preferred_channel:
            contact_channel = contact.get("preferred_channel")
            if contact_channel and contact_channel != preferred_channel:
                # Contact has a different preferred channel, skip
                continue
        
        selected.append(contact_id)
        
        # Enforce reach limit
        if len(selected) >= reach_limit:
            break
    
    return selected


def get_execution_history(campaign_id: str | None = None) -> list[dict]:
    executions = _load_json(EXECUTIONS_FILE)
    result = list(executions.values())
    
    if campaign_id:
        result = [e for e in result if e.get("campaign_id") == campaign_id]
    
    # Sort by started_at descending
    result.sort(key=lambda x: x.get("started_at", ""), reverse=True)
    return result


def get_execution_contacts(execution_id: str) -> list[str] | None:
    """Get the contact IDs used in a specific execution."""
    exec_contacts = _load_json(EXECUTION_CONTACTS_FILE)
    record = exec_contacts.get(execution_id)
    if record:
        return record.get("contact_ids", [])
    return None


def complete_execution(
    execution_id: str,
    contacts_attempted: int,
    contacts_delivered: int,
    errors: list[str],
    recipient: str | None = None,
) -> dict:
    executions = _load_json(EXECUTIONS_FILE)
    
    if execution_id not in executions:
        raise ValueError(f"Execution {execution_id} not found")
    
    execution = executions[execution_id]
    execution["status"] = "COMPLETED"
    execution["contacts_attempted"] = contacts_attempted
    execution["contacts_delivered"] = contacts_delivered
    execution["errors"] = errors
    execution["completed_at"] = datetime.now(UTC).isoformat()
    
    executions[execution_id] = execution
    _save_json(EXECUTIONS_FILE, executions)

    from app.services import notification_service
    if errors:
        notification_service.on_campaign_failed(
            campaign_id=execution.get("campaign_id", "unknown"),
            error=errors[0],
        )
    else:
        notification_service.on_campaign_completed(
            campaign_id=execution.get("campaign_id", "unknown"),
            success_count=contacts_delivered,
            error_count=len(errors),
        )

    if recipient:
        notification_service.send_notification(
            type="execution_report",
            title="Campaign Execution Report",
            message=f"Campaign completed. {contacts_delivered}/{contacts_attempted} delivered.",
            recipient=recipient,
        )
    
    return execution


def dispatch_campaign(
    session_id: str,
    session: dict,
    contact_ids: list[str],
) -> dict:
    """
    Dispatch email/SMS to contacts for a campaign session.

    Returns delivery stats dict with keys:
      contacts_delivered, contacts_failed, email_sent, sms_sent, errors
    """
    import asyncio

    contacts_delivered = 0
    errors: list[str] = []
    email_sent = 0
    sms_sent = 0

    async def _dispatch_all():
        nonlocal contacts_delivered, errors, email_sent, sms_sent
        from app.services.email_service import email_service
        from app.services.sms_service import sms_service
        from app.services import analytics_service, contact_service

        template_content = session.get("template_content", "")

        for cid in contact_ids:
            contact = contact_service.get_contact(cid)
            if not contact:
                continue

            preferred = contact.get("preferred_channel", "email")
            sent_any = False

            if preferred in ("email", "both"):
                email = contact.get("email", "")
                if email:
                    try:
                        result = await email_service.send_email(
                            to_email=email,
                            subject="Campaign from Marketing Engine",
                            html_content=template_content or "<p>Your campaign message</p>",
                        )
                        if result.get("status") in ("sent", "mock"):
                            sent_any = True
                            email_sent += 1
                            analytics_service.record_event(session_id, cid, "SENT")
                        else:
                            errors.append(f"{cid}: Email failed - {result.get('error', 'unknown')}")
                            analytics_service.record_event(session_id, cid, "FAILED")
                    except Exception as e:
                        errors.append(f"{cid}: Email exception - {str(e)}")
                        analytics_service.record_event(session_id, cid, "FAILED")

            if preferred in ("sms", "both"):
                phone = contact.get("phone", "")
                if phone:
                    sms_body = template_content[:160] if template_content else "Your campaign message"
                    try:
                        result = await sms_service.send_sms(phone, sms_body)
                        if result.get("status") in ("sent", "mock"):
                            sent_any = True
                            sms_sent += 1
                            analytics_service.record_event(session_id, cid, "SENT")
                        elif result.get("status") == "skipped":
                            pass
                        else:
                            errors.append(f"{cid}: SMS failed - {result.get('error', 'unknown')}")
                            analytics_service.record_event(session_id, cid, "FAILED")
                    except Exception as e:
                        errors.append(f"{cid}: SMS exception - {str(e)}")
                        analytics_service.record_event(session_id, cid, "FAILED")

            if sent_any:
                contacts_delivered += 1

    asyncio.run(_dispatch_all())

    return {
        "contacts_delivered": contacts_delivered,
        "contacts_failed": len(errors),
        "email_sent": email_sent,
        "sms_sent": sms_sent,
        "errors": errors[:10],
    }
