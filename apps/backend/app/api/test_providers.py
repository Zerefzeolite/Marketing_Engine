from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api/test", tags=["test"])


class SendEmailRequest(BaseModel):
    to_email: str
    subject: str
    message: str


class SendSMSRequest(BaseModel):
    to_phone: str
    message: str


@router.post("/email")
async def test_send_email(request: SendEmailRequest):
    from app.services.email_service import email_service
    
    result = await email_service.send_email(
        to_email=request.to_email,
        subject=request.subject,
        html_content=f"<html><body><p>{request.message}</p></body></html>",
    )
    return result


@router.post("/sms")
async def test_send_sms(request: SendSMSRequest):
    from app.services.sms_service import sms_service
    
    result = await sms_service.send_sms(
        to_number=request.to_phone,
        message=request.message,
    )
    return result


@router.get("/status")
async def test_status():
    from app.services.email_service import email_service
    from app.services.sms_service import sms_service
    
    return {
        "email": {
            "enabled": email_service.enabled,
            "provider": "Brevo",
        },
        "sms": {
            "enabled": sms_service.enabled,
            "provider": "Twilio",
            "trial_mode": True,
            "verified_phone": "+18763549375",
        },
    }