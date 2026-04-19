# Phase 5: Post-Campaign Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add post-campaign analytics with delivery metrics, interaction tracking (opens, clicks, replies, opt-outs), consent-aware reporting, and JSON-based storage.

**Architecture:** New analytics service with tracking endpoints, enhanced report service, JSON storage for campaign metrics and contact-level interactions.

**Tech Stack:** Python/FastAPI (backend), JSON file storage, existing test framework

---

## File Structure

### New Files
- `apps/backend/app/services/analytics_service.py` - Analytics business logic
- `apps/backend/app/api/analytics.py` - Analytics API routes
- `apps/backend/tests/test_analytics_phase5.py` - Analytics tests

### Modified Files
- `apps/backend/app/main.py` - Register analytics router
- `apps/backend/app/services/report_service.py` - Enhanced with consent metrics
- `apps/frontend/src/lib/api/analytics.ts` - Frontend API client
- `apps/frontend/src/lib/contracts/analytics.ts` - Frontend contracts
- `docs/phase-5-analytics-runbook.md` - Verification runbook

---

## Tasks

### Task 1: Analytics Service

**Files:**
- Create: `apps/backend/app/services/analytics_service.py`
- Test: `apps/backend/tests/test_analytics_phase5.py`

- [ ] **Step 1: Write the failing test**

```python
import pytest
from app.services import analytics_service

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

def test_get_contact_interactions():
    analytics_service.record_event("CMP-004", "CNT-001", "SENT")
    analytics_service.record_event("CMP-004", "CNT-001", "OPENED")
    analytics_service.record_event("CMP-004", "CNT-001", "CLICKED")
    
    interactions = analytics_service.get_contact_interactions("CNT-001")
    assert len(interactions) > 0
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest apps/backend/tests/test_analytics_phase5.py::test_record_delivery_event_creates_campaign_metrics -v`
Expected: FAIL with "module 'app.services' has no attribute 'analytics_service'"

- [ ] **Step 3: Write minimal implementation**

