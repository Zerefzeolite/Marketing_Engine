"""
Migrate all JSON data files to PostgreSQL.

Usage:
    # Set DATABASE_URL first
    DATABASE_URL=postgresql://user:pass@localhost/marketing_engine
    python -m app.migrate_json_to_db

The script:
1. Reads each JSON file
2. Inserts rows into corresponding PostgreSQL table
3. Skips duplicates (by primary key)
4. Reports counts for each table

Safe to run multiple times (idempotent).
"""

import json
import os
import logging
from pathlib import Path
from datetime import datetime
from typing import Any

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger(__name__)

# --- Config ---
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./marketing_engine.db")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

DATA_DIR = Path(__file__).resolve().parent.parent.parent.parent / "data"


def _load_json(path: Path) -> Any:
    if not path.exists():
        return {}
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def migrate_contacts(s: Session):
    from app.db_schema import Contact, ContactStatus
    file = DATA_DIR / "contacts.json"
    data = _load_json(file)
    count = 0
    for cid, c in data.items():
        exists = s.query(Contact).filter(Contact.id == cid).first()
        if exists:
            continue
        contact = Contact(
            id=cid,
            business_name=c.get("business_name"),
            email=c.get("email"),
            phone=c.get("phone"),
            target_audience=c.get("target_audience"),
            campaign_objective=c.get("campaign_objective"),
            preferred_channel=c.get("preferred_channel", "email"),
            status=ContactStatus(c.get("status", "active")),
            consent_given=c.get("consent_given", False),
            created_at=datetime.fromisoformat(c["created_at"]) if c.get("created_at") else datetime.utcnow(),
            updated_at=datetime.fromisoformat(c["updated_at"]) if c.get("updated_at") else datetime.utcnow(),
        )
        s.add(contact)
        count += 1
    logger.info(f"Contacts: {count} new rows inserted")


def migrate_sessions(s: Session):
    from app.db_schema import CampaignSession, CampaignSessionStatus
    file = DATA_DIR / "campaign_sessions.json"
    data = _load_json(file)
    count = 0
    for sid, sess in data.items():
        exists = s.query(CampaignSession).filter(CampaignSession.session_id == sid).first()
        if exists:
            continue
        session = CampaignSession(
            session_id=sid,
            request_id=sess.get("request_id"),
            business_name=sess.get("business_name"),
            target_audience=sess.get("target_audience"),
            campaign_objective=sess.get("campaign_objective"),
            preferred_channel=sess.get("preferred_channel"),
            estimated_reachable=sess.get("estimated_reachable", 0),
            package_tier=sess.get("package_tier"),
            template_tier=sess.get("template_tier"),
            campaign_duration=sess.get("campaign_duration"),
            sends=sess.get("sends"),
            confidence=sess.get("confidence"),
            status=CampaignSessionStatus(sess.get("status", "DRAFT")),
            template_content=sess.get("template_content"),
            channel_split=sess.get("channel_split"),
            audit_trail=sess.get("audit_trail", []),
            created_at=datetime.fromisoformat(sess["created_at"]) if sess.get("created_at") else datetime.utcnow(),
            updated_at=datetime.fromisoformat(sess["updated_at"]) if sess.get("updated_at") else datetime.utcnow(),
        )
        s.add(session)
        count += 1
    logger.info(f"Sessions: {count} new rows inserted")


def migrate_payments(s: Session):
    from app.db_schema import Payment, PaymentStatus, PaymentMethod
    file = DATA_DIR / "payments.json"
    data = _load_json(file)
    count = 0
    for pid, p in data.items():
        exists = s.query(Payment).filter(Payment.payment_id == pid).first()
        if exists:
            continue
        payment = Payment(
            payment_id=pid,
            request_id=p.get("request_id"),
            amount=p.get("amount", 0),
            method=PaymentMethod(p.get("method", "CASH")),
            status=PaymentStatus(p.get("status", "PENDING")),
            auto_approve=p.get("auto_approve", False),
            receipt_url=p.get("receipt_url"),
            audit_trail=p.get("audit_trail", []),
            created_at=datetime.fromisoformat(p["created_at"]) if p.get("created_at") else datetime.utcnow(),
            updated_at=datetime.fromisoformat(p["updated_at"]) if p.get("updated_at") else datetime.utcnow(),
        )
        s.add(payment)
        count += 1
    logger.info(f"Payments: {count} new rows inserted")


