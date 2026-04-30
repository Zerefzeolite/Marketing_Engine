"""
Pack 04: Payment Integration + Launch Control Tests
"""
import pytest
from datetime import datetime
from pathlib import Path

from app.models.payment import PaymentMethod, PaymentStatus
from app.services import payment_service
from app.services.payment_service import (
    _load_json, _save_json, PAYMENT_STORAGE_FILE, EXECUTION_STORAGE_FILE,
    SESSIONS_FILE, CONTACTS_FILE,
    new_payment_id, is_payment_verified, submit_payment, verify_payment,
    execute_campaign,
)


@pytest.fixture(autouse=True)
def clean_data_files():
    """Clean data files before and after each test."""
    data_dir = Path("data")
    for f in [PAYMENT_STORAGE_FILE, EXECUTION_STORAGE_FILE, "data/consents.json"]:
        p = Path(f)
        if p.exists():
            p.unlink()
    yield
    for f in [PAYMENT_STORAGE_FILE, EXECUTION_STORAGE_FILE, "data/consents.json"]:
        p = Path(f)
        if p.exists():
            p.unlink()


class TestPaymentStatusModel:
    """Test PaymentStatus enum includes APPROVED."""

    def test_approved_status_exists(self):
        assert PaymentStatus.APPROVED == "APPROVED"

    def test_approved_is_not_completed(self):
        assert PaymentStatus.APPROVED != PaymentStatus.COMPLETED

    def test_all_statuses(self):
        statuses = [s.value for s in PaymentStatus]
        assert "APPROVED" in statuses
        assert "COMPLETED" in statuses
        assert "PENDING" in statuses
        assert "FAILED" in statuses


class TestSubmitPayment:
    """Test submit_payment with duplicate protection and Stripe scaffold."""

    def test_submit_creates_approved_when_auto_approve(self):
        result = submit_payment(
            request_id="REQ-TEST01",
            amount=5000,
            method=PaymentMethod.CASH,
            auto_approve=True,
        )
        assert result["status"] == PaymentStatus.APPROVED
        assert result["payment_id"].startswith("PAY-")

    def test_submit_creates_pending_by_default(self):
        result = submit_payment(
            request_id="REQ-TEST02",
            amount=5000,
            method=PaymentMethod.LOCAL_BANK_TRANSFER,
        )
        assert result["status"] == PaymentStatus.PENDING

    def test_duplicate_payment_prevents_resubmission(self):
        submit_payment(
            request_id="REQ-TEST03",
            amount=5000,
            method=PaymentMethod.CASH,
            auto_approve=True,
        )
        # Second submit for same request should return existing payment
        result2 = submit_payment(
            request_id="REQ-TEST03",
            amount=5000,
            method=PaymentMethod.CASH,
        )
        assert "Duplicate" in result2.get("message", "")

    def test_submit_includes_audit_trail(self):
        result = submit_payment(
            request_id="REQ-TEST04",
            amount=5000,
            method=PaymentMethod.CASH,
        )
        payments = _load_json(PAYMENT_STORAGE_FILE)
        payment = payments[result["payment_id"]]
        assert "audit_trail" in payment
        assert len(payment["audit_trail"]) > 0
        assert payment["audit_trail"][0]["event"] == "payment_submitted"


class TestVerifyPayment:
    """Test verify_payment with APPROVED status and audit trail."""

    def test_approve_sets_approved_status(self):
        submit_payment("REQ-V01", 5000, PaymentMethod.CASH, auto_approve=False)
        payments = _load_json(PAYMENT_STORAGE_FILE)
        payment_id = list(payments.keys())[0]

        result = verify_payment(payment_id, action="approve", admin_notes="Approved")
        assert result["status"] == PaymentStatus.APPROVED

    def test_reject_sets_failed_status(self):
        submit_payment("REQ-V02", 5000, PaymentMethod.CASH, auto_approve=False)
        payments = _load_json(PAYMENT_STORAGE_FILE)
        payment_id = list(payments.keys())[0]

        result = verify_payment(payment_id, action="reject", admin_notes="Rejected")
        assert result["status"] == PaymentStatus.FAILED

    def test_approve_adds_audit_trail(self):
        submit_payment("REQ-V03", 5000, PaymentMethod.CASH, auto_approve=False)
        payments = _load_json(PAYMENT_STORAGE_FILE)
        payment_id = list(payments.keys())[0]

        verify_payment(payment_id, action="approve", admin_notes="Approved")
        payments = _load_json(PAYMENT_STORAGE_FILE)
        payment = payments[payment_id]
        events = [a["event"] for a in payment.get("audit_trail", [])]
        assert "payment_approved" in events


