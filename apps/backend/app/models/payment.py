import re
from datetime import datetime
from enum import Enum
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator


class PaymentMethod(str, Enum):
    LOCAL_BANK_TRANSFER = "LOCAL_BANK_TRANSFER"
    CASH = "CASH"
    STRIPE = "STRIPE"
    PAYPAL = "PAYPAL"


class PaymentStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    REFUNDED = "REFUNDED"


class ExecutionStatus(str, Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class PaymentSubmitRequest(BaseModel):
    schema_version: Literal["1.0"] = "1.0"
    request_id: str = Field(min_length=1)
    amount: int = Field(ge=1)
    method: PaymentMethod
    auto_approve: bool = False

    @field_validator("request_id")
    @classmethod
    def validate_request_id(cls, value: str) -> str:
        if not value.startswith("REQ-"):
            raise ValueError("request_id must start with 'REQ-'")
        return value


class PaymentSubmitResponse(BaseModel):
    schema_version: Literal["1.0"] = "1.0"
    payment_id: str
    request_id: str
    amount: int
    method: PaymentMethod
    status: PaymentStatus
    payment_instructions: Optional[str] = None
    expected_wait_time: Optional[str] = None
    stripe_client_secret: Optional[str] = None
    message: Optional[str] = None


class PaymentVerifyRequest(BaseModel):
    schema_version: Literal["1.0"] = "1.0"
    payment_id: str
    action: Literal["approve", "reject"]
    admin_notes: Optional[str] = None


class PaymentVerifyResponse(BaseModel):
    schema_version: Literal["1.0"] = "1.0"
    payment_id: str
    request_id: str
    status: PaymentStatus
    message: str
    notification_sent: bool = False


class PaymentStatusResponse(BaseModel):
    schema_version: Literal["1.0"] = "1.0"
    payment_id: str
    request_id: str
    amount: int
    method: PaymentMethod
    status: PaymentStatus
    created_at: datetime
    verified_at: Optional[datetime] = None
    ocr_extracted: Optional[dict] = None
    admin_notes: Optional[str] = None
    audit_trail: Optional[list[dict]] = None


class OCRExtractedData(BaseModel):
    amount: Optional[int] = None
    date: Optional[str] = None
    reference_number: Optional[str] = None
    sender_name: Optional[str] = None
    sender_account: Optional[str] = None
    confidence: Optional[float] = None


class ConsentRecord(BaseModel):
    schema_version: Literal["1.0"] = "1.0"
    request_id: str
    consent_to_marketing: bool
    terms_accepted: bool
    data_processing_consent: bool
    consented_at: datetime = Field(default_factory=datetime.utcnow)


class ConsentRequest(BaseModel):
    schema_version: Literal["1.0"] = "1.0"
    request_id: str
    consent_to_marketing: bool
    terms_accepted: bool
    data_processing_consent: bool

    @field_validator("terms_accepted")
    @classmethod
    def validate_terms(cls, value: bool) -> bool:
        if not value:
            raise ValueError("terms_accepted must be true")
        return value


class ConsentResponse(BaseModel):
    schema_version: Literal["1.0"] = "1.0"
    request_id: str
    consent_recorded: bool
    message: str


class CampaignExecuteRequest(BaseModel):
    schema_version: Literal["1.0"] = "1.0"
    request_id: str
    campaign_data: dict


class CampaignExecuteResponse(BaseModel):
    schema_version: Literal["1.0"] = "1.0"
    execution_id: str
    request_id: str
    status: ExecutionStatus
    message: str


class ExecutionJob(BaseModel):
    id: str
    request_id: str
    status: ExecutionStatus
    adapter_type: str
    executed_at: Optional[datetime] = None
    result_data: Optional[dict] = None