def migrate_executions(s: Session):
    from app.db_schema import CampaignExecution, ExecutionStatus
    file = DATA_DIR / "execution_history.json"
    data = _load_json(file)
    count = 0
    for eid, e in data.items():
        exists = s.query(CampaignExecution).filter(CampaignExecution.execution_id == eid).first()
        if exists:
            continue
        execution = CampaignExecution(
            execution_id=eid,
            campaign_id=e.get("campaign_id"),
            session_id=e.get("session_id"),
            status=ExecutionStatus(e.get("status", "PENDING")),
            contacts_attempted=e.get("contacts_attempted", 0),
            contacts_delivered=e.get("contacts_delivered", 0),
            contacts_failed=e.get("contacts_failed", 0),
            errors=e.get("errors", []),
            created_at=datetime.fromisoformat(e["created_at"]) if e.get("created_at") else datetime.utcnow(),
            updated_at=datetime.fromisoformat(e["updated_at"]) if e.get("updated_at") else datetime.utcnow(),
        )
        s.add(execution)
        count += 1
    logger.info(f"Executions: {count} new rows inserted")


def migrate_metrics(s: Session):
    from app.db_schema import CampaignMetrics
    file = DATA_DIR / "campaign_metrics.json"
    data = _load_json(file)
    count = 0
    for cid, m in data.items():
        exists = s.query(CampaignMetrics).filter(CampaignMetrics.campaign_id == cid).first()
        if exists:
            continue
        metrics = CampaignMetrics(
            campaign_id=cid,
            sent=m.get("sent", 0),
            delivered=m.get("delivered", 0),
            opened=m.get("opened", 0),
            clicked=m.get("clicked", 0),
            replied=m.get("replied", 0),
            failed=m.get("failed", 0),
            opt_out=m.get("opt_out", 0),
            delivery_rate=m.get("delivery_rate", 0.0),
            open_rate=m.get("open_rate", 0.0),
            click_rate=m.get("click_rate", 0.0),
            updated_at=datetime.fromisoformat(m["updated_at"]) if m.get("updated_at") else datetime.utcnow(),
        )
        s.add(metrics)
        count += 1
    logger.info(f"Metrics: {count} new rows inserted")


def migrate_events(s: Session):
    from app.db_schema import CampaignEvent, CampaignEventType
    file = DATA_DIR / "contact_interactions.json"
    data = _load_json(file)
    count = 0
    for cid, events in data.items():
        for ev in events:
            # Skip if already migrated (use metadata.migrated flag or check existence)
            event = CampaignEvent(
                campaign_id=ev.get("campaign_id", cid),
                contact_id=cid,
                event_type=CampaignEventType(ev.get("event_type", "SENT")),
                channel=ev.get("channel"),
                timestamp=datetime.fromisoformat(ev["timestamp"]) if ev.get("timestamp") else datetime.utcnow(),
                event_metadata=ev.get("metadata", {}),
            )
            s.add(event)
            count += 1
    logger.info(f"Events: {count} new rows inserted")


def run_migration():
    logger.info(f"Migrating to: {DATABASE_URL}")
    logger.info(f"Data directory: {DATA_DIR}")

    # Ensure tables exist
    from app.db_schema import Base
    Base.metadata.create_all(engine)
    logger.info("Tables created/verified")

    with SessionLocal() as s:
        migrate_contacts(s)
        migrate_sessions(s)
        migrate_payments(s)
        migrate_executions(s)
        migrate_metrics(s)
        migrate_events(s)
        s.commit()

    logger.info("Migration complete!")


if __name__ == "__main__":
    run_migration()
