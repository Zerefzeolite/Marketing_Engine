"""
Contact repository — hybrid JSON/DB backend.

Switch by setting DATABASE_URL env var.
"""

import sys
import os
import logging
from typing import Optional, List
from datetime import datetime
from pathlib import Path

# Ensure app path is set
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent.parent))

from app.db import HybridRepo, USE_DB, _json_load, _json_save
from app.db_schema import Contact, ContactStatus

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).resolve().parent.parent.parent.parent / "data"
CONTACTS_FILE = DATA_DIR / "contacts.json"


class ContactRepo(HybridRepo):
    table_model = Contact
    pk_field = "id"
    json_file = CONTACTS_FILE

    # --- Contact-specific methods ---

    @classmethod
    def list_contacts(
        cls,
        search: Optional[str] = None,
        status: Optional[str] = None,
        preferred_channel: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
        include_opt_out: bool = True,
    ) -> List[dict]:
        if USE_DB:
            with __import__("sqlalchemy.orm").sessionmaker(bind=__import__("sqlalchemy").create_engine("")) as s:
                pass  # DB path: use session directly in service
        # JSON path (also used as fallback)
        data = _json_load(CONTACTS_FILE)
        contacts = list(data.values())

        if search:
            search_lower = search.lower()
            contacts = [
                c for c in contacts
                if search_lower in c.get("business_name", "").lower()
                or search_lower in c.get("email", "").lower()
                or search_lower in c.get("phone", "").lower()
            ]

        if status and status != "all":
            contacts = [c for c in contacts if c.get("status") == status]

        if preferred_channel:
            contacts = [c for c in contacts if c.get("preferred_channel") == preferred_channel]

        if not include_opt_out:
            contacts = [c for c in contacts if c.get("status") != ContactStatus.OPT_OUT.value]

        total = len(contacts)
        contacts = contacts[offset: offset + limit]
        return {"items": contacts, "total": total}

    @classmethod
    def get_by_email(cls, email: str) -> Optional[dict]:
        return next((c for c in cls.list_all() if c.get("email") == email), None)

    @classmethod
    def get_by_phone(cls, phone: str) -> Optional[dict]:
        return next((c for c in cls.list_all() if c.get("phone") == phone), None)

    @classmethod
    def _row_to_dict(cls, row) -> dict:
        return {c.name: getattr(row, c.name) for c in row.__table__.columns}
