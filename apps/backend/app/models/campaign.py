from datetime import UTC, datetime, timedelta
from typing import Literal
from uuid import uuid4

from pydantic import BaseModel, Field


def new_session_id() -> str:
    return f"SES-{uuid4().hex[:10]}"


class CampaignSession(BaseModel):
    campaign_session_id: str = Field(default_factory=new_session_id)
    client_email: str
    status: Literal["ACTIVE", "UNDER_MANUAL_REVIEW", "DRAFT_HELD"] = "ACTIVE"
    ai_attempt_count: int = 0
    expires_at: datetime = Field(default_factory=lambda: datetime.now(UTC) + timedelta(hours=12))
    # Audience engine fields
    estimated_reachable: int | None = None
    channel_split: str | None = None  # e.g., "email:60%,sms:40%"


class ModerationResult(BaseModel):
    campaign_id: str
    safety_score: int = Field(ge=0, le=100)
    audience_match_score: int = Field(ge=0, le=100)
    decision: Literal["APPROVED", "REVISION_REQUIRED", "REJECTED"]
    revision_guidance: list[str] = Field(default_factory=list)
