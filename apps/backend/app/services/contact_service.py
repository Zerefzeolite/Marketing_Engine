from datetime import UTC, datetime
from pathlib import Path
import json
from uuid import uuid4

CONTACTS_FILE = Path("data/contacts.json")


def _load_contacts() -> dict:
    if not CONTACTS_FILE.exists():
        return {}
    with open(CONTACTS_FILE) as f:
        return json.load(f)


def _save_contacts(contacts: dict) -> None:
    CONTACTS_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(CONTACTS_FILE, "w") as f:
        json.dump(contacts, f, indent=2)


def create_contact(
    email: str,
    name: str | None = None,
    phone: str | None = None,
    campaign_ids: list[str] | None = None,
) -> dict:
    contacts = _load_contacts()
    contact_id = f"CNT-{uuid4().hex[:8].upper()}"
    now = datetime.now(UTC).isoformat()
    contacts[contact_id] = {
        "contact_id": contact_id,
        "email": email,
        "name": name,
        "phone": phone,
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
) -> list[dict]:
    contacts = _load_contacts()
    result = list(contacts.values())
    if campaign_id:
        result = [c for c in result if campaign_id in c.get("campaigns", [])]
    return result[offset : offset + limit]


def import_contacts(
    rows: list[dict],
    default_campaign_id: str | None = None,
) -> dict:
    contacts = _load_contacts()
    imported = 0
    for row in rows:
        email = row.get("email")
        if not email:
            continue
        contact_id = f"CNT-{uuid4().hex[:8].upper()}"
        now = datetime.now(UTC).isoformat()
        campaign_ids = row.get("campaigns", [])
        if default_campaign_id and default_campaign_id not in campaign_ids:
            campaign_ids.append(default_campaign_id)
        contacts[contact_id] = {
            "contact_id": contact_id,
            "email": email,
            "name": row.get("name"),
            "phone": row.get("phone"),
            "campaigns": campaign_ids,
            "created_at": now,
            "updated_at": now,
        }
        imported += 1
    _save_contacts(contacts)
    return {"imported": imported, "total": len(contacts)}


def delete_contact(contact_id: str) -> bool:
    contacts = _load_contacts()
    if contact_id in contacts:
        del contacts[contact_id]
        _save_contacts(contacts)
        return True
    return False