```python
import json
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4


METRICS_STORAGE_FILE = Path("data/campaign_metrics.json")
CONTACT_INTERACTIONS_FILE = Path("data/contact_interactions.json")


def _to_utc_iso(value: datetime) -> str:
    return value.astimezone(UTC).isoformat().replace("+00:00", "Z")


def _load_metrics() -> dict[str, dict]:
    if not METRICS_STORAGE_FILE.exists():
        return {}
    try:
        with METRICS_STORAGE_FILE.open("r", encoding="utf-8") as handle:
            return json.load(handle)
    except (json.JSONDecodeError, OSError):
        return {}


def _save_metrics(metrics: dict[str, dict]) -> None:
    METRICS_STORAGE_FILE.parent.mkdir(parents=True, exist_ok=True)
    with METRICS_STORAGE_FILE.open("w", encoding="utf-8") as handle:
        json.dump(metrics, handle, indent=2)


def _load_contact_interactions() -> dict[str, dict]:
    if not CONTACT_INTERACTIONS_FILE.exists():
        return {}
    try:
        with CONTACT_INTERACTIONS_FILE.open("r", encoding="utf-8") as handle:
            return json.load(handle)
    except (json.JSONDecodeError, OSError):
        return {}


def _save_contact_interactions(data: dict[str, dict]) -> None:
    CONTACT_INTERACTIONS_FILE.parent.mkdir(parents=True, exist_ok=True)
    with CONTACT_INTERACTIONS_FILE.open("w", encoding="utf-8") as handle:
        json.dump(data, handle, indent=2)


def record_event(campaign_id: str, contact_id: str, event_type: str) -> dict:
    metrics = _load_metrics()
    
    if campaign_id not in metrics:
        metrics[campaign_id] = {
            "campaign_id": campaign_id,
            "delivery": {"sent": 0, "delivered": 0, "failed": 0},
            "interactions": {"opens": 0, "clicks": 0, "replies": 0, "opt_outs": 0},
            "consent_events": [],
            "updated_at": _to_utc_iso(datetime.now(UTC)),
        }
    
    campaign = metrics[campaign_id]
    
    if event_type == "SENT":
        campaign["delivery"]["sent"] += 1
    elif event_type == "DELIVERED":
        campaign["delivery"]["delivered"] += 1
    elif event_type == "FAILED":
        campaign["delivery"]["failed"] += 1
    elif event_type == "OPENED":
        campaign["interactions"]["opens"] += 1
    elif event_type == "CLICKED":
        campaign["interactions"]["clicks"] += 1
    elif event_type == "REPLIED":
        campaign["interactions"]["replies"] += 1
    elif event_type == "OPT_OUT":
        campaign["interactions"]["opt_outs"] += 1
        campaign["consent_events"].append({
            "contact_id": contact_id,
            "campaign_id": campaign_id,
            "event_type": "OPT_OUT",
            "timestamp": _to_utc_iso(datetime.now(UTC)),
        })
    
    campaign["updated_at"] = _to_utc_iso(datetime.now(UTC))
    _save_metrics(metrics)
    
    _update_contact_interaction(contact_id, campaign_id, event_type)
    
    return campaign


def _update_contact_interaction(contact_id: str, campaign_id: str, event_type: str) -> None:
    contacts = _load_contact_interactions()
    
    if contact_id not in contacts:
        contacts[contact_id] = {
            "contact_id": contact_id,
            "campaign_interactions": [],
        }
    
    contact = contacts[contact_id]
    
    interaction = next(
        (c for c in contact["campaign_interactions"] if c["campaign_id"] == campaign_id),
        None,
    )
    
    if interaction is None:
        interaction = {
            "campaign_id": campaign_id,
            "delivered": False,
            "opened": False,
            "clicked": False,
            "replied": False,
            "opted_out": False,
            "first_open_at": None,
            "last_click_at": None,
        }
        contact["campaign_interactions"].append(interaction)
    
    if event_type == "DELIVERED":
        interaction["delivered"] = True
    elif event_type == "OPENED":
        interaction["opened"] = True
        if interaction["first_open_at"] is None:
            interaction["first_open_at"] = _to_utc_iso(datetime.now(UTC))
    elif event_type == "CLICKED":
        interaction["clicked"] = True
        interaction["last_click_at"] = _to_utc_iso(datetime.now(UTC))
    elif event_type == "REPLIED":
        interaction["replied"] = True
    elif event_type == "OPT_OUT":
        interaction["opted_out"] = True
    
    _save_contact_interactions(contacts)


def get_campaign_metrics(campaign_id: str) -> dict:
    metrics = _load_metrics()
    campaign = metrics.get(campaign_id)
    
    if campaign is None:
        return {
            "campaign_id": campaign_id,
            "delivery": {"sent": 0, "delivered": 0, "failed": 0},
            "interactions": {"opens": 0, "clicks": 0, "replies": 0, "opt_outs": 0},
            "consent_summary": {"opted_in": 0, "opted_out": 0},
        }
    
    consent_summary = {
        "opted_in": campaign["delivery"].get("delivered", 0) - campaign["interactions"].get("opt_outs", 0),
        "opted_out": campaign["interactions"].get("opt_outs", 0),
    }
    
    return {
        "campaign_id": campaign_id,
        "delivery": campaign["delivery"],
        "interactions": campaign["interactions"],
        "consent_summary": consent_summary,
    }


def get_contact_interactions(contact_id: str) -> list[dict]:
    contacts = _load_contact_interactions()
    contact = contacts.get(contact_id)
    
    if contact is None:
        return []
    
    return contact.get("campaign_interactions", [])
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest apps/backend/tests/test_analytics_phase5.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/backend/app/services/analytics_service.py apps/backend/tests/test_analytics_phase5.py
git commit -m "feat(phase5): add analytics service with event tracking"
```

---

### Task 2: Analytics API Endpoints

**Files:**
- Create: `apps/backend/app/api/analytics.py`
- Modify: `apps/backend/app/main.py`

- [ ] **Step 1: Write the failing test**

```python
from fastapi.testclient import TestClient

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
    
    response = client.get("/contacts/CNT-X/interactions")
    
    assert response.status_code == 200
    assert len(response.json()) > 0
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest apps/backend/tests/test_analytics_phase5.py::test_record_event_endpoint -v`
Expected: FAIL with "POST /campaigns/CMP-001/events" not found

- [ ] **Step 3: Write minimal implementation**

