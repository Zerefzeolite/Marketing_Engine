from datetime import UTC, datetime, timedelta

from app.models.campaign import CampaignSession, ModerationResult
from app.services import campaign_service
import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

try:
    from app.main import app
except ModuleNotFoundError:
    from apps.backend.app.main import app


@pytest.fixture(autouse=True)
def isolate_campaign_session_storage(tmp_path, monkeypatch: pytest.MonkeyPatch) -> None:
    storage_file = tmp_path / "campaign_sessions.json"
    monkeypatch.setattr(campaign_service, "SESSION_STORAGE_FILE", storage_file)


def test_campaign_session_defaults() -> None:
    session = CampaignSession(client_email="owner@example.com")
    assert session.status == "ACTIVE"
    assert session.ai_attempt_count == 0
    assert session.expires_at.tzinfo == UTC


def test_moderation_result_requires_scores() -> None:
    result = ModerationResult(
        campaign_id="CMP-1",
        safety_score=72,
        audience_match_score=66,
        decision="REVISION_REQUIRED",
    )
    assert result.decision == "REVISION_REQUIRED"


def test_moderation_result_missing_score_fields_fails_validation() -> None:
    with pytest.raises(ValidationError):
        ModerationResult.model_validate(
            {
                "campaign_id": "CMP-1",
                "decision": "REVISION_REQUIRED",
            }
        )


def test_moderation_result_missing_decision_fails_validation() -> None:
    with pytest.raises(ValidationError):
        ModerationResult.model_validate(
            {
                "campaign_id": "CMP-1",
                "safety_score": 72,
                "audience_match_score": 66,
            }
        )


@pytest.mark.parametrize("field_name", ["safety_score", "audience_match_score"])
@pytest.mark.parametrize("value", [-1, 101])
def test_moderation_result_score_bounds_fail_validation(field_name: str, value: int) -> None:
    payload = {
        "campaign_id": "CMP-1",
        "safety_score": 72,
        "audience_match_score": 66,
        "decision": "REVISION_REQUIRED",
    }
    payload[field_name] = value

    with pytest.raises(ValidationError):
        ModerationResult.model_validate(payload)


def test_campaign_session_invalid_status_fails_validation() -> None:
    with pytest.raises(ValidationError):
        CampaignSession.model_validate(
            {
                "client_email": "owner@example.com",
                "status": "UNKNOWN",
            }
        )


def test_moderation_result_invalid_decision_fails_validation() -> None:
    with pytest.raises(ValidationError):
        ModerationResult.model_validate(
            {
                "campaign_id": "CMP-1",
                "safety_score": 72,
                "audience_match_score": 66,
                "decision": "UNKNOWN",
            }
        )


