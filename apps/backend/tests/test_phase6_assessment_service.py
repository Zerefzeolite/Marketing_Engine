import json

import pytest

from app.services import assessment_service


@pytest.fixture(autouse=True)
def isolate_assessment_storage(tmp_path, monkeypatch: pytest.MonkeyPatch) -> None:
    storage_file = tmp_path / "phase6_assessment.json"
    monkeypatch.setattr(assessment_service, "ASSESSMENT_STORAGE_FILE", storage_file)


def test_create_finding_defaults_to_open_status() -> None:
    finding = assessment_service.create_finding(
        domain="compliance_security",
        title="Consent audit missing evidence",
        severity="P1",
        owner="ops",
    )
    assert finding["status"] == "OPEN"
    assert finding["severity"] == "P1"


def test_create_finding_initializes_created_and_updated_at_equally() -> None:
    finding = assessment_service.create_finding(
        domain="backend_functionality",
        title="Timestamp consistency for new finding",
        severity="P2",
        owner="backend",
    )

    assert finding["created_at"] == finding["updated_at"]


def test_close_finding_requires_retest_for_p1() -> None:
    finding = assessment_service.create_finding(
        domain="backend_functionality",
        title="Dispatch contract mismatch",
        severity="P1",
        owner="backend",
    )

    with pytest.raises(ValueError, match="retest evidence"):
        assessment_service.close_finding(finding_id=finding["finding_id"], notes="fixed")


def test_retest_then_close_p1_finding() -> None:
    finding = assessment_service.create_finding(
        domain="ui_ux",
        title="Mobile checkout CTA clipped",
        severity="P1",
        owner="frontend",
    )

    assessment_service.record_retest(
        finding_id=finding["finding_id"],
        result="PASS",
        evidence=["mobile-screenshot.png"],
    )

    closed = assessment_service.close_finding(
        finding_id=finding["finding_id"],
        notes="layout fixed on small screens",
    )
    assert closed["status"] == "CLOSED"


def test_record_retest_normalizes_malformed_retests_payload_to_list() -> None:
    finding = assessment_service.create_finding(
        domain="compliance_security",
        title="Malformed retests payload",
        severity="P2",
        owner="ops",
    )

    storage_file = assessment_service.ASSESSMENT_STORAGE_FILE
    persisted = json.loads(storage_file.read_text(encoding="utf-8"))
    persisted["findings"][0]["retests"] = {"unexpected": "object"}
    storage_file.write_text(json.dumps(persisted), encoding="utf-8")

    updated = assessment_service.record_retest(
        finding_id=finding["finding_id"],
        result="PASS",
        evidence=["proof.png"],
    )

    assert isinstance(updated["retests"], list)
    assert len(updated["retests"]) == 1
    assert updated["retests"][0]["result"] == "PASS"
