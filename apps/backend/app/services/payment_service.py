import json
import os
import smtplib
from datetime import datetime
from pathlib import Path
from uuid import uuid4

from ..models.payment import (
    ConsentRecord,
    ExecutionJob,
    ExecutionStatus,
    OCRExtractedData,
    PaymentMethod,
    PaymentStatus,
    PaymentVerifyRequest,
)


PAYMENT_STORAGE_FILE = "data/payments.json"
CONSENT_STORAGE_FILE = "data/consents.json"
EXECUTION_STORAGE_FILE = "data/executions.json"

DATA_DIR = Path("data")
DATA_DIR.mkdir(exist_ok=True)


def _load_json(file_path: str) -> dict:
    path = Path(file_path)
    if not path.exists():
        return {}
    with open(path, "r") as f:
        return json.load(f)


def _save_json(file_path: str, data: dict) -> None:
    path = Path(file_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w") as f:
        json.dump(data, f, indent=2, default=str)


def new_payment_id() -> str:
    return f"PAY-{uuid4().hex[:8]}"


def new_execution_id() -> str:
    return f"EXEC-{uuid4().hex[:8]}"


def submit_payment(request_id: str, amount: int, method: PaymentMethod) -> dict:
    payments = _load_json(PAYMENT_STORAGE_FILE)
    
    payment_id = new_payment_id()
    payment_record = {
        "payment_id": payment_id,
        "request_id": request_id,
        "amount": amount,
        "method": method.value,
        "status": PaymentStatus.PENDING.value,
        "created_at": datetime.utcnow().isoformat(),
        "verified_at": None,
        "ocr_extracted": None,
        "admin_notes": None,
    }
    
    payments[payment_id] = payment_record
    _save_json(PAYMENT_STORAGE_FILE, payments)
    
    instructions = _get_payment_instructions(method)
    wait_time = "24-48 hours" if method in [PaymentMethod.LOCAL_BANK_TRANSFER, PaymentMethod.CASH] else None
    
    return {
        "schema_version": "1.0",
        "payment_id": payment_id,
        "request_id": request_id,
        "amount": amount,
        "method": method,
        "status": PaymentStatus.PENDING,
        "payment_instructions": instructions,
        "expected_wait_time": wait_time,
    }


def _get_payment_instructions(method: PaymentMethod) -> str:
    instructions = {
        PaymentMethod.LOCAL_BANK_TRANSFER: (
            "Bank Transfer Details:\n"
            "Bank: National Commercial Bank (NCB)\n"
            "Account Name: Jamaica Marketing Services Ltd\n"
            "Account Number: 1234567890\n"
            "Reference: Use the payment ID as your reference\n"
            "Please upload your receipt after transfer."
        ),
        PaymentMethod.CASH: (
            "Cash Deposit Details:\n"
            "Bank: National Commercial Bank (NCB)\n"
            "Account Name: Jamaica Marketing Services Ltd\n"
            "Account Number: 1234567890\n"
            "Reference: Use the payment ID as your reference\n"
            "Visit any NCB branch to deposit cash."
        ),
        PaymentMethod.STRIPE: "Payment will be processed via Stripe checkout.",
        PaymentMethod.PAYPAL: "Payment will be processed via PayPal.",
    }
    return instructions.get(method, "Payment details pending.")


def verify_payment(payment_id: str, action: str, admin_notes: str | None = None) -> dict:
    payments = _load_json(PAYMENT_STORAGE_FILE)
    
    if payment_id not in payments:
        return {
            "schema_version": "1.0",
            "payment_id": payment_id,
            "request_id": "",
            "status": PaymentStatus.FAILED,
            "message": "Payment not found",
            "notification_sent": False,
        }
    
    payment = payments[payment_id]
    request_id = payment["request_id"]
    
    if action == "approve":
        payment["status"] = PaymentStatus.COMPLETED.value
        payment["verified_at"] = datetime.utcnow().isoformat()
        if admin_notes:
            payment["admin_notes"] = admin_notes
        
        _save_json(PAYMENT_STORAGE_FILE, payments)
        
        notification_sent = send_client_notification(
            request_id, "payment_approved", payment
        )
        
        return {
            "schema_version": "1.0",
            "payment_id": payment_id,
            "request_id": request_id,
            "status": PaymentStatus.COMPLETED,
            "message": "Payment verified and approved. Campaign is now eligible for execution.",
            "notification_sent": notification_sent,
        }
    else:
        payment["status"] = PaymentStatus.FAILED.value
        if admin_notes:
            payment["admin_notes"] = admin_notes
        
        _save_json(PAYMENT_STORAGE_FILE, payments)
        
        notification_sent = send_client_notification(
            request_id, "payment_rejected", payment
        )
        
        return {
            "schema_version": "1.0",
            "payment_id": payment_id,
            "request_id": request_id,
            "status": PaymentStatus.FAILED,
            "message": "Payment verification failed. Please contact support.",
            "notification_sent": notification_sent,
        }


def get_payment_status(payment_id: str) -> dict | None:
    payments = _load_json(PAYMENT_STORAGE_FILE)
    
    if payment_id not in payments:
        return None
    
    payment = payments[payment_id]
    return {
        "schema_version": "1.0",
        "payment_id": payment["payment_id"],
        "request_id": payment["request_id"],
        "amount": payment["amount"],
        "method": PaymentMethod(payment["method"]),
        "status": PaymentStatus(payment["status"]),
        "created_at": payment["created_at"],
        "verified_at": payment.get("verified_at"),
        "ocr_extracted": payment.get("ocr_extracted"),
        "admin_notes": payment.get("admin_notes"),
    }


def get_payment_by_request_id(request_id: str) -> dict | None:
    payments = _load_json(PAYMENT_STORAGE_FILE)
    
    for payment in payments.values():
        if payment["request_id"] == request_id:
            return get_payment_status(payment["payment_id"])
    return None


def is_payment_verified(request_id: str) -> bool:
    payment = get_payment_by_request_id(request_id)
    if not payment:
        return False
    return payment["status"] == PaymentStatus.COMPLETED


def process_receipt_ocr(payment_id: str, image_data: bytes) -> OCRExtractedData:
    extracted = OCRExtractedData(
        amount=None,
        date=datetime.utcnow().strftime("%Y-%m-%d"),
        reference_number=payment_id,
        sender_name="Unknown",
        sender_account=None,
        confidence=0.5,
    )
    
    payments = _load_json(PAYMENT_STORAGE_FILE)
    if payment_id in payments:
        payments[payment_id]["ocr_extracted"] = {
            "amount": extracted.amount,
            "date": extracted.date,
            "reference_number": extracted.reference_number,
            "sender_name": extracted.sender_name,
            "sender_account": extracted.sender_account,
            "confidence": extracted.confidence,
        }
        _save_json(PAYMENT_STORAGE_FILE, payments)
    
    return extracted


def save_consent(request_id: str, consent_to_marketing: bool, terms_accepted: bool, data_processing_consent: bool) -> dict:
    consents = _load_json(CONSENT_STORAGE_FILE)
    
    consent_record = {
        "request_id": request_id,
        "consent_to_marketing": consent_to_marketing,
        "terms_accepted": terms_accepted,
        "data_processing_consent": data_processing_consent,
        "consented_at": datetime.utcnow().isoformat(),
    }
    
    consents[request_id] = consent_record
    _save_json(CONSENT_STORAGE_FILE, consents)
    
    return {
        "schema_version": "1.0",
        "request_id": request_id,
        "consent_recorded": True,
        "message": "Consent recorded successfully. Please proceed to payment.",
    }


def get_consent(request_id: str) -> dict | None:
    consents = _load_json(CONSENT_STORAGE_FILE)
    return consents.get(request_id)


def has_consent(request_id: str) -> bool:
    consent = get_consent(request_id)
    if not consent:
        return False
    return consent.get("terms_accepted", False) and consent.get("data_processing_consent", False)


def send_client_notification(request_id: str, notification_type: str, payment_data: dict) -> bool:
    notification_log_path = DATA_DIR / "notifications.json"
    notifications = _load_json(str(notification_log_path))
    
    notification = {
        "notification_id": f"NOTIF-{uuid4().hex[:8]}",
        "request_id": request_id,
        "type": notification_type,
        "sent_at": datetime.utcnow().isoformat(),
        "payment_data": payment_data,
    }
    
    notifications[notification["notification_id"]] = notification
    _save_json(str(notification_log_path), notifications)
    
    return True


def send_internal_admin_notification(payment_id: str, ocr_data: dict | None) -> None:
    admin_log_path = DATA_DIR / "admin_notifications.json"
    admins = _load_json(str(admin_log_path))
    
    notification = {
        "admin_notification_id": f"ADMIN-{uuid4().hex[:8]}",
        "payment_id": payment_id,
        "type": "payment_pending_review",
        "sent_at": datetime.utcnow().isoformat(),
        "ocr_data": ocr_data,
    }
    
    admins[notification["admin_notification_id"]] = notification
    _save_json(str(admin_log_path), admins)


def execute_campaign(request_id: str, campaign_data: dict) -> dict:
    if not is_payment_verified(request_id):
        return {
            "schema_version": "1.0",
            "execution_id": "",
            "request_id": request_id,
            "status": ExecutionStatus.FAILED,
            "message": "Payment not verified. Cannot execute campaign.",
        }
    
    if not has_consent(request_id):
        return {
            "schema_version": "1.0",
            "execution_id": "",
            "request_id": request_id,
            "status": ExecutionStatus.FAILED,
            "message": "Consent not recorded. Cannot execute campaign.",
        }
    
    executions = _load_json(EXECUTION_STORAGE_FILE)
    
    execution_id = new_execution_id()
    execution_record = {
        "id": execution_id,
        "request_id": request_id,
        "status": ExecutionStatus.COMPLETED.value,
        "adapter_type": "stub",
        "executed_at": datetime.utcnow().isoformat(),
        "result_data": {
            "message": "Campaign executed (stub mode - no actual sending)",
            "campaign_data_summary": {
                "channels": campaign_data.get("channels", []),
                "target_count": campaign_data.get("target_count", 0),
            },
        },
    }
    
    executions[execution_id] = execution_record
    _save_json(EXECUTION_STORAGE_FILE, executions)
    
    return {
        "schema_version": "1.0",
        "execution_id": execution_id,
        "request_id": request_id,
        "status": ExecutionStatus.COMPLETED,
        "message": "Campaign executed successfully. Stub adapter - no actual messages sent.",
    }


def get_pending_payments() -> list[dict]:
    payments = _load_json(PAYMENT_STORAGE_FILE)
    pending = []
    for payment in payments.values():
        if payment["status"] == PaymentStatus.PENDING.value:
            pending.append(payment)
    return pending


def get_all_payments() -> list[dict]:
    payments = _load_json(PAYMENT_STORAGE_FILE)
    return list(payments.values())