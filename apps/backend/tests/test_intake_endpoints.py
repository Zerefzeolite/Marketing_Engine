from fastapi.testclient import TestClient

try:
    from app.main import app
except ModuleNotFoundError:
    from apps.backend.app.main import app


def test_submit_returns_request_id_and_normalized_summary() -> None:
    client = TestClient(app)
    response = client.post(
        "/intake/submit",
        json={
            "schema_version": "1.0",
            "business_name": "Demo Co",
            "contact_email": "owner@demo.co",
            "campaign_objective": "Promote event",
            "preferred_channel": "email",
            "budget_min": 500,
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["schema_version"] == "1.0"
    assert "request_id" in payload
    assert payload["request_id"].startswith("REQ-")
    assert "normalized_summary" in payload
    assert payload["normalized_summary"] == {
        "business_name": "Demo Co",
        "preferred_channel": "email",
    }
    assert "raw_contacts" not in payload


def test_estimate_returns_aggregate_fields_only() -> None:
    client = TestClient(app)
    response = client.post("/intake/estimate", json={"schema_version": "1.0", "request_id": "REQ-1"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["schema_version"] == "1.0"
    assert payload["request_id"] == "REQ-1"
    assert "estimated_reachable" in payload
    assert "channel_split" in payload
    assert "confidence" in payload
    assert "raw_contacts" not in payload
    assert "suppression_details" not in payload
    assert "matching_trace" not in payload
    assert set(payload.keys()) == {
        "schema_version",
        "request_id",
        "estimated_reachable",
        "channel_split",
        "confidence",
    }


def test_recommend_returns_package_and_rationale() -> None:
    client = TestClient(app)
    response = client.post(
        "/intake/recommend",
        json={"schema_version": "1.0", "estimated_reachable": 1200, "budget_min": 5000},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["schema_version"] == "1.0"
    assert payload["recommended_package"] in {"starter", "growth", "premium"}
    assert payload["rationale_summary"]