class TestIsPaymentVerified:
    """Test is_payment_verified checks APPROVED and COMPLETED."""

    def test_returns_true_for_approved(self):
        submit_payment("REQ-IV1", 5000, PaymentMethod.CASH, auto_approve=True)
        assert is_payment_verified("REQ-IV1") is True

    def test_returns_false_for_pending(self):
        submit_payment("REQ-IV2", 5000, PaymentMethod.CASH, auto_approve=False)
        assert is_payment_verified("REQ-IV2") is False

    def test_returns_false_for_no_payment(self):
        assert is_payment_verified("REQ-NONEXISTENT") is False


class TestExecuteCampaign:
    """Test execute_campaign with duplicate protection."""

    def test_duplicate_execution_prevents_relaunch(self):
        # Setup: create approved payment, consent, session, and contacts
        submit_payment("REQ-E01", 5000, PaymentMethod.CASH, auto_approve=True)
        payment_service.save_consent("REQ-E01", True, True, True)

        # Create session data
        sessions = {"REQ-E01": {
            "estimated_reachable": 10,
            "channel_split": "email:100%",
            "template_content": "Test message",
            "template_type": "email",
        }}
        _save_json(SESSIONS_FILE, sessions)

        # Create contact data
        contacts = {"CNT-001": {"email": "test@example.com", "preferred_channel": "email", "opt_out": False}}
        _save_json(CONTACTS_FILE, contacts)

        # First execution
        result1 = execute_campaign("REQ-E01", {"channels": ["email"], "target_count": 10})
        assert result1["status"].value == "COMPLETED"

        # Second execution should be blocked
        result2 = execute_campaign("REQ-E01", {"channels": ["email"], "target_count": 10})
        assert "already executed" in result2["message"].lower() or "duplicate" in result2["message"].lower()

    def test_execution_requires_verified_payment(self):
        result = execute_campaign("REQ-E02", {"channels": ["email"], "target_count": 10})
        assert result["status"].value == "FAILED"
        assert "verified" in result["message"].lower()

    def test_execution_requires_consent(self):
        submit_payment("REQ-E03", 5000, PaymentMethod.CASH, auto_approve=True)
        result = execute_campaign("REQ-E03", {"channels": ["email"], "target_count": 10})
        assert result["status"].value == "FAILED"


class TestStripeScaffold:
    """Test Stripe scaffold is properly configured but disabled by default."""

    def test_stripe_not_initialized_without_key(self):
        from app.services.payment_service import stripe
        # STRIPE_SECRET_KEY not set in test env
        assert stripe is None

    def test_stripe_webhook_handler_exists(self):
        from app.services.payment_service import handle_stripe_webhook
        assert callable(handle_stripe_webhook)

    def test_webhook_returns_error_without_stripe(self):
        from app.services.payment_service import handle_stripe_webhook
        result = handle_stripe_webhook(b"test", "sig", "secret")
        assert result["success"] is False


class TestAuditTrail:
    """Test audit trail is maintained on all payment actions."""

    def test_audit_trail_in_payment_record(self):
        result = submit_payment("REQ-A01", 5000, PaymentMethod.STRIPE)
        payments = _load_json(PAYMENT_STORAGE_FILE)
        payment = payments[result["payment_id"]]
        assert "audit_trail" in payment
        assert isinstance(payment["audit_trail"], list)

    def test_audit_trail_timestamps_are_valid(self):
        result = submit_payment("REQ-A02", 5000, PaymentMethod.CASH)
        payments = _load_json(PAYMENT_STORAGE_FILE)
        payment = payments[result["payment_id"]]
        ts = payment["audit_trail"][0]["timestamp"]
        # Should be valid ISO format
        parsed = datetime.fromisoformat(ts)
        assert isinstance(parsed, datetime)

