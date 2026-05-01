"""
PostgreSQL schema for Marketing Engine.

Run this script to create all tables:
    python -m app.db_schema

Or use Alembic for production migrations.
"""

from sqlalchemy import (
    Column, Integer, String, Text, DateTime, Boolean,
    Float, Enum as SQLEnum, JSON, Index, create_engine
)
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from datetime import datetime
import enum
import os

Base = declarative_base()


class ContactStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    OPT_OUT = "opt_out"


class Contact(Base):
    __tablename__ = "contacts"

    id = Column(String(64), primary_key=True)
    business_name = Column(String(255))
    email = Column(String(255), index=True)
    phone = Column(String(50), index=True)
    target_audience = Column(Text)
    campaign_objective = Column(String(100))
    preferred_channel = Column(String(20))
    status = Column(SQLEnum(ContactStatus), default=ContactStatus.ACTIVE)
    consent_given = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index("idx_contacts_email", "email"),
        Index("idx_contacts_phone", "phone"),
        Index("idx_contacts_status", "status"),
    )


class CampaignSessionStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    PENDING_MODERATION = "PENDING_MODERATION"
    PASS = "PASS"
    REVISION_REQUIRED = "REVISION_REQUIRED"
    MANUAL_REVIEW_OFFERED = "MANUAL_REVIEW_OFFERED"
    UNDER_MANUAL_REVIEW = "UNDER_MANUAL_REVIEW"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    PAYMENT_PENDING = "PAYMENT_PENDING"
    PAYMENT_VERIFIED = "PAYMENT_VERIFIED"
    EXECUTING = "EXECUTING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class CampaignSession(Base):
    __tablename__ = "campaign_sessions"

    session_id = Column(String(64), primary_key=True)
    request_id = Column(String(64), index=True)
    business_name = Column(String(255))
    target_audience = Column(Text)
    campaign_objective = Column(String(100))
    preferred_channel = Column(String(20))
    estimated_reachable = Column(Integer)
    package_tier = Column(String(20))
    template_tier = Column(String(20))
    campaign_duration = Column(String(20))
    sends = Column(Integer)
    confidence = Column(Float)
    status = Column(SQLEnum(CampaignSessionStatus), default=CampaignSessionStatus.DRAFT)
    template_content = Column(Text)
    channel_split = Column(String(100))
    audit_trail = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index("idx_sessions_request_id", "request_id"),
        Index("idx_sessions_status", "status"),
    )


class Consent(Base):
    __tablename__ = "consents"

    id = Column(String(64), primary_key=True)
    request_id = Column(String(64), index=True)
    consent_to_marketing = Column(Boolean, default=False)
    terms_accepted = Column(Boolean, default=False)
    data_processing_consent = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("idx_consents_request_id", "request_id"),
    )


class PaymentStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    COMPLETED = "COMPLETED"


class PaymentMethod(str, enum.Enum):
    LOCAL_BANK_TRANSFER = "LOCAL_BANK_TRANSFER"
    CASH = "CASH"
    STRIPE = "STRIPE"
    PAYPAL = "PAYPAL"


class Payment(Base):
    __tablename__ = "payments"

    payment_id = Column(String(64), primary_key=True)
    request_id = Column(String(64), index=True)
    amount = Column(Float)
    method = Column(SQLEnum(PaymentMethod))
    status = Column(SQLEnum(PaymentStatus), default=PaymentStatus.PENDING)
    auto_approve = Column(Boolean, default=False)
    receipt_url = Column(String(500))
    audit_trail = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index("idx_payments_request_id", "request_id"),
        Index("idx_payments_status", "status"),
    )


class PaymentAuditEvent(Base):
    __tablename__ = "payment_audit_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    payment_id = Column(String(64), index=True)
    action = Column(String(50))
    actor = Column(String(50))
    note = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("idx_audit_payment_id", "payment_id"),
    )


class ExecutionStatus(str, enum.Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class CampaignExecution(Base):
    __tablename__ = "campaign_executions"

    execution_id = Column(String(64), primary_key=True)
    campaign_id = Column(String(64), index=True)
    session_id = Column(String(64), index=True)
    status = Column(SQLEnum(ExecutionStatus), default=ExecutionStatus.PENDING)
    contacts_attempted = Column(Integer, default=0)
    contacts_delivered = Column(Integer, default=0)
    contacts_failed = Column(Integer, default=0)
    errors = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index("idx_executions_campaign_id", "campaign_id"),
        Index("idx_executions_session_id", "session_id"),
    )


class CampaignExecutionContact(Base):
    __tablename__ = "campaign_execution_contacts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    execution_id = Column(String(64), index=True)
    contact_id = Column(String(64), index=True)

    __table_args__ = (
        Index("idx_exec_contacts_execution_id", "execution_id"),
        Index("idx_exec_contacts_contact_id", "contact_id"),
    )


class CampaignEventType(str, enum.Enum):
    SENT = "SENT"
    DELIVERED = "DELIVERED"
    OPENED = "OPENED"
    CLICKED = "CLICKED"
    REPLIED = "REPLIED"
    FAILED = "FAILED"
    OPT_OUT = "OPT_OUT"


class CampaignEvent(Base):
    __tablename__ = "campaign_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    campaign_id = Column(String(64), index=True)
    contact_id = Column(String(64), index=True)
    event_type = Column(SQLEnum(CampaignEventType))
    channel = Column(String(20))
    timestamp = Column(DateTime, default=datetime.utcnow)
    event_metadata = Column(JSON, default=dict)  # renamed: "metadata" is reserved in SQLAlchemy

    __table_args__ = (
        Index("idx_events_campaign_id", "campaign_id"),
        Index("idx_events_contact_id", "contact_id"),
        Index("idx_events_type", "event_type"),
    )


class CampaignMetrics(Base):
    __tablename__ = "campaign_metrics"

    campaign_id = Column(String(64), primary_key=True)
    sent = Column(Integer, default=0)
    delivered = Column(Integer, default=0)
    opened = Column(Integer, default=0)
    clicked = Column(Integer, default=0)
    replied = Column(Integer, default=0)
    failed = Column(Integer, default=0)
    opt_out = Column(Integer, default=0)
    delivery_rate = Column(Float, default=0.0)
    open_rate = Column(Float, default=0.0)
    click_rate = Column(Float, default=0.0)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


def get_engine():
    database_url = os.getenv("DATABASE_URL", "sqlite:///./marketing_engine.db")
    # Convert to async if needed, but keeping sync for simplicity
    # For PostgreSQL: postgresql://user:pass@localhost/marketing_engine
    return create_engine(database_url, echo=False)


def init_db():
    engine = get_engine()
    Base.metadata.create_all(engine)
    print(f"Database tables created at: {engine.url}")


def get_session() -> Session:
    engine = get_engine()
    SessionLocal = sessionmaker(bind=engine)
    return SessionLocal()


if __name__ == "__main__":
    init_db()
