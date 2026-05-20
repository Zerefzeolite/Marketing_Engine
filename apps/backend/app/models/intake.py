import re
from typing import Literal

from pydantic import BaseModel, Field, field_validator


EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class IntakeSubmitRequest(BaseModel):
    schema_version: Literal["1.0"] = "1.0"
    business_name: str = Field(min_length=1)
    contact_email: str
    campaign_objective: str = Field(min_length=1)
    preferred_channel: Literal["email", "sms", "both"]
    budget_min: int = Field(ge=0)
    budget_max: int | None = Field(default=None, ge=0)

    @field_validator("contact_email")
    @classmethod
    def validate_contact_email(cls, value: str) -> str:
        if not EMAIL_PATTERN.match(value):
            raise ValueError("contact_email must be a valid email address")
        return value


class IntakeSubmitResponse(BaseModel):
    schema_version: Literal["1.0"] = "1.0"
    request_id: str = Field(min_length=1)
    normalized_summary: dict[str, str]
