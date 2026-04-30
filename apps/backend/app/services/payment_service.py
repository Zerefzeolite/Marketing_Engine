import json
import os
import smtplib
from datetime import datetime, timezone
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

# Stripe scaffold - only initialized if STRIPE_SECRET_KEY is set
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
STRIPE_MODE = os.getenv("STRIPE_MODE", "test")  # "test" or "live"
stripe = None
if STRIPE_SECRET_KEY:
    try:
        import stripe as _stripe_lib
        _stripe_lib.api_key = STRIPE_SECRET_KEY
        _stripe_lib.api_version = "2024-11-30"
        stripe = _stripe_lib
    except ImportError:
        pass


SERVICE_FILE = Path(__file__).resolve()
DATA_DIR = SERVICE_FILE.parent.parent.parent.parent / "data"

PAYMENT_STORAGE_FILE = DATA_DIR / "payments.json"
CONSENT_STORAGE_FILE = DATA_DIR / "consents.json"
EXECUTION_STORAGE_FILE = DATA_DIR / "executions.json"
SESSIONS_FILE = DATA_DIR / "sessions.json"
CONTACTS_FILE = DATA_DIR / "contacts.json"


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


def submit_payment(request_id: str, amount: int, method: PaymentMethod, auto_approve: bool = False) -> dict:
    payments = _load_json(PAYMENT_STORAGE_FILE)

    # Prevent duplicate payment for same request
    for existing in payments.values():
        if existing["request_id"] == request_id and existing["status"] in (
            PaymentStatus.APPROVED.value, PaymentStatus.COMPLETED.value,
        ):
            return {
                "schema_version": "1.0",
                "payment_id": existing["payment_id"],
                "request_id": request_id,
                "amount": existing["amount"],
                "method": PaymentMethod(existing["method"]),
                "status": PaymentStatus(existing["status"]),
                "payment_instructions": "Payment already submitted for this request.",
                "expected_wait_time": "0",
                "message": "Duplicate payment prevented",
            }

    payment_id = new_payment_id()
    status = PaymentStatus.APPROVED if auto_approve else PaymentStatus.PENDING
    payment_record = {
        "payment_id": payment_id,
        "request_id": request_id,
        "amount": amount,
        "method": method.value,
        "status": status.value,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "verified_at": datetime.now(timezone.utc).isoformat() if auto_approve else None,
        "ocr_extracted": None,
        "admin_notes": "Auto-approved via dev button" if auto_approve else None,
        "stripe_payment_intent_id": None,
        "audit_trail": [{
            "event": "payment_submitted",
            "status": status.value,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "method": method.value,
        }],
    }

    payments[payment_id] = payment_record
    _save_json(PAYMENT_STORAGE_FILE, payments)

    instructions = _get_payment_instructions(method)
    wait_time = "0" if auto_approve else ("24-48 hours" if method in [PaymentMethod.LOCAL_BANK_TRANSFER, PaymentMethod.CASH] else None)

    result = {
        "schema_version": "1.0",
        "payment_id": payment_id,
        "request_id": request_id,
        "amount": amount,
        "method": method,
        "status": status,
        "payment_instructions": instructions,
        "expected_wait_time": wait_time,
    }

    # Stripe: create PaymentIntent (scaffold, not enabled unless STRIPE_SECRET_KEY is set)
    if method == PaymentMethod.STRIPE and stripe and not auto_approve:
        try:
            intent = stripe.PaymentIntent.create(
                amount=amount,
                currency="usd",
                metadata={"request_id": request_id, "payment_id": payment_id},
                automatic_payment_methods={"enabled": True},
            )
            payments = _load_json(PAYMENT_STORAGE_FILE)
            payments[payment_id]["stripe_payment_intent_id"] = intent.id
            payments[payment_id].setdefault("audit_trail", []).append({
                "event": "stripe_intent_created",
                "stripe_payment_intent_id": intent.id,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })
            _save_json(PAYMENT_STORAGE_FILE, payments)
            result["stripe_client_secret"] = intent.client_secret
        except Exception as e:
            payments = _load_json(PAYMENT_STORAGE_FILE)
            payments[payment_id].setdefault("audit_trail", []).append({
                "event": "stripe_intent_failed",
                "error": str(e),
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })
            _save_json(PAYMENT_STORAGE_FILE, payments)

    return result


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
        payment["status"] = PaymentStatus.APPROVED.value
        payment["verified_at"] = datetime.now(timezone.utc).isoformat()
        if admin_notes:
            payment["admin_notes"] = admin_notes
        payment.setdefault("audit_trail", []).append({
            "event": "payment_approved",
            "action": "approve",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "admin_notes": admin_notes or "",
        })

        _save_json(PAYMENT_STORAGE_FILE, payments)

        notification_sent = send_client_notification(
            request_id, "payment_approved", payment
        )

        # Auto-execute campaign after payment approval
        auto_execute_result = _auto_execute_campaign(request_id)

        return {
            "schema_version": "1.0",
            "payment_id": payment_id,
            "request_id": request_id,
            "status": PaymentStatus.APPROVED,
            "message": "Payment approved. Campaign launched for execution.",
            "notification_sent": notification_sent,
            "auto_executed": auto_execute_result.get("success", False),
            "execution_id": auto_execute_result.get("execution_id", ""),
        }
    else:
        payment["status"] = PaymentStatus.FAILED.value
        if admin_notes:
            payment["admin_notes"] = admin_notes
        payment.setdefault("audit_trail", []).append({
            "event": "payment_rejected",
            "action": "reject",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "admin_notes": admin_notes or "",
        })

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
    return payment["status"] in (PaymentStatus.APPROVED, PaymentStatus.COMPLETED)


