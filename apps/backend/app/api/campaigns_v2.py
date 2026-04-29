from datetime import date, datetime
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, field_validator

from app.services import campaign_service
from app.services import dispatch_service
from app.services import payment_link_service
from app.services import report_service
from app.services import scheduler_service
from app.services import execution_service
from app.services import dispatch_service
from app.services.payment_link_service import PaymentLinkNotAllowedError


router = APIRouter(prefix="/campaigns", tags=["campaigns-v2"])


class StartSessionRequest(BaseModel):
    client_email: str = Field(min_length=3, max_length=320)

    @field_validator("client_email")
    @classmethod
    def validate_client_email(cls, value: str) -> str:
        if value != value.strip():
            raise ValueError("client_email must not have surrounding whitespace")
        if any(char.isspace() for char in value):
            raise ValueError("client_email must not contain whitespace")

        local, separator, domain = value.partition("@")
        if not separator or not local or not domain:
            raise ValueError("client_email must be email-like")
        if "." not in domain or domain.startswith(".") or domain.endswith("."):
            raise ValueError("client_email must be email-like")

        return value


class ModerationCheckRequest(BaseModel):
    campaign_session_id: str = Field(min_length=1)
    campaign_id: str = Field(min_length=1)
    safety_score: int = Field(ge=0, le=100)
    audience_match_score: int = Field(ge=0, le=100)


class ModerationDecisionResponse(BaseModel):
    campaign_session_id: str
    campaign_id: str
    decision: Literal["PASS", "REVISION_REQUIRED", "MANUAL_REVIEW_OFFERED"]
    ai_attempt_count: int = Field(ge=1)


class ManualReviewRequest(BaseModel):
    campaign_session_id: str = Field(min_length=1)
    accepted: bool


class ManualReviewDecisionResponse(BaseModel):
    campaign_session_id: str
    status: Literal["UNDER_MANUAL_REVIEW", "DRAFT_HELD"]
    expires_at: datetime | None = None
    reminder_at: datetime | None = None
    reminder_hours_before_expiry: int = Field(ge=0)
    manual_review_ticket_id: str | None = None


class CreatePaymentLinkRequest(BaseModel):
    campaign_id: str = Field(min_length=1)
    method: Literal["STRIPE_LINK", "PAYPAL_LINK"]
    amount: int = Field(ge=1)
    provider_mode: Literal["test", "live"] = "test"


class CreatePaymentLinkResponse(BaseModel):
    payment_link_id: str
    campaign_id: str
    method: Literal["STRIPE_LINK", "PAYPAL_LINK"]
    provider: Literal["stripe", "paypal"]
    provider_mode: Literal["test", "live"]
    amount: int = Field(ge=1)
    payment_url: str
    verification_status: Literal["PENDING"]


class ScheduleCampaignRequest(BaseModel):
    scheduled_at: datetime
    timezone: str = "UTC"


class ScheduleCampaignResponse(BaseModel):
    campaign_id: str
    scheduled_at: datetime
    timezone: str
    status: Literal["scheduled", "executing", "completed", "failed"]


class ExecutionLog(BaseModel):
    execution_id: str
    campaign_id: str
    started_at: datetime
    completed_at: datetime | None = None
    status: Literal["pending", "executing", "completed", "failed"]
    contacts_attempted: int = 0
    contacts_delivered: int = 0
    errors: list[str] = []
    created_at: datetime


class DispatchStartRequest(BaseModel):
    campaign_id: str = Field(min_length=1)
    start_date: date = Field(default_factory=date.today)
    duration_weeks: int = Field(default=4, ge=1)
    channels: list[Literal["email", "sms"]] = Field(default_factory=lambda: ["email", "sms"])


class DispatchStartResponse(BaseModel):
    campaign_id: str
    status: Literal["SCHEDULED"]
    schedule: dict[str, list[str]]


