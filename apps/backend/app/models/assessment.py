from datetime import UTC, datetime
from typing import Literal

from pydantic import BaseModel, Field


DomainName = Literal[
    "ui_ux",
    "compliance_security",
    "backend_functionality",
    "client_contact_simulation",
    "efficiency_workflow",
    "website_portal",
]

Severity = Literal["P0", "P1", "P2", "P3"]
FindingStatus = Literal["OPEN", "IN_PROGRESS", "CLOSED"]
RetestResult = Literal["PASS", "FAIL"]


def utc_now_iso() -> str:
    return datetime.now(UTC).isoformat().replace("+00:00", "Z")


class RetestRecord(BaseModel):
    result: RetestResult
    evidence: list[str] = Field(default_factory=list)
    recorded_at: str = Field(default_factory=utc_now_iso)


class Finding(BaseModel):
    finding_id: str
    domain: DomainName
    title: str
    severity: Severity
    owner: str
    status: FindingStatus = "OPEN"
    notes: str = ""
    retests: list[RetestRecord] = Field(default_factory=list)
    created_at: str = Field(default_factory=utc_now_iso)
    updated_at: str = Field(default_factory=utc_now_iso)
