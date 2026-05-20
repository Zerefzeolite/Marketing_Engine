import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services import assessment_service


@pytest.fixture(autouse=True)
def isolate_assessment_storage(tmp_path, monkeypatch: pytest.MonkeyPatch) -> None:
    storage_file = tmp_path / "phase6_assessment.json"
    monkeypatch.setattr(assessment_service, "ASSESSMENT_STORAGE_FILE", storage_file)


def test_create_and_list_findings() -> None:
    client = TestClient(app)
    created = client.post(
        "/assessment/findings",
        json={
            "domain": "website_portal",
            "title": "Broken portal route",
            "severity": "P1",
            "owner": "frontend",
        },
    )
    assert created.status_code == 200
    finding_id = created.json()["finding_id"]

    listed = client.get("/assessment/findings")
    assert listed.status_code == 200
    assert any(item["finding_id"] == finding_id for item in listed.json())


def test_close_p1_requires_retest() -> None:
    client = TestClient(app)
    created = client.post(
        "/assessment/findings",
        json={
            "domain": "compliance_security",
            "title": "Consent state not auditable",
            "severity": "P1",
            "owner": "backend",
        },
    )
    assert created.status_code == 200
    finding_id = created.json()["finding_id"]

    closed = client.post(f"/assessment/findings/{finding_id}/close", json={"notes": "patched"})
    assert closed.status_code == 400


def test_record_retest_unknown_finding_returns_404() -> None:
    client = TestClient(app)

    retested = client.post(
        "/assessment/findings/FDG-UNKNOWN/retest",
        json={"result": "PASS", "evidence": ["report.json"]},
    )
    assert retested.status_code == 404


def test_record_retest_closed_finding_returns_400() -> None:
    client = TestClient(app)
    created = client.post(
        "/assessment/findings",
        json={
            "domain": "compliance_security",
            "title": "Stale access control test",
            "severity": "P2",
            "owner": "backend",
        },
    )
    assert created.status_code == 200
    finding_id = created.json()["finding_id"]

    closed = client.post(
        f"/assessment/findings/{finding_id}/close",
        json={"notes": "already resolved"},
    )
    assert closed.status_code == 200

    retested = client.post(
        f"/assessment/findings/{finding_id}/retest",
        json={"result": "PASS", "evidence": ["verification.txt"]},
    )
    assert retested.status_code == 400


def test_close_unknown_finding_returns_404() -> None:
    client = TestClient(app)

    closed = client.post(
        "/assessment/findings/FDG-UNKNOWN/close",
        json={"notes": "patched"},
    )
    assert closed.status_code == 404


def test_record_retest_then_close_succeeds_for_p1() -> None:
    client = TestClient(app)
    created = client.post(
        "/assessment/findings",
        json={
            "domain": "backend_functionality",
            "title": "Dispatch contract mismatch",
            "severity": "P1",
            "owner": "backend",
        },
    )
    assert created.status_code == 200
    finding_id = created.json()["finding_id"]

    retested = client.post(
        f"/assessment/findings/{finding_id}/retest",
        json={"result": "PASS", "evidence": ["dispatch-report.json"]},
    )
    assert retested.status_code == 200
    assert retested.json()["status"] == "IN_PROGRESS"

    closed = client.post(
        f"/assessment/findings/{finding_id}/close",
        json={"notes": "contract updated"},
    )
    assert closed.status_code == 200
    assert closed.json()["status"] == "CLOSED"
