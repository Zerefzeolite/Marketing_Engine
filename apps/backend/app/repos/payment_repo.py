"""
Payment repository — hybrid JSON/DB backend.
"""

import sys
from pathlib import Path
from typing import Optional, List

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent.parent))

from app.db import HybridRepo, USE_DB, _json_load, _json_save
from app.db_schema import Payment, PaymentStatus, PaymentMethod

DATA_DIR = Path(__file__).resolve().parent.parent.parent.parent / "data"
PAYMENTS_FILE = DATA_DIR / "payments.json"


class PaymentRepo(HybridRepo):
    table_model = Payment
    pk_field = "payment_id"
    json_file = PAYMENTS_FILE

    @classmethod
    def get_by_request_id(cls, request_id: str) -> Optional[dict]:
        if USE_DB:
            from app.db import SessionLocal
            with SessionLocal() as s:
                row = s.query(Payment).filter(
                    Payment.request_id == request_id
                ).first()
                return cls._row_to_dict(row) if row else None
        # JSON fallback
        data = _json_load(cls.json_file)
        for pid, p in data.items():
            if p.get("request_id") == request_id:
                return {"payment_id": pid, **p}
        return None

    @classmethod
    def list_by_status(cls, status: str) -> List[dict]:
        items = cls.list_all()
        return [i for i in items if i.get("status") == status]

    @classmethod
    def _row_to_dict(cls, row) -> dict:
        if not row:
            return None
        return {c.name: getattr(row, c.name) for c in row.__table__.columns}
