# Phase 6 System Assessment and Critical Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a complete Phase 6 assessment system across six domains with a live critical-remediation loop that blocks closure until P0/P1 findings are fixed and retested.

**Architecture:** Add a backend assessment service backed by JSON storage, expose assessment/finding/retest APIs, and build a frontend quality-gate portal for operations tracking. The backend enforces severity workflow rules, while the frontend provides scorecards, finding queues, and closure evidence visibility.

**Tech Stack:** Python/FastAPI/pytest (backend), Next.js/React/TypeScript/Vitest (frontend), JSON file storage, markdown runbook docs.

---

## File Structure

### New Files
- `apps/backend/app/models/assessment.py` - Pydantic contracts for domains, findings, and retest records
- `apps/backend/app/services/assessment_service.py` - Assessment persistence and remediation workflow rules
- `apps/backend/app/api/assessment.py` - FastAPI routes for matrix, findings, and retest lifecycle
- `apps/backend/tests/test_phase6_assessment_service.py` - Unit tests for severity and closure behavior
- `apps/backend/tests/test_phase6_assessment_api.py` - API tests for assessment endpoints
- `apps/frontend/src/lib/contracts/assessment.ts` - Frontend types mirroring backend contracts
- `apps/frontend/src/lib/api/assessment.ts` - Frontend API client for Phase 6 endpoints
- `apps/frontend/src/components/quality/DomainScorecard.tsx` - Domain status card component
- `apps/frontend/src/app/quality-gate/page.tsx` - Assessment operations portal page
- `apps/frontend/src/__tests__/quality-gate-phase6.test.tsx` - Frontend behavior tests for scorecards and critical lane
- `docs/phase-6-system-assessment-runbook.md` - Execution and verification runbook

### Modified Files
- `apps/backend/app/main.py` - Register Phase 6 assessment router

---

## Tasks

### Task 1: Assessment Domain Models and Service Rules

**Files:**
- Create: `apps/backend/app/models/assessment.py`
- Create: `apps/backend/app/services/assessment_service.py`
- Test: `apps/backend/tests/test_phase6_assessment_service.py`

- [ ] **Step 1: Write the failing service tests**

```python
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest apps/backend/tests/test_phase6_assessment_service.py -v`
Expected: FAIL with `cannot import name 'assessment_service'`.

- [ ] **Step 3: Add model contracts**

```python
from datetime import UTC, datetime
from typing import Literal

from pydantic import BaseModel, Field


DomainName = Literal[
    "ui_ux",
    "compliance_security",
    "backend_functionality",
    "client_contact_simulation",
    "efficiency_workflow",
    "website_portal",
]

Severity = Literal["P0", "P1", "P2", "P3"]
FindingStatus = Literal["OPEN", "IN_PROGRESS", "CLOSED"]
RetestResult = Literal["PASS", "FAIL"]


def utc_now_iso() -> str:
    return datetime.now(UTC).isoformat().replace("+00:00", "Z")


class RetestRecord(BaseModel):
    result: RetestResult
    evidence: list[str] = Field(default_factory=list)
    recorded_at: str = Field(default_factory=utc_now_iso)


class Finding(BaseModel):
    finding_id: str
    domain: DomainName
    title: str
    severity: Severity
    owner: str
    status: FindingStatus = "OPEN"
    notes: str = ""
    retests: list[RetestRecord] = Field(default_factory=list)
    created_at: str = Field(default_factory=utc_now_iso)
    updated_at: str = Field(default_factory=utc_now_iso)
```

- [ ] **Step 4: Add assessment service implementation**

```python
import json
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

from app.models.assessment import Finding


ASSESSMENT_STORAGE_FILE = Path("data/phase6_assessment.json")


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


def create_finding(domain: str, title: str, severity: str, owner: str) -> dict[str, object]:
    data = _load()
    finding = Finding(
        finding_id=f"FDG-{uuid4().hex[:8].upper()}",
        domain=domain,
        title=title,
        severity=severity,
        owner=owner,
        updated_at=_now_iso(),
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
    raise ValueError("finding not found")


def record_retest(finding_id: str, result: str, evidence: list[str]) -> dict[str, object]:
    data, finding = _get_finding_or_raise(finding_id)
    retests = finding.setdefault("retests", [])
    retests.append(
        {
            "result": result,
            "evidence": evidence,
            "recorded_at": _now_iso(),
        }
    )
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
            raise ValueError("Critical findings require passing retest evidence before close")

    finding["status"] = "CLOSED"
    finding["notes"] = notes
    finding["updated_at"] = _now_iso()
    _save(data)
    return dict(finding)
```