class CampaignReportResponse(BaseModel):
    campaign_id: str
    delivery: dict[str, int]
    interactions: dict[str, int]
    dispatch_ready: bool
    audience_fit_observations: list[str]
    timing_performance_insights: list[str]
    recommendations: list[str]


class TemplateGenerateRequest(BaseModel):
    campaign_session_id: str = Field(min_length=1)
    template_type: Literal["email", "sms", "social"]
    style_preference: str = ""


class TemplateGenerateResponse(BaseModel):
    template_id: str
    campaign_session_id: str
    template_type: str
    content: str
    generated_at: datetime


class SessionResumeRequest(BaseModel):
    campaign_session_id: str = Field(min_length=1)
    resume_method: Literal["url", "email_otp"]


class SessionResumeResponse(BaseModel):
    campaign_session_id: str
    status: Literal["ACTIVE", "EXPIRED"]
    resume_token: str | None = None
    expires_at: datetime | None = None


class ManualReviewDecisionRequest(BaseModel):
    campaign_session_id: str = Field(min_length=1)
    decision: Literal["approved", "rejected"]
    admin_notes: str = ""


class ManualReviewCompletionResponse(BaseModel):
    campaign_session_id: str
    status: Literal["APPROVED", "REJECTED", "DRAFT_HELD"]
    payment_link_eligible: bool


@router.post("/session/start")
def start_session(req: StartSessionRequest) -> dict:
    return campaign_service.start_session(req.client_email)


