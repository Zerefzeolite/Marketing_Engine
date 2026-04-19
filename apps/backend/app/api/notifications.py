from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr

from app.services import notification_service


router = APIRouter(prefix="/notifications", tags=["notifications"])


class SendTestNotificationRequest(BaseModel):
    email: EmailStr
    title: str
    message: str


class NotificationResponse(BaseModel):
    notification_id: str
    type: str
    title: str
    message: str
    campaign_id: str | None
    recipient: str | None
    status: str
    sent_at: str


@router.get("")
def list_notifications(campaign_id: str | None = None, limit: int = 50) -> list[NotificationResponse]:
    results = notification_service.list_notifications(campaign_id=campaign_id, limit=limit)
    return [NotificationResponse.model_validate(r) for r in results]


@router.post("/test", response_model=NotificationResponse)
def send_test_notification(req: SendTestNotificationRequest) -> NotificationResponse:
    result = notification_service.send_notification(
        type="test",
        title=req.title,
        message=req.message,
        recipient=req.email,
    )
    return NotificationResponse.model_validate(result)