- [ ] **Step 5: Run tests to verify passing**

Run: `python -m pytest apps/backend/tests/test_phase6_assessment_service.py -v`
Expected: PASS (all tests green).

- [ ] **Step 6: Commit**

```bash
git add apps/backend/app/models/assessment.py apps/backend/app/services/assessment_service.py apps/backend/tests/test_phase6_assessment_service.py
git commit -m "feat(phase6): add assessment domain service and closure rules"
```

### Task 2: Phase 6 Assessment API Endpoints

**Files:**
- Create: `apps/backend/app/api/assessment.py`
- Modify: `apps/backend/app/main.py`
- Test: `apps/backend/tests/test_phase6_assessment_api.py`

- [ ] **Step 1: Write failing API tests**

```python
from fastapi.testclient import TestClient

from app.main import app


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
    finding_id = created.json()["finding_id"]

    closed = client.post(f"/assessment/findings/{finding_id}/close", json={"notes": "patched"})
    assert closed.status_code == 400
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest apps/backend/tests/test_phase6_assessment_api.py -v`
Expected: FAIL with 404 for `/assessment/findings`.

- [ ] **Step 3: Implement assessment API router**

```python
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services import assessment_service


router = APIRouter(prefix="/assessment", tags=["phase6-assessment"])


class CreateFindingRequest(BaseModel):
    domain: Literal[
        "ui_ux",
        "compliance_security",
        "backend_functionality",
        "client_contact_simulation",
        "efficiency_workflow",
        "website_portal",
    ]
    title: str = Field(min_length=3)
    severity: Literal["P0", "P1", "P2", "P3"]
    owner: str = Field(min_length=2)


class RetestRequest(BaseModel):
    result: Literal["PASS", "FAIL"]
    evidence: list[str] = Field(default_factory=list)


class CloseFindingRequest(BaseModel):
    notes: str = Field(min_length=2)


@router.get("/findings")
def list_findings() -> list[dict[str, object]]:
    return assessment_service.list_findings()


@router.post("/findings")
def create_finding(req: CreateFindingRequest) -> dict[str, object]:
    return assessment_service.create_finding(
        domain=req.domain,
        title=req.title,
        severity=req.severity,
        owner=req.owner,
    )


@router.post("/findings/{finding_id}/retest")
def record_retest(finding_id: str, req: RetestRequest) -> dict[str, object]:
    try:
        return assessment_service.record_retest(
            finding_id=finding_id,
            result=req.result,
            evidence=req.evidence,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/findings/{finding_id}/close")
def close_finding(finding_id: str, req: CloseFindingRequest) -> dict[str, object]:
    try:
        return assessment_service.close_finding(finding_id=finding_id, notes=req.notes)
    except ValueError as exc:
        detail = str(exc)
        status_code = 400 if "retest evidence" in detail.lower() else 404
        raise HTTPException(status_code=status_code, detail=detail) from exc
```

- [ ] **Step 4: Register router in backend app**

```python
from app.api import analytics, assessment

app.include_router(assessment.router)
```

- [ ] **Step 5: Run API tests to verify passing**

Run: `python -m pytest apps/backend/tests/test_phase6_assessment_api.py -v`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/app/api/assessment.py apps/backend/app/main.py apps/backend/tests/test_phase6_assessment_api.py
git commit -m "feat(phase6): expose assessment and retest lifecycle endpoints"
```

### Task 3: Frontend Contracts and API Client

**Files:**
- Create: `apps/frontend/src/lib/contracts/assessment.ts`
- Create: `apps/frontend/src/lib/api/assessment.ts`
- Test: `apps/frontend/src/__tests__/quality-gate-phase6.test.tsx`

- [ ] **Step 1: Write failing frontend contract test**

```tsx
import { describe, expect, it } from "vitest"
import { toDomainLabel } from "../lib/contracts/assessment"

