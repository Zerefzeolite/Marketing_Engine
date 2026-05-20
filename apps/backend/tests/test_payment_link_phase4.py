from fastapi.testclient import TestClient
import pytest

from app.services import campaign_service
from app.services import payment_link_service

try:
    from app.main import app
except ModuleNotFoundError:
    from apps.backend.app.main import app


@pytest.fixture(autouse=True)
def isolate_payment_link_storage(tmp_path, monkeypatch: pytest.MonkeyPatch) -> None:
    storage_file = tmp_path / "payment_links.json"
    monkeypatch.setattr(payment_link_service, "PAYMENT_LINK_STORAGE_FILE", storage_file)


@pytest.fixture(autouse=True)
def isolate_session_storage(tmp_path, monkeypatch: pytest.MonkeyPatch) -> None:
    storage_file = tmp_path / "campaign_sessions.json"
    monkeypatch.setattr(campaign_service, "SESSION_STORAGE_FILE", storage_file)


def test_stripe_link_created_in_test_mode() -> None:
    session = campaign_service.start_session("owner@example.com")
    session_id = session["campaign_session_id"]
    
    client = TestClient(app)

    response = client.post(
        "/campaigns/payment/link",
        json={
            "campaign_id": session_id,
            "method": "STRIPE_LINK",
            "amount": 5000,
            "provider_mode": "test",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["method"] == "STRIPE_LINK"
    assert body["provider"] == "stripe"
    assert body["provider_mode"] == "test"
    assert body["payment_url"] == f"https://checkout.stripe.com/pay/test_{session_id}"
    assert body["verification_status"] == "PENDING"


def test_paypal_link_created_in_test_mode() -> None:
    session = campaign_service.start_session("owner@example.com")
    session_id = session["campaign_session_id"]
    
    client = TestClient(app)

    response = client.post(
        "/campaigns/payment/link",
        json={
            "campaign_id": session_id,
            "method": "PAYPAL_LINK",
            "amount": 6400,
            "provider_mode": "test",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["method"] == "PAYPAL_LINK"
    assert body["provider"] == "paypal"
    assert body["provider_mode"] == "test"
    assert body["payment_url"] == f"https://www.sandbox.paypal.com/checkoutnow?token=test_{session_id}"
    assert body["verification_status"] == "PENDING"


def test_stripe_link_created_in_live_mode() -> None:
    session = campaign_service.start_session("owner@example.com")
    session_id = session["campaign_session_id"]
    
    client = TestClient(app)

    response = client.post(
        "/campaigns/payment/link",
        json={
            "campaign_id": session_id,
            "method": "STRIPE_LINK",
            "amount": 7500,
            "provider_mode": "live",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["method"] == "STRIPE_LINK"
    assert body["provider"] == "stripe"
    assert body["provider_mode"] == "live"
    assert body["payment_url"] == f"https://checkout.stripe.com/pay/live_{session_id}"
    assert body["verification_status"] == "PENDING"


def test_paypal_link_created_in_live_mode() -> None:
    session = campaign_service.start_session("owner@example.com")
    session_id = session["campaign_session_id"]
    
    client = TestClient(app)

    response = client.post(
        "/campaigns/payment/link",
        json={
            "campaign_id": session_id,
            "method": "PAYPAL_LINK",
            "amount": 8100,
            "provider_mode": "live",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["method"] == "PAYPAL_LINK"
    assert body["provider"] == "paypal"
    assert body["provider_mode"] == "live"
    assert body["payment_url"] == f"https://www.paypal.com/checkoutnow?token=live_{session_id}"
    assert body["verification_status"] == "PENDING"


def test_payment_link_blocked_without_approved_session() -> None:
    client = TestClient(app)

    response = client.post(
        "/campaigns/payment/link",
        json={
            "campaign_id": "SES-NONEXISTENT",
            "method": "STRIPE_LINK",
            "amount": 5000,
            "provider_mode": "test",
        },
    )

    assert response.status_code == 403
    assert "not found" in response.json()["detail"].lower()
