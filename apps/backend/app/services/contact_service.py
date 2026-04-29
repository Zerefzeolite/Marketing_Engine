from datetime import UTC, datetime
from pathlib import Path
import json
from uuid import uuid4

SERVICE_FILE = Path(__file__).resolve()
DATA_DIR = SERVICE_FILE.parent.parent.parent.parent / "data"

CONTACTS_FILE = DATA_DIR / "contacts.json"


def _load_contacts() -> dict:
    if not CONTACTS_FILE.exists():
        return {}
    with open(CONTACTS_FILE) as f:
        return json.load(f)


def _save_contacts(contacts: dict) -> None:
    CONTACTS_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(CONTACTS_FILE, "w") as f:
        json.dump(contacts, f, indent=2)


def _new_contact_id() -> str:
    return f"CNT-{uuid4().hex[:8].upper()}"


def create_contact(
    email: str,
    phone: str | None = None,
    first_name: str | None = None,
    last_name: str | None = None,
    tags: list[str] | None = None,
    source: str = "manual",
    opt_out: bool = False,
    dob: str | None = None,
    age_group: str | None = None,
    gender: str | None = None,
    parish: str | None = None,
    preferred_channel: str | None = None,
    engagement_score: float | None = None,
    campaign_ids: list[str] | None = None,
) -> dict:
    contacts = _load_contacts()
    contact_id = _new_contact_id()
    now = datetime.now(UTC).isoformat()
    contacts[contact_id] = {
        "contact_id": contact_id,
        "email": email,
        "phone": phone,
        "first_name": first_name,
        "last_name": last_name,
        "tags": tags or [],
        "source": source,
        "opt_out": opt_out,
        "dob": dob,
        "age_group": age_group,
        "gender": gender,
        "parish": parish,
        "preferred_channel": preferred_channel,
        "engagement_score": engagement_score,
        "campaigns": campaign_ids or [],
        "created_at": now,
        "updated_at": now,
    }
    _save_contacts(contacts)
    return contacts[contact_id]


def get_contact(contact_id: str) -> dict | None:
    contacts = _load_contacts()
    return contacts.get(contact_id)


def list_contacts(
    campaign_id: str | None = None,
    limit: int = 100,
    offset: int = 0,
    tags: list[str] | None = None,
    opt_out: bool | None = None,
    source: str | None = None,
    parish: str | None = None,
    age_group: str | None = None,
    gender: str | None = None,
    preferred_channel: str | None = None,
    engagement_min: float | None = None,
    include_opt_out: bool = False,
) -> list[dict]:
    contacts = _load_contacts()
    result = list(contacts.values())

    # Filter by campaign
    if campaign_id:
        result = [c for c in result if campaign_id in c.get("campaigns", [])]

    # Filter by tags (any match)
    if tags:
        result = [
            c for c in result
            if any(tag in c.get("tags", []) for tag in tags)
        ]

    # Filter by opt_out status
    if opt_out is not None:
        result = [c for c in result if c.get("opt_out") == opt_out]

    # Filter by source
    if source:
        result = [c for c in result if c.get("source") == source]

    # Filter by parish
    if parish:
        result = [c for c in result if c.get("parish") == parish]

    # Filter by age_group
    if age_group:
        result = [c for c in result if c.get("age_group") == age_group]

    # Filter by gender
    if gender:
        result = [c for c in result if c.get("gender") == gender]

    # Filter by preferred_channel
    if preferred_channel:
        result = [c for c in result if c.get("preferred_channel") == preferred_channel]

    # Filter by engagement score minimum
    if engagement_min is not None:
        result = [c for c in result if (c.get("engagement_score") or 0) >= engagement_min]

    # Exclude opt-outs (unless include_opt_out=True or opt_out filter is explicitly set)
    if not include_opt_out and opt_out is None:
        result = [c for c in result if not c.get("opt_out", False)]

    # Sort by created_at descending
    result.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return result[offset : offset + limit]