```python
from datetime import datetime
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services import analytics_service


router = APIRouter(prefix="/campaigns", tags=["analytics"])


class CampaignEventRequest(BaseModel):
    campaign_id: str = Field(min_length=1)
    contact_id: str = Field(min_length=1)
    event_type: Literal["SENT", "DELIVERED", "FAILED", "OPENED", "CLICKED", "REPLIED", "OPT_OUT"]


class CampaignEventResponse(BaseModel):
    campaign_id: str
    delivery: dict[str, int]
    interactions: dict[str, int]


class CampaignMetricsResponse(BaseModel):
    campaign_id: str
    delivery: dict[str, int]
    interactions: dict[str, int]
    consent_summary: dict[str, int]


@router.post("/{campaign_id}/events", response_model=CampaignEventResponse)
def record_event(campaign_id: str, req: CampaignEventRequest) -> CampaignEventResponse:
    if campaign_id != req.campaign_id:
        raise HTTPException(status_code=400, detail="Campaign ID mismatch")
    
    result = analytics_service.record_event(
        campaign_id=req.campaign_id,
        contact_id=req.contact_id,
        event_type=req.event_type,
    )
    
    return CampaignEventResponse.model_validate(result)


@router.get("/{campaign_id}/metrics", response_model=CampaignMetricsResponse)
def get_campaign_metrics(campaign_id: str) -> CampaignMetricsResponse:
    result = analytics_service.get_campaign_metrics(campaign_id)
    return CampaignMetricsResponse.model_validate(result)


@router.get("/contacts/{contact_id}/interactions")
def get_contact_interactions(contact_id: str) -> list[dict]:
    return analytics_service.get_contact_interactions(contact_id)
```

- [ ] **Step 4: Register router in main.py**

```python
from app.api import analytics

app.include_router(analytics.router)
```

- [ ] **Step 5: Run test to verify it passes**

Run: `python -m pytest apps/backend/tests/test_analytics_phase5.py -v`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/backend/app/api/analytics.py apps/backend/app/main.py
git commit -m "feat(phase5): add analytics API endpoints"
```

---

### Task 3: Report Service Enhancement

**Files:**
- Modify: `apps/backend/app/services/report_service.py`

- [ ] **Step 1: Write the failing test**

```python
def test_report_includes_consent_summary():
    from app.services import report_service, analytics_service
    
    analytics_service.record_event("CMP-REPORT-1", "CNT-1", "SENT")
    analytics_service.record_event("CMP-REPORT-1", "CNT-1", "DELIVERED")
    analytics_service.record_event("CMP-REPORT-1", "CNT-1", "OPT_OUT")
    
    report = report_service.build_report("CMP-REPORT-1")
    
    assert "consent_summary" in report
    assert report["consent_summary"]["opted_out"] == 1
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest apps/backend/tests/test_analytics_phase5.py::test_report_includes_consent_summary -v`
Expected: FAIL with "consent_summary" not in report

- [ ] **Step 3: Write enhancement**

```python
from app.services import analytics_service, dispatch_service


def build_report(campaign_id: str) -> dict[str, object]:
    campaign = dispatch_service.get_campaign_for_dispatch(campaign_id)
    dispatch_ready = (
        campaign.get("payment_status") == "COMPLETED"
        and campaign.get("content_approval_status") == "APPROVED_BY_HUMAN"
        and bool(campaign.get("is_locked"))
    )
    
    metrics = analytics_service.get_campaign_metrics(campaign_id)
    
    return {
        "campaign_id": campaign_id,
        "delivery": metrics.get("delivery", {"sent": 0, "delivered": 0, "failed": 0}),
        "interactions": metrics.get("interactions", {"opens": 0, "clicks": 0, "replies": 0, "opt_outs": 0}),
        "consent_summary": metrics.get("consent_summary", {"opted_in": 0, "opted_out": 0}),
        "audience_fit_observations": [],
        "timing_performance_insights": [],
        "recommendations": [],
        "dispatch_ready": dispatch_ready,
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest apps/backend/tests/test_analytics_phase5.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/backend/app/services/report_service.py
git commit -m "feat(phase5): enhance report service with consent metrics"
```

---

### Task 4: Frontend API Client

**Files:**
- Create: `apps/frontend/src/lib/api/analytics.ts`
- Create: `apps/frontend/src/lib/contracts/analytics.ts`

- [ ] **Step 1: Write contracts**

```typescript
import { z } from "zod"

export const CampaignEventRequestSchema = z.object({
  schema_version: z.literal("1.0").default("1.0"),
  campaign_id: z.string().min(1),
  contact_id: z.string().min(1),
  event_type: z.enum(["SENT", "DELIVERED", "FAILED", "OPENED", "CLICKED", "REPLIED", "OPT_OUT"]),
})

export const CampaignEventResponseSchema = z.object({
  schema_version: z.literal("1.0").default("1.0"),
  campaign_id: z.string(),
  delivery: z.record(z.number()),
  interactions: z.record(z.number()),
})

export const CampaignMetricsResponseSchema = z.object({
  schema_version: z.literal("1.0").default("1.0"),
  campaign_id: z.string(),
  delivery: z.record(z.number()),
  interactions: z.record(z.number()),
  consent_summary: z.record(z.number()),
})

export type CampaignEventRequest = z.infer<typeof CampaignEventRequestSchema>
export type CampaignEventResponse = z.infer<typeof CampaignEventResponseSchema>
export type CampaignMetricsResponse = z.infer<typeof CampaignMetricsResponseSchema>
```

- [ ] **Step 2: Write API client**

```typescript
import {
  CampaignEventRequestSchema,
  CampaignEventResponseSchema,
  CampaignMetricsResponseSchema,
  type CampaignEventRequest,
  type CampaignEventResponse,
  type CampaignMetricsResponse,
} from "../contracts/analytics"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001"

async function parseJsonOrThrow(response: Response): Promise<unknown> {
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`)
  }
  return response.json()
}

export async function recordCampaignEvent(
  campaignId: string,
  request: CampaignEventRequest,
): Promise<CampaignEventResponse> {
  const parsed = CampaignEventRequestSchema.parse(request)

  const response = await fetch(`${API_BASE}/campaigns/${campaignId}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(parsed),
  })

  return CampaignEventResponseSchema.parse(await parseJsonOrThrow(response))
}

