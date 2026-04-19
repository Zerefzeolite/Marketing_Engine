# Phase 2 Client Intake Web Surface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local-first client intake web surface that captures campaign requirements, returns safe audience estimates, and shows package recommendations without exposing raw contacts.

**Architecture:** Implement a split monorepo structure with `apps/frontend` (Next.js + TypeScript) and `apps/backend` (FastAPI + Pydantic). Frontend submits validated intake payloads and renders recommendation summaries from backend endpoints. Backend enforces contract validation and only returns aggregate, client-safe fields.

**Tech Stack:** Next.js, TypeScript, Tailwind CSS, React Hook Form, Zod, FastAPI, Pydantic, pytest, Vitest, Playwright

---

### Task 1: Scaffold frontend and backend app structure

**Files:**
- Create: `apps/frontend/package.json`
- Create: `apps/frontend/src/app/page.tsx`
- Create: `apps/frontend/src/app/intake/page.tsx`
- Create: `apps/backend/requirements.txt`
- Create: `apps/backend/app/main.py`
- Create: `apps/backend/tests/test_health.py`

- [ ] **Step 1: Write the failing backend health test**

```python
# apps/backend/tests/test_health.py
from fastapi.testclient import TestClient
from app.main import app


def test_health_returns_ok() -> None:
    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest apps/backend/tests/test_health.py -v`
Expected: FAIL with missing `app.main` module

- [ ] **Step 3: Create minimal backend app and frontend placeholders**

```python
# apps/backend/app/main.py
from fastapi import FastAPI

app = FastAPI()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
```

```json
// apps/frontend/package.json
{
  "name": "ai-marketing-frontend",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "test": "vitest"
  }
}
```

```tsx
// apps/frontend/src/app/page.tsx
export default function HomePage() {
  return <main>AI Marketing Engine</main>
}
```

```tsx
// apps/frontend/src/app/intake/page.tsx
export default function IntakePage() {
  return <main>Campaign Intake</main>
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest apps/backend/tests/test_health.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/frontend apps/backend
git commit -m "feat: scaffold phase 2 frontend and backend apps"
```

### Task 2: Define intake contracts (Pydantic + Zod)

**Files:**
- Create: `apps/backend/app/models/intake.py`
- Create: `apps/frontend/src/lib/contracts/intake.ts`
- Create: `apps/backend/tests/test_intake_contract.py`

- [ ] **Step 1: Write failing backend contract test**

```python
# apps/backend/tests/test_intake_contract.py
from pydantic import ValidationError
from app.models.intake import IntakeSubmitRequest


def test_intake_requires_campaign_objective() -> None:
    try:
        IntakeSubmitRequest(
            business_name="Demo Co",
            contact_email="owner@demo.co",
            preferred_channel="email",
            budget_min=500,
        )
        assert False, "expected validation error"
    except ValidationError:
        assert True
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest apps/backend/tests/test_intake_contract.py -v`
Expected: FAIL due to missing `IntakeSubmitRequest`

- [ ] **Step 3: Implement request/response contracts**

```python
# apps/backend/app/models/intake.py
from pydantic import BaseModel, EmailStr, Field


class IntakeSubmitRequest(BaseModel):
    schema_version: str = "1.0"
    business_name: str
    contact_email: EmailStr
    campaign_objective: str
    preferred_channel: str
    budget_min: int = Field(ge=0)
    budget_max: int | None = Field(default=None, ge=0)


class IntakeSubmitResponse(BaseModel):
    schema_version: str = "1.0"
    request_id: str
    normalized_summary: dict[str, str]
```

```ts
// apps/frontend/src/lib/contracts/intake.ts
import { z } from "zod"

export const IntakeSubmitRequestSchema = z.object({
  schema_version: z.literal("1.0").default("1.0"),
  business_name: z.string().min(1),
  contact_email: z.string().email(),
  campaign_objective: z.string().min(1),
  preferred_channel: z.enum(["email", "sms", "both"]),
  budget_min: z.number().int().nonnegative(),
  budget_max: z.number().int().nonnegative().optional(),
})
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest apps/backend/tests/test_intake_contract.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/backend/app/models/intake.py apps/frontend/src/lib/contracts/intake.ts apps/backend/tests/test_intake_contract.py
git commit -m "feat: add versioned intake request and response contracts"
```

### Task 3: Implement intake submit and estimate endpoints

**Files:**
- Modify: `apps/backend/app/main.py`
- Create: `apps/backend/app/api/intake.py`
- Create: `apps/backend/app/services/intake_service.py`
- Create: `apps/backend/tests/test_intake_endpoints.py`

- [ ] **Step 1: Write failing endpoint tests**

```python
# apps/backend/tests/test_intake_endpoints.py
from fastapi.testclient import TestClient
from app.main import app


def test_submit_returns_request_id() -> None:
    client = TestClient(app)
    response = client.post(
        "/intake/submit",
        json={
            "business_name": "Demo Co",
            "contact_email": "owner@demo.co",
            "campaign_objective": "Promote event",
            "preferred_channel": "email",
            "budget_min": 500,
        },
    )
    assert response.status_code == 200
    assert "request_id" in response.json()


def test_estimate_returns_aggregate_fields_only() -> None:
    client = TestClient(app)
    response = client.post("/intake/estimate", json={"request_id": "REQ-1"})
    assert response.status_code == 200
    payload = response.json()
    assert "estimated_reachable" in payload
    assert "raw_contacts" not in payload
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest apps/backend/tests/test_intake_endpoints.py -v`
Expected: FAIL with missing routes

