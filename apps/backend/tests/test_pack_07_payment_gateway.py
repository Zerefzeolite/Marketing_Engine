"""Pack 07 — Production Payment Gateway Tests"""
import json
import os
from pathlib import Path
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

SERVICE_FILE = Path(__file__).resolve()

from app.main import app

# Payment service writes to repo-root/data/
from app.services.payment_service import DATA_DIR as PAYMENT_DATA_DIR

client = TestClient(app)

payments_file = PAYMENT_DATA_DIR / "payments.json"


@pytest.fixture(autouse=True)
def setup_and_teardown():
    """Ensure clean payment state for each test."""
    if payments_file.exists():
        os.remove(payments_file)
    yield
    if payments_file.exists():
        os.remove(payments_file)


# ============================================================
# Helpers
# ============================================================

def _create_test_payment(amount: int = 5000, method: str = "STRIPE") -> dict:
    """Create a payment and return the response."""
    # First create an intake request (needed for payment) then submit payment
    resp = client.post("/payments/submit", json={
        "schema_version": "1.0",
        "request_id": "REQ-test-001",
        "amount": amount,
        "method": method,
    })
    return resp.json()


def _get_payments_file() -> dict:
    if not payments_file.exists():
        return {}
    with open(payments_file) as f:
        return json.load(f)


# ============================================================
# Stripe Config
# ============================================================

class TestStripeConfig:
    def test_stripe_config_returns_publishable_key(self):
        """GET /payments/stripe/config returns config even without keys."""
        resp = client.get("/payments/stripe/config")
        assert resp.status_code == 200
        data = resp.json()
        assert "publishable_key" in data
        assert "mode" in data
        assert data["enabled"] is False  # No key set by default

    def test_stripe_config_mode_is_test_by_default(self):
        """Default Stripe mode is 'test'."""
        resp = client.get("/payments/stripe/config")
        assert resp.json()["mode"] == "test"


# ============================================================
# Stripe Payment Intent
# ============================================================

class TestStripePaymentIntent:
    def test_create_payment_intent_requires_payment_id(self):
        """POST /payments/stripe/create-payment-intent rejects empty body."""
        resp = client.post("/payments/stripe/create-payment-intent", json={})
        assert resp.status_code == 400

    def test_create_payment_intent_requires_existing_payment(self):
        """Returns 404 for unknown payment_id."""
        resp = client.post("/payments/stripe/create-payment-intent", json={
            "payment_id": "PAY-nonexistent",
            "amount": 5000,
            "request_id": "REQ-test",
        })
        assert resp.status_code == 404

    def test_create_payment_intent_returns_mock_without_stripe_key(self):
        """Without STRIPE_SECRET_KEY, returns mock client_secret."""
        payment = _create_test_payment()
        pid = payment["payment_id"]

        resp = client.post("/payments/stripe/create-payment-intent", json={
            "payment_id": pid,
            "amount": 5000,
            "request_id": "REQ-test-001",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["payment_id"] == pid
        assert data["client_secret"].startswith("mock_secret_")
        assert data["mock"] is True

    def test_create_payment_intent_stores_intent_id_in_payment_record(self):
        """payment record gets stripe_payment_intent_id."""
        payment = _create_test_payment()
        pid = payment["payment_id"]
        resp = client.post("/payments/stripe/create-payment-intent", json={
            "payment_id": pid,
            "amount": 5000,
            "request_id": "REQ-test-001",
        })
        assert resp.status_code == 200

        payments = _get_payments_file()
        assert payments[pid]["stripe_payment_intent_id"] is not None

    def test_create_payment_intent_updates_audit_trail(self):
        """Audit trail records stripe_intent_created event."""
        payment = _create_test_payment()
        pid = payment["payment_id"]
        resp = client.post("/payments/stripe/create-payment-intent", json={
            "payment_id": pid,
            "amount": 5000,
            "request_id": "REQ-test-001",
        })
        assert resp.status_code == 200

        payments = _get_payments_file()
        trail = payments[pid].get("audit_trail", [])
        events = [e["event"] for e in trail]
        assert "stripe_intent_created" in events


# ============================================================
# PayPal
# ============================================================

class TestPayPal:
    def test_create_paypal_order_requires_payment_id(self):
        """POST /payments/paypal/create-order rejects empty payment_id."""
        resp = client.post("/payments/paypal/create-order", json={})
        assert resp.status_code == 400

    def test_create_paypal_order_returns_mock_without_credentials(self):
        """Without PAYPAL_CLIENT_ID, returns mock order."""
        payment = _create_test_payment(amount=5000, method="PAYPAL")
        pid = payment["payment_id"]

        resp = client.post("/payments/paypal/create-order", json={
            "payment_id": pid,
            "amount": 5000,
            "request_id": "REQ-test-001",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["order_id"].startswith("mock_order_")
        assert data["mock"] is True

    def test_capture_paypal_order_requires_order_id(self):
        """POST /payments/paypal/capture-order rejects missing order_id."""
        resp = client.post("/payments/paypal/capture-order", json={
            "payment_id": "PAY-test",
        })
        assert resp.status_code == 400

    def test_capture_paypal_order_returns_mock_without_credentials(self):
        """Without PayPal credentials, returns mock capture."""
        resp = client.post("/payments/paypal/capture-order", json={
            "order_id": "mock_order_test",
            "payment_id": "PAY-test",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "COMPLETED"
        assert data["mock"] is True


# ============================================================
# Payment Submit with Stripe/PayPal
# ============================================================

class TestSubmitPaymentWithGateway:
    def test_submit_stripe_payment_creates_pending_status(self):
        """Submitting with STRIPE method creates PENDING payment."""
        resp = client.post("/payments/submit", json={
            "schema_version": "1.0",
            "request_id": "REQ-stripe-test",
            "amount": 7500,
            "method": "STRIPE",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["method"] == "STRIPE"
        assert data["status"] in ("PENDING",)

    def test_submit_paypal_payment_creates_pending_status(self):
        """Submitting with PAYPAL method creates PENDING payment."""
        resp = client.post("/payments/submit", json={
            "schema_version": "1.0",
            "request_id": "REQ-paypal-test",
            "amount": 7500,
            "method": "PAYPAL",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["method"] == "PAYPAL"
        assert data["status"] in ("PENDING",)

    def test_submit_payment_with_stripe_has_instructions(self):
        """Stripe payment includes instructions."""
        resp = client.post("/payments/submit", json={
            "schema_version": "1.0",
            "request_id": "REQ-inst-test",
            "amount": 3000,
            "method": "STRIPE",
        })
        assert resp.status_code == 200
        assert resp.json()["payment_instructions"] is not None


# ============================================================
# Stripe Webhook
# ============================================================

class TestStripeWebhook:
    def test_webhook_returns_error_without_stripe(self):
        """Webhook returns 503 if Stripe not configured."""
        resp = client.post("/payments/webhook/stripe")
        assert resp.status_code == 503
        assert "not configured" in resp.json()["detail"]
