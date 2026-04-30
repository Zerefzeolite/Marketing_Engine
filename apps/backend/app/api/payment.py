import base64
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Request, Response
from fastapi.responses import JSONResponse

from ..models.payment import (
    CampaignExecuteRequest,
    CampaignExecuteResponse,
    ConsentRequest,
    ConsentResponse,
    PaymentMethod,
    PaymentStatus,
    PaymentSubmitRequest,
    PaymentSubmitResponse,
    PaymentVerifyRequest,
    PaymentVerifyResponse,
    PaymentStatusResponse,
    PaymentStatus as PaymentStatusModel,
    ExecutionStatus,
)

from ..services import payment_service

router = APIRouter(prefix="/payments", tags=["payments"])


@router.post("/submit", response_model=PaymentSubmitResponse)
async def submit_payment(payment_req: PaymentSubmitRequest):
    """
    Submit a payment intent for an intake request.
    Returns payment instructions and expected wait time.
    """
    if not payment_req.request_id.startswith("REQ-"):
        raise HTTPException(status_code=400, detail="Invalid request_id format")
    
    result = payment_service.submit_payment(
        request_id=payment_req.request_id,
        amount=payment_req.amount,
        method=payment_req.method,
        auto_approve=payment_req.auto_approve,
    )
    
    return PaymentSubmitResponse(**result)


@router.post("/verify", response_model=PaymentVerifyResponse)
async def verify_payment(verify_req: PaymentVerifyRequest):
    """
    Approve or reject a payment (admin action).
    Triggers client notification on approval/rejection.
    """
    result = payment_service.verify_payment(
        payment_id=verify_req.payment_id,
        action=verify_req.action,
        admin_notes=verify_req.admin_notes,
    )
    
    return PaymentVerifyResponse(**result)


@router.get("/status/{payment_id}", response_model=PaymentStatusResponse)
async def get_payment_status(payment_id: str):
    """Get the status of a specific payment."""
    result = payment_service.get_payment_status(payment_id)
    
    if not result:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    return PaymentStatusResponse(**result)


@router.get("/by-request/{request_id}", response_model=PaymentStatusResponse)
async def get_payment_by_request(request_id: str):
    """Get payment status by the associated request_id."""
    result = payment_service.get_payment_by_request_id(request_id)
    
    if not result:
        raise HTTPException(status_code=404, detail="Payment not found for this request")
    
    return PaymentStatusResponse(**result)


@router.post("/upload-receipt/{payment_id}")
async def upload_receipt(
    payment_id: str,
    file: UploadFile = File(...),
):
    """
    Upload a receipt image for a payment.
    Runs OCR and notifies admin for review.
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    image_data = await file.read()
    
    ocr_result = payment_service.process_receipt_ocr(payment_id, image_data)
    
    payment_service.send_internal_admin_notification(
        payment_id=payment_id,
        ocr_data=ocr_result.model_dump() if ocr_result else None,
    )
    
    return {
        "schema_version": "1.0",
        "payment_id": payment_id,
        "message": "Receipt uploaded. OCR processed. Pending admin review.",
        "ocr_extracted": ocr_result.model_dump() if ocr_result else None,
    }


@router.get("/pending", response_model=list)
async def get_pending_payments():
    """Get all pending payments (for admin dashboard)."""
    return payment_service.get_pending_payments()


@router.get("/all", response_model=list)
async def get_all_payments():
    """Get all payments (for admin dashboard)."""
    return payment_service.get_all_payments()


# Stripe webhook endpoint (scaffolded, only active if STRIPE_WEBHOOK_SECRET is set)
@router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook for payment confirmation."""
    from ..services.payment_service import handle_stripe_webhook, stripe
    from ..services.payment_service import STRIPE_WEBHOOK_SECRET

    if not stripe:
        raise HTTPException(status_code=503, detail="Stripe not configured")

    payload = await request.body()
    sig_header = request.headers.get("Stripe-Signature", "")
    webhook_secret = STRIPE_WEBHOOK_SECRET

    if not webhook_secret:
        raise HTTPException(status_code=500, detail="Stripe webhook secret not configured")

    result = handle_stripe_webhook(payload, sig_header, webhook_secret)

    if not result.get("success"):
        return Response(content=str(result.get("error", "unknown")), status_code=400)

    return {"status": "ok", "event_type": result.get("event_type", ""), **result}


router_consent = APIRouter(prefix="/consent", tags=["consent"])


@router_consent.post("/record", response_model=ConsentResponse)
async def record_consent(consent_req: ConsentRequest):
    """
    Record client consent before payment.
    Required: terms_accepted and data_processing_consent must be true.
    """
    if not consent_req.terms_accepted:
        raise HTTPException(
            status_code=400,
            detail="Terms of service must be accepted to proceed"
        )
    
    if not consent_req.data_processing_consent:
        raise HTTPException(
            status_code=400,
            detail="Data processing consent is required to proceed"
        )
    
    result = payment_service.save_consent(
        request_id=consent_req.request_id,
        consent_to_marketing=consent_req.consent_to_marketing,
        terms_accepted=consent_req.terms_accepted,
        data_processing_consent=consent_req.data_processing_consent,
    )
    
    return ConsentResponse(**result)


@router_consent.get("/status/{request_id}")
async def get_consent_status(request_id: str):
    """Get consent status for a request."""
    consent = payment_service.get_consent(request_id)
    
    if not consent:
        raise HTTPException(status_code=404, detail="No consent record found")
    
    return {
        "schema_version": "1.0",
        "request_id": request_id,
        "has_consent": payment_service.has_consent(request_id),
        "consent_record": consent,
    }


router_campaigns = APIRouter(prefix="/campaigns", tags=["campaigns"])


@router_campaigns.post("/execute", response_model=CampaignExecuteResponse)
async def execute_campaign(execute_req: CampaignExecuteRequest):
    """
    Execute a campaign.
    Requires: payment verified AND consent recorded.
    Returns 402 if payment not verified.
    """
    result = payment_service.execute_campaign(
        request_id=execute_req.request_id,
        campaign_data=execute_req.campaign_data,
    )
    
    if result["status"] == ExecutionStatus.FAILED:
        if "Payment not verified" in result["message"]:
            raise HTTPException(
                status_code=402,
                detail="Payment verification required before execution"
            )
        elif "Consent not recorded" in result["message"]:
            raise HTTPException(
                status_code=400,
                detail="Consent required before execution"
            )
    
    return CampaignExecuteResponse(**result)