export async function getCampaignMetrics(
  campaignId: string,
): Promise<CampaignMetricsResponse> {
  const response = await fetch(`${API_BASE}/campaigns/${campaignId}/metrics`)

  return CampaignMetricsResponseSchema.parse(await parseJsonOrThrow(response))
}

export async function getContactInteractions(
  contactId: string,
): Promise<unknown[]> {
  const response = await fetch(`${API_BASE}/campaigns/contacts/${contactId}/interactions`)

  return parseJsonOrThrow(response)
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/lib/api/analytics.ts apps/frontend/src/lib/contracts/analytics.ts
git commit -m "feat(phase5): add frontend analytics API client"
```

---

### Task 5: Create Runbook & Final Verification

**Files:**
- Create: `docs/phase-5-analytics-runbook.md`

- [ ] **Step 1: Create runbook**

```markdown
# Phase 5 Analytics Runbook

## Purpose
Validate Phase 5 post-campaign analytics flow.

## Start Services
- Backend: `uvicorn app.main:app --reload --app-dir apps/backend --port 8001`

## Endpoint Tests

### Record Event
```bash
curl -X POST http://localhost:8001/campaigns/CMP-TEST/events \
  -H "Content-Type: application/json" \
  -d '{"campaign_id":"CMP-TEST","contact_id":"CNT-001","event_type":"SENT"}'
```
Expected: 200, delivery.sent = 1

### Get Metrics
```bash
curl http://localhost:8001/campaigns/CMP-TEST/metrics
```
Expected: 200 with delivery, interactions, consent_summary

### Get Contact Interactions
```bash
curl http://localhost:8001/campaigns/contacts/CNT-001/interactions
```
Expected: 200 with interaction list

## Test Commands
```bash
python -m pytest apps/backend/tests/test_analytics_phase5.py -v
```

## Verification
- All analytics tests pass
- API endpoints respond correctly
- Consent metrics included in reports
```

- [ ] **Step 2: Run full test suite**

```bash
python -m pytest apps/backend/tests -v
```

- [ ] **Step 3: Commit**

```bash
git add docs/phase-5-analytics-runbook.md
git commit -m "docs(phase5): add analytics runbook"
```

---

## Spec Coverage Check

- [x] Analytics service with tracking - Task 1
- [x] Delivery metrics (sent, delivered, failed) - Task 1
- [x] Interaction metrics (opens, clicks, replies, opt-outs) - Task 1
- [x] Consent/opt-out tracking - Task 1, Task 3
- [x] Report service enhancement - Task 3
- [x] JSON storage - Task 1
- [x] API endpoints - Task 2
- [x] Frontend client - Task 4

## Execution Choice

**Plan complete and saved to `docs/superpowers/plans/2026-04-05-phase-5-post-campaign-analytics.md`. Two execution options:**

1. **Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