@router.post("/moderation/check", response_model=ModerationDecisionResponse)
def moderation_check(req: ModerationCheckRequest) -> ModerationDecisionResponse:
    try:
        return ModerationDecisionResponse.model_validate(
            campaign_service.run_moderation_check(
                campaign_session_id=req.campaign_session_id,
                campaign_id=req.campaign_id,
                safety_score=req.safety_score,
                audience_match_score=req.audience_match_score,
            )
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/moderation/manual-review/request", response_model=ManualReviewDecisionResponse)
def manual_review_request(req: ManualReviewRequest) -> ManualReviewDecisionResponse:
    try:
        return ManualReviewDecisionResponse.model_validate(
            campaign_service.set_manual_review_choice(
                campaign_session_id=req.campaign_session_id,
                accepted=req.accepted,
            )
        )
    except campaign_service.ManualReviewNotAvailableError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/payment/link", response_model=CreatePaymentLinkResponse)
def create_payment_link(req: CreatePaymentLinkRequest) -> CreatePaymentLinkResponse:
    try:
        return CreatePaymentLinkResponse.model_validate(
            payment_link_service.create_payment_link(
                campaign_id=req.campaign_id,
                method=req.method,
                amount=req.amount,
                provider_mode=req.provider_mode,
            )
        )
    except PaymentLinkNotAllowedError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/dispatch/start", response_model=DispatchStartResponse)
def start_dispatch(req: DispatchStartRequest) -> DispatchStartResponse:
    try:
        payload = dispatch_service.start_dispatch(
            campaign_id=req.campaign_id,
            start_date=req.start_date.isoformat(),
            duration_weeks=req.duration_weeks,
            channels=list(req.channels),
        )
    except dispatch_service.CampaignNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return DispatchStartResponse.model_validate(payload)


@router.get("/{campaign_id}/report", response_model=CampaignReportResponse)
def get_campaign_report(campaign_id: str) -> CampaignReportResponse:
    try:
        return CampaignReportResponse.model_validate(report_service.build_report(campaign_id))
    except dispatch_service.CampaignNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/template/generate", response_model=TemplateGenerateResponse)
def generate_template(req: TemplateGenerateRequest) -> TemplateGenerateResponse:
    try:
        return TemplateGenerateResponse.model_validate(
            campaign_service.generate_template(
                campaign_session_id=req.campaign_session_id,
                template_type=req.template_type,
                style_preference=req.style_preference,
            )
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/session/resume", response_model=SessionResumeResponse)
def resume_session(req: SessionResumeRequest) -> SessionResumeResponse:
    try:
        return SessionResumeResponse.model_validate(
            campaign_service.resume_session(
                campaign_session_id=req.campaign_session_id,
                resume_method=req.resume_method,
            )
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/moderation/manual-review/decision", response_model=ManualReviewCompletionResponse)
def complete_manual_review_decision(req: ManualReviewDecisionRequest) -> ManualReviewCompletionResponse:
    try:
        return ManualReviewCompletionResponse.model_validate(
            campaign_service.complete_manual_review_decision(
                campaign_session_id=req.campaign_session_id,
                decision=req.decision,
                admin_notes=req.admin_notes,
            )
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.patch("/{campaign_id}/schedule", response_model=ScheduleCampaignResponse)
def schedule_campaign(campaign_id: str, req: ScheduleCampaignRequest) -> ScheduleCampaignResponse:
    result = scheduler_service.schedule_campaign(
        campaign_id=campaign_id,
        scheduled_at=req.scheduled_at,
        timezone=req.timezone,
    )
    return ScheduleCampaignResponse.model_validate(result)


@router.get("/scheduled", response_model=list[ScheduleCampaignResponse])
def get_scheduled_campaigns() -> list[ScheduleCampaignResponse]:
    results = scheduler_service.get_scheduled_campaigns()
    return [ScheduleCampaignResponse.model_validate(r) for r in results]


@router.get("/executions")
def get_executions(campaign_id: str | None = None) -> list[dict]:
    """Get execution history without exposing contact IDs."""
    executions = execution_service.get_execution_history(campaign_id)
    # Remove contact_ids from list view for security/privacy
    filtered = []
    for exec in executions:
        exec_copy = {k: v for k, v in exec.items() if k != "contact_ids"}
        filtered.append(exec_copy)
    return filtered


@router.get("/moderation/pending-reviews")
def get_pending_reviews() -> list[dict]:
    sessions = campaign_service._load_sessions()
    pending = []
    for session_id, session in sessions.items():
        if session.get("status") == "UNDER_MANUAL_REVIEW":
            pending.append({
                "campaign_session_id": session_id,
                "ticket_id": session.get("manual_review_ticket_id"),
                "client_email": session.get("client_email"),
                "created_at": session.get("created_at"),
                "campaign_name": session.get("campaign_name", "Untitled Campaign"),
            })
    return pending


@router.post("/{session_id}/execute")
def execute_campaign_by_session(session_id: str) -> dict:
    """Execute campaign using session data to select contacts."""
    try:
        # Load session to get execution criteria
        from app.services import campaign_service
        sessions = campaign_service._load_sessions()
        if session_id not in sessions:
            raise HTTPException(status_code=404, detail="Session not found")
        
        session = sessions[session_id]
        
        # Get reach limit from session
        reach_limit = session.get("estimated_reachable", 100)
        
        # Select contacts based on session criteria
        from app.services import contact_service
        contacts = contact_service.list_contacts(
            limit=reach_limit,
            offset=0,
            include_opt_out=False,
        )
        
        if not contacts:
            raise HTTPException(status_code=400, detail="No contacts found for execution")
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    # Create execution record (this also stores contact IDs)
    exec_record = execution_service.start_execution(
        campaign_id=session_id,  # Use session_id as campaign_id for tracking
        session_id=session_id,
    )
    
    # Get stored contact IDs
    contact_ids = execution_service.get_execution_contacts(exec_record["execution_id"])
    
    contacts_attempted = len(contact_ids) if contact_ids else 0
    contacts_delivered = contacts_attempted  # Assume all delivered for now
    
    execution_service.complete_execution(
        execution_id=exec_record["execution_id"],
        contacts_attempted=contacts_attempted,
        contacts_delivered=contacts_delivered,
        errors=[],
    )
    
    return {
        "status": "executed",
        "campaign_id": session_id,
        "execution_id": exec_record["execution_id"],
        "contacts_delivered": contacts_delivered,
    }