- [ ] **Step 3: Implement API routes and service stubs**

```python
# apps/backend/app/services/intake_service.py
from uuid import uuid4


def new_request_id() -> str:
    return f"REQ-{uuid4().hex[:8]}"


def estimate_summary(request_id: str) -> dict[str, int | str]:
    return {
        "request_id": request_id,
        "estimated_reachable": 1200,
        "channel_split": "email: 700, sms: 500",
        "confidence": "medium",
    }
```

```python
# apps/backend/app/api/intake.py
from fastapi import APIRouter

from app.models.intake import IntakeSubmitRequest, IntakeSubmitResponse
from app.services.intake_service import estimate_summary, new_request_id

router = APIRouter(prefix="/intake", tags=["intake"])


@router.post("/submit", response_model=IntakeSubmitResponse)
def submit(payload: IntakeSubmitRequest) -> IntakeSubmitResponse:
    request_id = new_request_id()
    summary = {
        "business_name": payload.business_name,
        "preferred_channel": payload.preferred_channel,
    }
    return IntakeSubmitResponse(request_id=request_id, normalized_summary=summary)


@router.post("/estimate")
def estimate(payload: dict[str, str]) -> dict[str, int | str]:
    return estimate_summary(payload["request_id"])
```

```python
# apps/backend/app/main.py
from fastapi import FastAPI
from app.api.intake import router as intake_router

app = FastAPI()
app.include_router(intake_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest apps/backend/tests/test_intake_endpoints.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/backend/app/main.py apps/backend/app/api/intake.py apps/backend/app/services/intake_service.py apps/backend/tests/test_intake_endpoints.py
git commit -m "feat: add intake submit and estimate api endpoints"
```

### Task 4: Build intake form wizard and recommendation preview UI

**Files:**
- Modify: `apps/frontend/src/app/intake/page.tsx`
- Create: `apps/frontend/src/components/intake/IntakeForm.tsx`
- Create: `apps/frontend/src/components/intake/RecommendationPreview.tsx`
- Create: `apps/frontend/src/lib/api/intake.ts`
- Create: `apps/frontend/src/lib/contracts/recommendation.ts`
- Create: `apps/frontend/src/__tests__/intake-form.test.tsx`

- [ ] **Step 1: Write failing form validation test**

```tsx
// apps/frontend/src/__tests__/intake-form.test.tsx
import { describe, expect, it } from "vitest"
import { IntakeSubmitRequestSchema } from "../lib/contracts/intake"

describe("intake contract", () => {
  it("rejects missing campaign objective", () => {
    const result = IntakeSubmitRequestSchema.safeParse({
      business_name: "Demo Co",
      contact_email: "owner@demo.co",
      preferred_channel: "email",
      budget_min: 500,
    })
    expect(result.success).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --dir apps/frontend test`
Expected: FAIL before form/api wiring is complete

- [ ] **Step 3: Implement intake form and preview components**

```tsx
// apps/frontend/src/components/intake/RecommendationPreview.tsx
type Props = {
  estimatedReachable: number
  recommendation: string
  confidence: string
}

export function RecommendationPreview({ estimatedReachable, recommendation, confidence }: Props) {
  return (
    <section>
      <p>Estimated reachable: {estimatedReachable}</p>
      <p>Recommended package: {recommendation}</p>
      <p>Confidence: {confidence}</p>
    </section>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --dir apps/frontend test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/app/intake/page.tsx apps/frontend/src/components/intake apps/frontend/src/lib/api/intake.ts apps/frontend/src/lib/contracts/recommendation.ts apps/frontend/src/__tests__/intake-form.test.tsx
git commit -m "feat: add intake wizard and recommendation preview ui"
```

### Task 5: Add end-to-end flow verification and docs

**Files:**
- Create: `apps/frontend/e2e/intake-flow.spec.ts`
- Create: `docs/phase-2-intake-runbook.md`
- Modify: `docs/current_structure.md`

- [ ] **Step 1: Write failing e2e smoke test**

```ts
// apps/frontend/e2e/intake-flow.spec.ts
import { test, expect } from "@playwright/test"

test("intake page loads", async ({ page }) => {
  await page.goto("http://localhost:3000/intake")
  await expect(page.getByText("Campaign Intake")).toBeVisible()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --dir apps/frontend exec playwright test apps/frontend/e2e/intake-flow.spec.ts`
Expected: FAIL until local dev server is running

- [ ] **Step 3: Add runbook and structure updates**

```md
# docs/phase-2-intake-runbook.md
# Phase 2 Intake Runbook

## Start services
- backend: `uvicorn app.main:app --reload --app-dir apps/backend`
- frontend: `pnpm --dir apps/frontend dev`

## Verify flow
- submit intake
- confirm request id
- confirm estimate and package summary

## Safety
- confirm no raw contact fields in client response payloads
```

- [ ] **Step 4: Run backend and frontend tests**

Run: `pytest apps/backend/tests -v`
Expected: PASS

Run: `pnpm --dir apps/frontend test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/e2e/intake-flow.spec.ts docs/phase-2-intake-runbook.md docs/current_structure.md
git commit -m "docs: add phase 2 intake runbook and flow verification"
```

## Verification Checklist

- [ ] `pytest apps/backend/tests -v` passes.
- [ ] `pnpm --dir apps/frontend test` passes.
- [ ] Intake submit returns request id and normalized summary.
- [ ] Estimate/recommend responses contain aggregate-safe fields only.
- [ ] No raw contact list data appears in frontend payloads.
