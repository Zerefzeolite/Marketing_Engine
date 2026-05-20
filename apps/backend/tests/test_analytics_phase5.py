import pytest

from fastapi.testclient import TestClient
from app.main import app
from app.services import analytics_service, dispatch_service


@pytest.fixture(autouse=True)
def isolate_analytics_storage(tmp_path, monkeypatch: pytest.MonkeyPatch) -> None:
    metrics_file = tmp_path / "campaign_metrics.json"
    interactions_file = tmp_path / "contact_interactions.json"
    monkeypatch.setattr(analytics_service, "METRICS_STORAGE_FILE", metrics_file)
    monkeypatch.setattr(analytics_service, "CONTACT_INTERACTIONS_FILE", interactions_file)


def test_record_delivery_event_creates_campaign_metrics():
    result = analytics_service.record_event(
        campaign_id="CMP-001",
        contact_id="CNT-001",
        event_type="SENT",
    )
    assert result["campaign_id"] == "CMP-001"
    assert result["delivery"]["sent"] == 1


def test_record_multiple_events_aggregates_correctly():
    analytics_service.record_event("CMP-002", "CNT-001", "SENT")
    analytics_service.record_event("CMP-002", "CNT-002", "SENT")
    analytics_service.record_event("CMP-002", "CNT-002", "DELIVERED")
    
    metrics = analytics_service.get_campaign_metrics("CMP-002")
    assert metrics["delivery"]["sent"] == 2
    assert metrics["delivery"]["delivered"] == 1


def test_record_interaction_events():
    analytics_service.record_event("CMP-003", "CNT-001", "OPENED")
    analytics_service.record_event("CMP-003", "CNT-001", "CLICKED")
    analytics_service.record_event("CMP-003", "CNT-002", "OPT_OUT")
    
    metrics = analytics_service.get_campaign_metrics("CMP-003")
    assert metrics["interactions"]["opens"] == 1
    assert metrics["interactions"]["clicks"] == 1
    assert metrics["interactions"]["opt_outs"] == 1


def test_sent_event_is_suppressed_after_contact_opt_out_for_same_campaign() -> None:
    analytics_service.record_event("CMP-OPT-1", "CNT-OPTOUT", "SENT")
    analytics_service.record_event("CMP-OPT-1", "CNT-OPTOUT", "OPT_OUT")
    analytics_service.record_event("CMP-OPT-1", "CNT-OPTOUT", "SENT")

    metrics = analytics_service.get_campaign_metrics("CMP-OPT-1")
    assert metrics["delivery"]["sent"] == 1
    assert metrics["interactions"]["opt_outs"] == 1


def test_get_contact_interactions():
    analytics_service.record_event("CMP-004", "CNT-001", "SENT")
    analytics_service.record_event("CMP-004", "CNT-001", "OPENED")
    analytics_service.record_event("CMP-004", "CNT-001", "CLICKED")
    
    interactions = analytics_service.get_contact_interactions("CNT-001")
    assert len(interactions) > 0


def test_record_event_endpoint():
    client = TestClient(app)
    
    response = client.post(
        "/campaigns/CMP-001/events",
        json={
            "campaign_id": "CMP-001",
            "contact_id": "CNT-001",
            "event_type": "SENT",
        },
    )
    
    assert response.status_code == 200
    assert response.json()["delivery"]["sent"] == 1


def test_get_campaign_metrics_endpoint():
    client = TestClient(app)
    
    client.post("/campaigns/CMP-002/events", json={"campaign_id": "CMP-002", "contact_id": "CNT-001", "event_type": "SENT"})
    client.post("/campaigns/CMP-002/events", json={"campaign_id": "CMP-002", "contact_id": "CNT-001", "event_type": "OPENED"})
    
    response = client.get("/campaigns/CMP-002/metrics")
    
    assert response.status_code == 200
    body = response.json()
    assert body["delivery"]["sent"] == 1
    assert body["interactions"]["opens"] == 1


def test_get_contact_interactions_endpoint():
    client = TestClient(app)
    
    client.post("/campaigns/CMP-003/events", json={"campaign_id": "CMP-003", "contact_id": "CNT-X", "event_type": "SENT"})
    
    response = client.get("/campaigns/contacts/CNT-X/interactions")
    
    assert response.status_code == 200
    assert len(response.json()) > 0


def test_report_includes_consent_summary(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.services import report_service, analytics_service
    
    monkeypatch.setattr(
        dispatch_service,
        'get_campaign_for_dispatch',
        lambda campaign_id: {
            'campaign_id': campaign_id,
            'payment_status': 'COMPLETED',
            'content_approval_status': 'APPROVED_BY_HUMAN',
            'is_locked': True,
        },
    )
    
    analytics_service.record_event('CMP-REPORT-1', 'CNT-1', 'SENT')
    analytics_service.record_event('CMP-REPORT-1', 'CNT-1', 'DELIVERED')
    analytics_service.record_event('CMP-REPORT-1', 'CNT-1', 'OPT_OUT')
    
    report = report_service.build_report('CMP-REPORT-1')
    
    assert 'consent_summary' in report
    assert report['consent_summary']['opted_out'] == 1