def update_contact(
    contact_id: str,
    email: str | None = None,
    phone: str | None = None,
    first_name: str | None = None,
    last_name: str | None = None,
    tags: list[str] | None = None,
    source: str | None = None,
    opt_out: bool | None = None,
    dob: str | None = None,
    age_group: str | None = None,
    gender: str | None = None,
    parish: str | None = None,
    preferred_channel: str | None = None,
    engagement_score: float | None = None,
) -> dict | None:
    contacts = _load_contacts()
    if contact_id not in contacts:
        return None

    contact = contacts[contact_id]
    if email is not None:
        contact["email"] = email
    if phone is not None:
        contact["phone"] = phone
    if first_name is not None:
        contact["first_name"] = first_name
    if last_name is not None:
        contact["last_name"] = last_name
    if tags is not None:
        contact["tags"] = tags
    if source is not None:
        contact["source"] = source
    if opt_out is not None:
        contact["opt_out"] = opt_out
    if dob is not None:
        contact["dob"] = dob
    if age_group is not None:
        contact["age_group"] = age_group
    if gender is not None:
        contact["gender"] = gender
    if parish is not None:
        contact["parish"] = parish
    if preferred_channel is not None:
        contact["preferred_channel"] = preferred_channel
    if engagement_score is not None:
        contact["engagement_score"] = engagement_score

    contact["updated_at"] = datetime.now(UTC).isoformat()
    contacts[contact_id] = contact
    _save_contacts(contacts)
    return contact


def delete_contact(contact_id: str) -> bool:
    contacts = _load_contacts()
    if contact_id in contacts:
        del contacts[contact_id]
        _save_contacts(contacts)
        return True
    return False


def import_contacts(
    rows: list[dict],
    default_campaign_id: str | None = None,
) -> dict:
    contacts = _load_contacts()
    imported = 0
    failed = 0
    errors = []

    for idx, row in enumerate(rows):
        email = row.get("email")
        if not email:
            failed += 1
            errors.append(f"Row {idx + 1}: Missing email")
            continue

        # Check for duplicate email
        if any(c.get("email") == email for c in contacts.values()):
            failed += 1
            errors.append(f"Row {idx + 1}: Duplicate email {email}")
            continue

        contact_id = _new_contact_id()
        now = datetime.now(UTC).isoformat()
        campaign_ids = row.get("campaigns", [])
        if default_campaign_id and default_campaign_id not in campaign_ids:
            campaign_ids.append(default_campaign_id)

        # Parse tags (could be list or comma-separated string)
        tags = row.get("tags", [])
        if isinstance(tags, str):
            tags = [t.strip() for t in tags.split(",") if t.strip()]

        contacts[contact_id] = {
            "contact_id": contact_id,
            "email": email,
            "phone": row.get("phone"),
            "first_name": row.get("first_name"),
            "last_name": row.get("last_name"),
            "tags": tags,
            "source": row.get("source", "import"),
            "opt_out": row.get("opt_out", False),
            "campaigns": campaign_ids,
            "created_at": now,
            "updated_at": now,
        }
        imported += 1

    _save_contacts(contacts)
    return {"imported": imported, "failed": failed, "errors": errors, "total": len(contacts)}


def add_tag(contact_id: str, tag: str) -> dict | None:
    contacts = _load_contacts()
    if contact_id not in contacts:
        return None

    contact = contacts[contact_id]
    tags = contact.get("tags", [])
    if tag not in tags:
        tags.append(tag)
    contact["tags"] = tags
    contact["updated_at"] = datetime.now(UTC).isoformat()
    contacts[contact_id] = contact
    _save_contacts(contacts)
    return contact


def remove_tag(contact_id: str, tag: str) -> dict | None:
    contacts = _load_contacts()
    if contact_id not in contacts:
        return None

    contact = contacts[contact_id]
    tags = contact.get("tags", [])
    if tag in tags:
        tags.remove(tag)
    contact["tags"] = tags
    contact["updated_at"] = datetime.now(UTC).isoformat()
    contacts[contact_id] = contact
    _save_contacts(contacts)
    return contact


def set_opt_out(contact_id: str, opt_out: bool = True) -> dict | None:
    contacts = _load_contacts()
    if contact_id not in contacts:
        return None

    contact = contacts[contact_id]
    contact["opt_out"] = opt_out
    contact["updated_at"] = datetime.now(UTC).isoformat()
    contacts[contact_id] = contact
    _save_contacts(contacts)
    return contact