def test_campaign_session_start_returns_campaign_session_id() -> None:
    client = TestClient(app)

    response = client.post("/campaigns/session/start", json={"client_email": "owner@example.com"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["campaign_session_id"].startswith("SES-")
    assert payload["status"] == "ACTIVE"


def test_moderation_check_passes_when_scores_meet_thresholds() -> None:
    client = TestClient(app)
    start = client.post("/campaigns/session/start", json={"client_email": "owner@example.com"}).json()

    response = client.post(
        "/campaigns/moderation/check",
        json={
            "campaign_session_id": start["campaign_session_id"],
            "campaign_id": "CMP-123",
            "safety_score": 75,
            "audience_match_score": 70,
        },
    )

    assert response.status_code == 200
    assert response.json()["decision"] == "PASS"


def test_failed_moderation_increments_attempts_and_requires_revision_before_cap() -> None:
    client = TestClient(app)
    start = client.post("/campaigns/session/start", json={"client_email": "owner@example.com"}).json()
    response = client.post(
        "/campaigns/moderation/check",
        json={
            "campaign_session_id": start["campaign_session_id"],
            "campaign_id": "CMP-123",
            "safety_score": 50,
            "audience_match_score": 40,
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["decision"] == "REVISION_REQUIRED"
    assert payload["ai_attempt_count"] == 1


def test_third_failed_ai_check_offers_manual_review() -> None:
    client = TestClient(app)
    start = client.post("/campaigns/session/start", json={"client_email": "owner@example.com"}).json()
    payload = {
        "campaign_session_id": start["campaign_session_id"],
        "campaign_id": "CMP-123",
        "safety_score": 50,
        "audience_match_score": 40,
    }

    client.post("/campaigns/moderation/check", json=payload)
    client.post("/campaigns/moderation/check", json=payload)
    third = client.post("/campaigns/moderation/check", json=payload)

    assert third.status_code == 200
    body = third.json()
    assert body["decision"] == "MANUAL_REVIEW_OFFERED"
    assert body["ai_attempt_count"] == 3


def test_moderation_check_returns_404_for_unknown_session() -> None:
    client = TestClient(app)

    response = client.post(
        "/campaigns/moderation/check",
        json={
            "campaign_session_id": "SES-NOT-FOUND",
            "campaign_id": "CMP-123",
            "safety_score": 80,
            "audience_match_score": 80,
        },
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Session not found"


def test_manual_review_request_before_offer_is_blocked() -> None:
    client = TestClient(app)
    start = client.post("/campaigns/session/start", json={"client_email": "owner@example.com"}).json()

    response = client.post(
        "/campaigns/moderation/manual-review/request",
        json={
            "campaign_session_id": start["campaign_session_id"],
            "accepted": True,
        },
    )

    assert response.status_code == 409


def test_manual_review_request_accepts_and_returns_ticket_id() -> None:
    client = TestClient(app)
    start = client.post("/campaigns/session/start", json={"client_email": "owner@example.com"}).json()

    moderation_payload = {
        "campaign_session_id": start["campaign_session_id"],
        "campaign_id": "CMP-123",
        "safety_score": 50,
        "audience_match_score": 40,
    }
    client.post("/campaigns/moderation/check", json=moderation_payload)
    client.post("/campaigns/moderation/check", json=moderation_payload)
    third = client.post("/campaigns/moderation/check", json=moderation_payload)
    assert third.status_code == 200
    assert third.json()["decision"] == "MANUAL_REVIEW_OFFERED"

    response = client.post(
        "/campaigns/moderation/manual-review/request",
        json={
            "campaign_session_id": start["campaign_session_id"],
            "accepted": True,
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "UNDER_MANUAL_REVIEW"
    assert body["expires_at"] is None
    assert body["reminder_at"] is None
    assert body["reminder_hours_before_expiry"] == 0
    assert isinstance(body["manual_review_ticket_id"], str)
    assert body["manual_review_ticket_id"]


def test_manual_review_request_returns_404_for_unknown_session() -> None:
    client = TestClient(app)

    response = client.post(
        "/campaigns/moderation/manual-review/request",
        json={
            "campaign_session_id": "SES-NOT-FOUND",
            "accepted": True,
        },
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Session not found"


def test_declined_manual_review_sets_draft_and_reminder_window() -> None:
    client = TestClient(app)
    start = client.post("/campaigns/session/start", json={"client_email": "owner@example.com"}).json()

    moderation_payload = {
        "campaign_session_id": start["campaign_session_id"],
        "campaign_id": "CMP-123",
        "safety_score": 50,
        "audience_match_score": 40,
    }
    client.post("/campaigns/moderation/check", json=moderation_payload)
    client.post("/campaigns/moderation/check", json=moderation_payload)
    third = client.post("/campaigns/moderation/check", json=moderation_payload)
    assert third.status_code == 200
    assert third.json()["decision"] == "MANUAL_REVIEW_OFFERED"

    response = client.post(
        "/campaigns/moderation/manual-review/request",
        json={
            "campaign_session_id": start["campaign_session_id"],
            "accepted": False,
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "DRAFT_HELD"
    assert body["reminder_hours_before_expiry"] == 5
    assert body["expires_at"].endswith("Z")
    assert body["reminder_at"].endswith("Z")
    assert body["manual_review_ticket_id"] is None

    expires_at = datetime.fromisoformat(body["expires_at"])
    reminder_at = datetime.fromisoformat(body["reminder_at"])
    delta = expires_at - reminder_at
    assert delta == timedelta(hours=5)


@pytest.mark.parametrize(
    "client_email",
    [
        "",
        "   ",
        "not-an-email",
        "owner at example.com",
    ],
)
def test_start_session_rejects_invalid_client_email(client_email: str) -> None:
    client = TestClient(app)

    response = client.post("/campaigns/session/start", json={"client_email": client_email})

    assert response.status_code == 422


def test_start_session_recovers_from_malformed_session_storage() -> None:
    campaign_service.SESSION_STORAGE_FILE.parent.mkdir(parents=True, exist_ok=True)
    campaign_service.SESSION_STORAGE_FILE.write_text("{malformed", encoding="utf-8")
    client = TestClient(app)

    response = client.post("/campaigns/session/start", json={"client_email": "owner@example.com"})

    assert response.status_code == 200
    assert response.json()["campaign_session_id"].startswith("SES-")