describe("phase 6 assessment contracts", () => {
  it("maps domain key to readable label", () => {
    expect(toDomainLabel("compliance_security")).toBe("Compliance and Security")
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix apps/frontend test -- quality-gate-phase6.test.tsx`
Expected: FAIL with module not found for `lib/contracts/assessment`.

- [ ] **Step 3: Add frontend contracts**

```ts
export type AssessmentDomain =
  | "ui_ux"
  | "compliance_security"
  | "backend_functionality"
  | "client_contact_simulation"
  | "efficiency_workflow"
  | "website_portal"

export type FindingSeverity = "P0" | "P1" | "P2" | "P3"
export type FindingStatus = "OPEN" | "IN_PROGRESS" | "CLOSED"

export interface AssessmentFinding {
  finding_id: string
  domain: AssessmentDomain
  title: string
  severity: FindingSeverity
  owner: string
  status: FindingStatus
  notes: string
  retests: Array<{ result: "PASS" | "FAIL"; evidence: string[]; recorded_at: string }>
  created_at: string
  updated_at: string
}

export function toDomainLabel(domain: AssessmentDomain): string {
  const labels: Record<AssessmentDomain, string> = {
    ui_ux: "UI and UX",
    compliance_security: "Compliance and Security",
    backend_functionality: "Backend Functionality",
    client_contact_simulation: "Client/Contact Simulation",
    efficiency_workflow: "Efficiency and Workflow",
    website_portal: "Website and Portal",
  }
  return labels[domain]
}
```

- [ ] **Step 4: Add frontend API client**

```ts
import type { AssessmentFinding, AssessmentDomain, FindingSeverity } from "../contracts/assessment"

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8001"

export async function getFindings(): Promise<AssessmentFinding[]> {
  const response = await fetch(`${BASE_URL}/assessment/findings`, { cache: "no-store" })
  if (!response.ok) {
    throw new Error("Failed to load assessment findings")
  }
  return response.json()
}

export async function createFinding(input: {
  domain: AssessmentDomain
  title: string
  severity: FindingSeverity
  owner: string
}): Promise<AssessmentFinding> {
  const response = await fetch(`${BASE_URL}/assessment/findings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
  if (!response.ok) {
    throw new Error("Failed to create finding")
  }
  return response.json()
}
```

- [ ] **Step 5: Re-run frontend test**

Run: `npm --prefix apps/frontend test -- quality-gate-phase6.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src/lib/contracts/assessment.ts apps/frontend/src/lib/api/assessment.ts apps/frontend/src/__tests__/quality-gate-phase6.test.tsx
git commit -m "feat(phase6): add frontend assessment contracts and api client"
```

### Task 4: Quality-Gate Portal UI and Critical Lane Visibility

**Files:**
- Create: `apps/frontend/src/components/quality/DomainScorecard.tsx`
- Create: `apps/frontend/src/app/quality-gate/page.tsx`
- Test: `apps/frontend/src/__tests__/quality-gate-phase6.test.tsx`

- [ ] **Step 1: Add failing portal UI test for critical queue**

```tsx
import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { DomainScorecard } from "../components/quality/DomainScorecard"

describe("phase 6 quality gate portal", () => {
  it("shows unresolved critical count", () => {
    render(
      <DomainScorecard
        domainLabel="Compliance and Security"
        total={4}
        unresolvedCritical={2}
        closed={1}
      />,
    )

    expect(screen.getByText("Critical Open: 2")).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix apps/frontend test -- quality-gate-phase6.test.tsx`
Expected: FAIL with missing `DomainScorecard` component.

- [ ] **Step 3: Implement scorecard component**

```tsx
type DomainScorecardProps = {
  domainLabel: string
  total: number
  unresolvedCritical: number
  closed: number
}

export function DomainScorecard({
  domainLabel,
  total,
  unresolvedCritical,
  closed,
}: DomainScorecardProps) {
  return (
    <section style={{ border: "1px solid #d0d7de", borderRadius: 8, padding: 16, marginBottom: 12 }}>
      <h2 style={{ marginTop: 0 }}>{domainLabel}</h2>
      <p>Total Findings: {total}</p>
      <p>Critical Open: {unresolvedCritical}</p>
      <p>Closed: {closed}</p>
    </section>
  )
}
```

- [ ] **Step 4: Implement quality-gate page**

```tsx
"use client"

import { useEffect, useMemo, useState } from "react"

import { getFindings } from "../../lib/api/assessment"
import { toDomainLabel, type AssessmentDomain, type AssessmentFinding } from "../../lib/contracts/assessment"
import { DomainScorecard } from "../../components/quality/DomainScorecard"

const DOMAIN_ORDER: AssessmentDomain[] = [
  "ui_ux",
  "compliance_security",
  "backend_functionality",
  "client_contact_simulation",
  "efficiency_workflow",
  "website_portal",
]

export default function QualityGatePage() {
  const [findings, setFindings] = useState<AssessmentFinding[]>([])
  const [error, setError] = useState("")

  useEffect(() => {
    getFindings().then(setFindings).catch((err) => setError(err instanceof Error ? err.message : "Load failed"))
  }, [])

  const grouped = useMemo(() => {
    return DOMAIN_ORDER.map((domain) => {
      const items = findings.filter((item) => item.domain === domain)
      const unresolvedCritical = items.filter(
        (item) => (item.severity === "P0" || item.severity === "P1") && item.status !== "CLOSED",
      ).length
      const closed = items.filter((item) => item.status === "CLOSED").length
      return { domain, total: items.length, unresolvedCritical, closed }
    })
  }, [findings])

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: 24 }}>
      <h1>Phase 6 Quality Gate</h1>
      {error ? <p role="alert">{error}</p> : null}
      {grouped.map((row) => (
        <DomainScorecard
          key={row.domain}
          domainLabel={toDomainLabel(row.domain)}
          total={row.total}
          unresolvedCritical={row.unresolvedCritical}
          closed={row.closed}
        />
      ))}
    </main>
  )
}
```

- [ ] **Step 5: Re-run frontend tests**

Run: `npm --prefix apps/frontend test -- quality-gate-phase6.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src/components/quality/DomainScorecard.tsx apps/frontend/src/app/quality-gate/page.tsx apps/frontend/src/__tests__/quality-gate-phase6.test.tsx
git commit -m "feat(phase6): add quality gate portal with critical queue visibility"
```

### Task 5: Runbook, Verification, and Release Readiness Output

**Files:**
- Create: `docs/phase-6-system-assessment-runbook.md`

- [ ] **Step 1: Write failing doc verification check**

```bash
python -m pytest apps/backend/tests/test_phase6_assessment_service.py apps/backend/tests/test_phase6_assessment_api.py -v
```

Expected: If docs reference commands not yet implemented, this step identifies missing command coverage before publishing runbook.

- [ ] **Step 2: Add runbook content**

```markdown
# Phase 6 System Assessment Runbook

## Purpose
Operate the six-domain assessment and enforce critical remediation closure.

## Start Services
- Backend: `uvicorn app.main:app --reload --app-dir apps/backend --port 8001`
- Frontend: `npm --prefix apps/frontend run dev`

## Core Workflow
1. Create finding via `POST /assessment/findings`
2. Record retest evidence via `POST /assessment/findings/{finding_id}/retest`
3. Close finding via `POST /assessment/findings/{finding_id}/close`
4. Verify scorecards in `/quality-gate`

## Backend Verification
- `python -m pytest apps/backend/tests/test_phase6_assessment_service.py -v`
- `python -m pytest apps/backend/tests/test_phase6_assessment_api.py -v`

## Frontend Verification
- `npm --prefix apps/frontend test -- quality-gate-phase6.test.tsx`

## Exit Gate
- No open P0/P1 findings
- Retest evidence attached for all closed P0/P1 findings
- Domain scorecards reviewed and exported
```

- [ ] **Step 3: Verify all Phase 6 tests pass together**

Run: `python -m pytest apps/backend/tests/test_phase6_assessment_service.py apps/backend/tests/test_phase6_assessment_api.py -v && npm --prefix apps/frontend test -- quality-gate-phase6.test.tsx`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add docs/phase-6-system-assessment-runbook.md
git commit -m "docs(phase6): add system assessment and remediation runbook"
```

---

## Final Verification Checklist

- [ ] `python -m pytest apps/backend/tests/test_phase6_assessment_service.py -v`
- [ ] `python -m pytest apps/backend/tests/test_phase6_assessment_api.py -v`
- [ ] `npm --prefix apps/frontend test -- quality-gate-phase6.test.tsx`
- [ ] Manual smoke: open `http://localhost:3000/quality-gate` and confirm all six domain cards render
- [ ] Manual API smoke: create P1 finding, attempt close without retest (must fail), add PASS retest with evidence, then close (must succeed)