def process_receipt_ocr(payment_id: str, image_data: bytes) -> OCRExtractedData:
    extracted = OCRExtractedData(
        amount=None,
        date=datetime.now(timezone.utc).strftime("%Y-%m-%d"),
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
        "consented_at": datetime.now(timezone.utc).isoformat(),
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
        "sent_at": datetime.now(timezone.utc).isoformat(),
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
        "sent_at": datetime.now(timezone.utc).isoformat(),
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

    # Duplicate execution protection: check if already executed for this request
    executions = _load_json(EXECUTION_STORAGE_FILE)
    for exec_record in executions.values():
        if exec_record.get("campaign_id") == request_id and exec_record.get("status") in (
            ExecutionStatus.COMPLETED.value, "COMPLETED", "executed",
        ):
            return {
                "schema_version": "1.0",
                "execution_id": exec_record.get("id", ""),
                "request_id": request_id,
                "status": ExecutionStatus.COMPLETED,
                "message": "Campaign already executed for this request. Duplicate prevented.",
            }

    # Create execution record via execution service
    from app.services import execution_service as exec_svc
    try:
        exec_record = exec_svc.start_execution(
            campaign_id=request_id,
            session_id=request_id,
        )
        execution_id = exec_record["execution_id"]

        # Complete execution (stub - real dispatch is in campaigns_v2.py)
        exec_svc.complete_execution(
            execution_id=execution_id,
            contacts_attempted=campaign_data.get("target_count", 0),
            contacts_delivered=campaign_data.get("target_count", 0),
            errors=[],
        )

        return {
            "schema_version": "1.0",
            "execution_id": execution_id,
            "request_id": request_id,
            "status": ExecutionStatus.COMPLETED,
            "message": "Campaign executed successfully.",
        }
    except Exception as e:
        return {
            "schema_version": "1.0",
            "execution_id": "",
            "request_id": request_id,
            "status": ExecutionStatus.FAILED,
            "message": f"Execution failed: {str(e)}",
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


def _auto_execute_campaign(request_id: str) -> dict:
    """Auto-execute campaign after payment approved."""
    if not is_payment_verified(request_id):
        return {
            "success": False,
            "error": "Payment not verified",
        }
    try:
        result = execute_campaign(request_id, {
            "channels": ["email"],
            "target_count": 1000,
        })
        return {
            "success": True,
            "execution_id": result.get("execution_id", ""),
            "status": result.get("status", ""),
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
        }


def handle_stripe_webhook(payload: bytes, sig_header: str, webhook_secret: str) -> dict:
    """Handle Stripe webhook for payment confirmation."""
    if not stripe:
        return {"success": False, "error": "Stripe not configured"}

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
    except Exception as e:
        return {"success": False, "error": f"Webhook signature verification failed: {e}"}

    if event["type"] == "payment_intent.succeeded":
        intent = event["data"]["object"]
        request_id = intent["metadata"].get("request_id")
        payment_id = intent["metadata"].get("payment_id")

        payments = _load_json(PAYMENT_STORAGE_FILE)
        if payment_id in payments:
            payments[payment_id]["status"] = PaymentStatus.APPROVED.value
            payments[payment_id]["verified_at"] = datetime.now(timezone.utc).isoformat()
            payments[payment_id].setdefault("audit_trail", []).append({
                "event": "stripe_webhook_payment_succeeded",
                "stripe_payment_intent_id": intent["id"],
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })
            _save_json(PAYMENT_STORAGE_FILE, payments)

            # Auto-execute campaign
            auto_execute_result = _auto_execute_campaign(request_id)
            return {
                "success": True,
                "payment_id": payment_id,
                "auto_executed": auto_execute_result.get("success", False),
                "execution_id": auto_execute_result.get("execution_id", ""),
            }

    return {"success": True, "event_type": event["type"]}