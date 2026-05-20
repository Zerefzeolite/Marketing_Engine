"""
Consent repository — hybrid JSON/DB backend.
"""

import sys
from pathlib import Path
from typing import Optional

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent.parent))

from app.db import HybridRepo, USE_DB, _json_load, _json_save
from app.db_schema import Consent

DATA_DIR = Path(__file__).resolve().parent.parent.parent.parent / "data"
CONSENTS_FILE = DATA_DIR / "consents.json"


class ConsentRepo(HybridRepo):
    table_model = Consent
    pk_field = "id"
    json_file = CONSENTS_FILE

    @classmethod
    def get_by_request_id(cls, request_id: str) -> Optional[dict]:
        if USE_DB:
            from app.db import SessionLocal
            with SessionLocal() as s:
                row = s.query(Consent).filter(
                    Consent.request_id == request_id
                ).first()
                return cls._row_to_dict(row) if row else None
        # JSON fallback
        data = _json_load(cls.json_file)
        for cid, c in data.items():
            if c.get("request_id") == request_id:
                return {"id": cid, **c}
        return None

    @classmethod
    def _row_to_dict(cls, row) -> dict:
        if not row:
            return None
        return {c.name: getattr(row, c.name) for c in row.__table__.columns}
