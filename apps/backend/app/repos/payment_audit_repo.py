"""
Payment Audit Event repository — JSON/DB backend.
"""

import sys
from pathlib import Path
from typing import List

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent.parent))

from app.db import HybridRepo, USE_DB
from app.db_schema import PaymentAuditEvent

DATA_DIR = Path(__file__).resolve().parent.parent.parent.parent / "data"


class PaymentAuditRepo:
    """Payment audit events — append-only, no JSON fallback needed for now."""

    @classmethod
    def add_event(cls, payment_id: str, action: str, actor: str = "system", note: str = "") -> dict:
        if USE_DB:
            from app.db import SessionLocal
            from app.db_schema import PaymentAuditEvent
            with SessionLocal() as s:
                event = PaymentAuditEvent(
                    payment_id=payment_id,
                    action=action,
                    actor=actor,
                    note=note,
                )
                s.add(event)
                s.commit()
                return {
                    "id": event.id,
                    "payment_id": payment_id,
                    "action": action,
                    "actor": actor,
                    "note": note,
                }
        # JSON fallback — append to payment's audit_trail
        from app.repos.payment_repo import PaymentRepo, PAYMENTS_FILE
        from app.db import _json_load, _json_save
        data = _json_load(PAYMENTS_FILE)
        for pid, p in data.items():
            if pid == payment_id or p.get("request_id") == payment_id:
                if "audit_trail" not in p:
                    p["audit_trail"] = []
                p["audit_trail"].append({
                    "action": action,
                    "actor": actor,
                    "note": note,
                    "timestamp": "now",  # Simplified for JSON
                })
                _json_save(PAYMENTS_FILE, data)
                return p["audit_trail"][-1]
        return {}

    @classmethod
    def get_events(cls, payment_id: str) -> List[dict]:
        if USE_DB:
            from app.db import SessionLocal
            with SessionLocal() as s:
                rows = s.query(PaymentAuditEvent).filter(
                    PaymentAuditEvent.payment_id == payment_id
                ).all()
                return [{
                    "id": r.id,
                    "action": r.action,
                    "actor": r.actor,
                    "note": r.note,
                    "timestamp": r.timestamp.isoformat() if r.timestamp else None,
                } for r in rows]
        # JSON fallback
        from app.repos.payment_repo import PaymentRepo, PAYMENTS_FILE
        from app.db import _json_load
        data = _json_load(PAYMENTS_FILE)
        for pid, p in data.items():
            if pid == payment_id or p.get("request_id") == payment_id:
                return p.get("audit_trail", [])
        return []
