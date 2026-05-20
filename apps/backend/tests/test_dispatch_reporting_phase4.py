from fastapi.testclient import TestClient
import pytest
from datetime import date, timedelta

from app.services import dispatch_service, report_service

try:
    from app.main import app
except ModuleNotFoundError:
    from apps.backend.app.main import app


def test_dispatch_gate_blocks_until_payment_human_approval_and_lock() -> None:
    client = TestClient(app)

    response = client.post("/campaigns/dispatch/start", json={"campaign_id": "CMP-123"})

    assert response.status_code == 400
    assert "payment" in response.json()["detail"].lower()


def test_email_weekly_randomized_weekday_sms_fortnight_schedule_is_deterministic() -> None:
    start_date = "2026-04-05"
    duration_weeks = 4

    schedule = dispatch_service.build_schedule(
        start_date="2026-04-05",
        duration_weeks=duration_weeks,
        channels=["email", "sms"],
    )
    repeated_schedule = dispatch_service.build_schedule(
        start_date=start_date,
        duration_weeks=duration_weeks,
        channels=["email", "sms"],
    )

    start = date.fromisoformat(start_date)

    assert schedule["email"] == repeated_schedule["email"]
    assert len(schedule["email"]) == duration_weeks
    for week, send_date in enumerate(schedule["email"]):
        week_start = start + timedelta(weeks=week)
        week_end = week_start + timedelta(days=6)
        actual = date.fromisoformat(send_date)
        assert week_start <= actual <= week_end
    assert len({date.fromisoformat(send_date).weekday() for send_date in schedule["email"]}) > 1

    assert schedule["sms"] == ["2026-04-05", "2026-04-19"]


def test_dispatch_start_allows_when_all_gate_conditions_met(monkeypatch: pytest.MonkeyPatch) -> None:
    client = TestClient(app)

    monkeypatch.setattr(
        dispatch_service,
        "get_campaign_for_dispatch",
        lambda campaign_id: {
            "campaign_id": campaign_id,
            "payment_status": "COMPLETED",
            "content_approval_status": "APPROVED_BY_HUMAN",
            "is_locked": True,
        },
    )

    response = client.post(
        "/campaigns/dispatch/start",
        json={
            "campaign_id": "CMP-READY",
            "start_date": "2026-04-05",
            "duration_weeks": 4,
            "channels": ["email", "sms"],
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["campaign_id"] == "CMP-READY"
    assert len(body["schedule"]["email"]) == 4
    assert len(body["schedule"]["sms"]) == 2


def test_build_report_returns_phase4_payload_with_task5_fields() -> None:
    body = report_service.build_report("CMP-123")

    assert body["campaign_id"] == "CMP-123"
    assert "delivery" in body
    assert "interactions" in body
    assert "audience_fit_observations" in body
    assert "timing_performance_insights" in body
    assert "recommendations" in body


def test_dispatch_start_returns_404_for_unknown_campaign() -> None:
    client = TestClient(app)

    response = client.post(
        "/campaigns/dispatch/start",
        json={
            "campaign_id": "CMP-UNKNOWN",
            "start_date": "2026-04-05",
            "duration_weeks": 4,
            "channels": ["email", "sms"],
        },
    )

    assert response.status_code == 404


def test_get_campaign_report_returns_404_for_unknown_campaign() -> None:
    client = TestClient(app)

    response = client.get("/campaigns/CMP-UNKNOWN/report")

    assert response.status_code == 404
