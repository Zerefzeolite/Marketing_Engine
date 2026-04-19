import json
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

from app.models.assessment import DomainName, Finding, RetestRecord, RetestResult, Severity


ASSESSMENT_STORAGE_FILE = Path("data/phase6_assessment.json")


class FindingNotFoundError(ValueError):
    pass


class InvalidFindingStateError(ValueError):
    pass


def _now_iso() -> str:
    return datetime.now(UTC).isoformat().replace("+00:00", "Z")


def _load() -> dict[str, object]:
    if not ASSESSMENT_STORAGE_FILE.exists():
        return {"findings": []}

    try:
        with ASSESSMENT_STORAGE_FILE.open("r", encoding="utf-8") as handle:
            data = json.load(handle)
            if isinstance(data, dict) and isinstance(data.get("findings"), list):
                return data
    except (json.JSONDecodeError, OSError):
        pass

    return {"findings": []}


def _save(data: dict[str, object]) -> None:
    ASSESSMENT_STORAGE_FILE.parent.mkdir(parents=True, exist_ok=True)
    with ASSESSMENT_STORAGE_FILE.open("w", encoding="utf-8") as handle:
        json.dump(data, handle, indent=2)


def list_findings() -> list[dict[str, object]]:
    data = _load()
    findings = data.get("findings", [])
    return [dict(item) for item in findings if isinstance(item, dict)]


def create_finding(domain: DomainName, title: str, severity: Severity, owner: str) -> dict[str, object]:
    data = _load()
    timestamp = _now_iso()
    finding = Finding(
        finding_id=f"FDG-{uuid4().hex[:8].upper()}",
        domain=domain,
        title=title,
        severity=severity,
        owner=owner,
        created_at=timestamp,
        updated_at=timestamp,
    ).model_dump(mode="json")
    findings = data["findings"]
    findings.append(finding)
    _save(data)
    return finding


def _get_finding_or_raise(finding_id: str) -> tuple[dict[str, object], dict[str, object]]:
    data = _load()
    findings = data.get("findings", [])
    for finding in findings:
        if isinstance(finding, dict) and finding.get("finding_id") == finding_id:
            return data, finding
    raise FindingNotFoundError("finding not found")


def record_retest(finding_id: str, result: RetestResult, evidence: list[str]) -> dict[str, object]:
    data, finding = _get_finding_or_raise(finding_id)

    if finding.get("status") == "CLOSED":
        raise InvalidFindingStateError("Cannot record retest for CLOSED finding")

    retests_payload = finding.get("retests", [])
    retests = retests_payload if isinstance(retests_payload, list) else []

    retest_record = RetestRecord(result=result, evidence=evidence)
    retests.append(retest_record.model_dump(mode="json"))
    finding["retests"] = retests
    finding["status"] = "IN_PROGRESS"
    finding["updated_at"] = _now_iso()
    _save(data)
    return dict(finding)


def close_finding(finding_id: str, notes: str) -> dict[str, object]:
    data, finding = _get_finding_or_raise(finding_id)
    severity = finding.get("severity")
    retests = finding.get("retests", [])

    if severity in {"P0", "P1"}:
        has_passing_retest = any(
            isinstance(item, dict)
            and item.get("result") == "PASS"
            and isinstance(item.get("evidence"), list)
            and len(item.get("evidence", [])) > 0
            for item in retests
        )
        if not has_passing_retest:
            raise InvalidFindingStateError("Critical findings require passing retest evidence before close")

    finding["status"] = "CLOSED"
    finding["notes"] = notes
    finding["updated_at"] = _now_iso()
    _save(data)
    return dict(finding)
