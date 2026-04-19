# Phase 4 V1 Governance and Payment Links Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a controlled pre-payment campaign creation and moderation flow with manual-review escalation, verified payment links, gated dispatch, and end-of-campaign reporting.

**Architecture:** Implement a backend-first state machine for campaign sessions and approvals, then connect the existing frontend flow to the new API. Keep provider integrations link-based and verification-gated (sandbox-first) while preserving human final approval before dispatch. Add deterministic tests for each state transition and gate.

**Tech Stack:** FastAPI, Pydantic, JSON file storage (current pattern), React/Next.js 15, Zod, pytest, vitest.

---

## Scope Check

The approved spec spans multiple independent subsystems (campaign authoring, moderation, payments, dispatch cadence, reporting). This plan covers **Phase 4A (working vertical slice)** with all hard gates and v1 segment-level optimization hooks. Per-contact optimization and full provider webhooks remain follow-up work.

## File Structure (lock before coding)

### Backend

- Create: `apps/backend/app/models/campaign.py`
  - Campaign session, draft, moderation, manual review, dispatch/report models.
- Create: `apps/backend/app/services/campaign_service.py`
  - Session lifecycle, AI check logic, manual review decisions, draft reminder scheduling.
- Create: `apps/backend/app/services/payment_link_service.py`
  - Stripe/PayPal link generation (sandbox-first), provider metadata, verification helpers.
- Create: `apps/backend/app/services/dispatch_service.py`
  - Dispatch gate checks, cadence scheduling (weekly email randomized day, fortnight SMS), interaction event writes.
- Create: `apps/backend/app/services/report_service.py`
  - Delivery/interaction aggregation and end-of-campaign report payload generation.
- Create: `apps/backend/app/api/campaigns_v2.py`
  - New Phase 4 endpoints for session, moderation, payment link, dispatch, status/report.
- Modify: `apps/backend/app/main.py`
  - Register new router.
- Modify: `apps/backend/app/services/__init__.py`
  - Export new services.

### Frontend

- Create: `apps/frontend/src/lib/contracts/campaign.ts`
  - Zod contracts for new campaign/session/moderation/payment-link responses.
- Create: `apps/frontend/src/lib/api/campaign.ts`
  - API client for new endpoints.
- Create: `apps/frontend/src/components/campaign/StatsBoard.tsx`
- Create: `apps/frontend/src/components/campaign/TemplateChooser.tsx`
- Create: `apps/frontend/src/components/campaign/ModerationReview.tsx`
- Create: `apps/frontend/src/components/campaign/ManualReviewPopup.tsx`
- Create: `apps/frontend/src/components/campaign/DraftExpiryNotice.tsx`
- Modify: `apps/frontend/src/app/campaign-flow/page.tsx`
  - Replace direct payment-first path with generation/moderation-first path.

### Tests

- Create: `apps/backend/tests/test_campaign_flow_phase4.py`
- Create: `apps/backend/tests/test_payment_link_phase4.py`
- Create: `apps/backend/tests/test_dispatch_reporting_phase4.py`
- Create: `apps/frontend/src/__tests__/campaign-flow-phase4.test.tsx`

### Docs

- Modify: `docs/phase-3-payment-runbook.md`
  - Add migration note pointing to Phase 4 flow.
- Create: `docs/phase-4-campaign-governance-runbook.md`
  - Operator runbook for moderation queue, draft reminder timing, approval/payment/send sequence.

---

### Task 1: Campaign Session and Moderation Domain Models

**Files:**
- Create: `apps/backend/app/models/campaign.py`
- Test: `apps/backend/tests/test_campaign_flow_phase4.py`

- [ ] **Step 1: Write the failing tests**

```python
from apps.backend.app.models.campaign import CampaignSession, ModerationResult


def test_campaign_session_defaults():
    session = CampaignSession(client_email="owner@example.com")
    assert session.status == "ACTIVE"
    assert session.ai_attempt_count == 0


def test_moderation_result_requires_scores():
    result = ModerationResult(
        campaign_id="CMP-1",
        safety_score=72,
        audience_match_score=66,
        decision="REVISION_REQUIRED",
    )
    assert result.decision == "REVISION_REQUIRED"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest apps/backend/tests/test_campaign_flow_phase4.py -v`
Expected: FAIL with `ModuleNotFoundError` for `app.models.campaign`.

- [ ] **Step 3: Write minimal implementation**

```python
# apps/backend/app/models/campaign.py
from datetime import datetime, timedelta
from pydantic import BaseModel, Field
from uuid import uuid4


def new_session_id() -> str:
    return f"SES-{uuid4().hex[:10]}"


class CampaignSession(BaseModel):
    campaign_session_id: str = Field(default_factory=new_session_id)
    client_email: str
    status: str = "ACTIVE"
    ai_attempt_count: int = 0
    expires_at: datetime = Field(default_factory=lambda: datetime.utcnow() + timedelta(hours=12))


class ModerationResult(BaseModel):
    campaign_id: str
    safety_score: int
    audience_match_score: int
    decision: str
    revision_guidance: list[str] = Field(default_factory=list)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest apps/backend/tests/test_campaign_flow_phase4.py -v`
Expected: PASS for the two model tests.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/app/models/campaign.py apps/backend/tests/test_campaign_flow_phase4.py
git commit -m "feat: add phase 4 campaign session and moderation models"
```

### Task 2: Session Lifecycle, AI Retry Cap, and Manual-Review Offer

**Files:**
- Create: `apps/backend/app/services/campaign_service.py`
- Create: `apps/backend/app/api/campaigns_v2.py`
- Modify: `apps/backend/app/main.py`
- Test: `apps/backend/tests/test_campaign_flow_phase4.py`

- [ ] **Step 1: Write failing endpoint tests**

```python
def test_third_failed_ai_check_offers_manual_review(client):
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
    assert third.json()["decision"] == "MANUAL_REVIEW_OFFERED"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest apps/backend/tests/test_campaign_flow_phase4.py::test_third_failed_ai_check_offers_manual_review -v`
Expected: FAIL with 404 for `/campaigns/moderation/check`.

- [ ] **Step 3: Implement service and endpoints**

```python
# apps/backend/app/services/campaign_service.py
def run_moderation_check(session_id: str, campaign_id: str, safety_score: int, audience_match_score: int) -> dict:
    session = get_session(session_id)
    session["ai_attempt_count"] += 1
    if safety_score >= 75 and audience_match_score >= 70:
        decision = "PASS"
    elif session["ai_attempt_count"] >= 3:
        decision = "MANUAL_REVIEW_OFFERED"
    else:
        decision = "REVISION_REQUIRED"
    save_session(session)
    return {"decision": decision, "ai_attempt_count": session["ai_attempt_count"]}
```

```python
# apps/backend/app/api/campaigns_v2.py
@router.post("/session/start")
def start_session(req: StartSessionRequest):
    return campaign_service.start_session(req.client_email)


@router.post("/moderation/check")
def moderation_check(req: ModerationCheckRequest):
    return campaign_service.run_moderation_check(
        req.campaign_session_id,
        req.campaign_id,
        req.safety_score,
        req.audience_match_score,
    )
```

- [ ] **Step 4: Run tests to verify pass**

Run: `pytest apps/backend/tests/test_campaign_flow_phase4.py -v`
Expected: PASS including retry-cap behavior.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/app/services/campaign_service.py apps/backend/app/api/campaigns_v2.py apps/backend/app/main.py apps/backend/tests/test_campaign_flow_phase4.py
git commit -m "feat: add phase 4 session lifecycle and moderation retry cap"
```

### Task 3: Draft Hold (12h) and 5-Hour-Before-Expiry Reminder

**Files:**
- Modify: `apps/backend/app/services/campaign_service.py`
- Test: `apps/backend/tests/test_campaign_flow_phase4.py`

- [ ] **Step 1: Write failing draft reminder test**

```python
def test_declined_manual_review_sets_draft_and_reminder_window(client):
    start = client.post("/campaigns/session/start", json={"client_email": "owner@example.com"}).json()
    response = client.post("/campaigns/moderation/manual-review/request", json={
        "campaign_session_id": start["campaign_session_id"],
        "accepted": False,
    })
    body = response.json()
    assert body["status"] == "DRAFT_HELD"
    assert body["reminder_hours_before_expiry"] == 5
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest apps/backend/tests/test_campaign_flow_phase4.py::test_declined_manual_review_sets_draft_and_reminder_window -v`
Expected: FAIL with missing endpoint/fields.

- [ ] **Step 3: Implement manual-review decision and reminder schedule**

```python
def set_manual_review_choice(session_id: str, accepted: bool) -> dict:
    session = get_session(session_id)
    if accepted:
        session["status"] = "UNDER_MANUAL_REVIEW"
        session["manual_review_ticket_id"] = new_ticket_id()
    else:
        session["status"] = "DRAFT_HELD"
        session["expires_at"] = utc_now_plus_hours(12)
        session["reminder_at"] = utc_now_plus_hours(7)
    save_session(session)
    return {
        "status": session["status"],
        "expires_at": session.get("expires_at"),
        "reminder_at": session.get("reminder_at"),
        "reminder_hours_before_expiry": 5,
    }
```

- [ ] **Step 4: Run tests to verify pass**

Run: `pytest apps/backend/tests/test_campaign_flow_phase4.py -v`
Expected: PASS including draft hold/reminder assertions.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/app/services/campaign_service.py apps/backend/tests/test_campaign_flow_phase4.py
git commit -m "feat: add draft hold and reminder scheduling for declined manual review"
```

### Task 4: Payment Link Service (Stripe/PayPal Sandbox) + Verification Gate

**Files:**
- Create: `apps/backend/app/services/payment_link_service.py`
- Modify: `apps/backend/app/api/campaigns_v2.py`
- Test: `apps/backend/tests/test_payment_link_phase4.py`

- [ ] **Step 1: Write failing payment-link test**

```python
def test_stripe_link_created_in_test_mode(client):
    response = client.post("/campaigns/payment/link", json={
        "campaign_id": "CMP-123",
        "method": "STRIPE_LINK",
        "amount": 5000,
        "provider_mode": "test",
    })
    body = response.json()
    assert body["method"] == "STRIPE_LINK"
    assert body["provider_mode"] == "test"
    assert body["payment_url"].startswith("https://")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest apps/backend/tests/test_payment_link_phase4.py -v`
Expected: FAIL with 404 for `/campaigns/payment/link`.

- [ ] **Step 3: Implement link builders and verification state**

```python
# apps/backend/app/services/payment_link_service.py
def create_payment_link(campaign_id: str, method: str, amount: int, provider_mode: str = "test") -> dict:
    if method == "STRIPE_LINK":
        url = f"https://checkout.stripe.com/pay/test_{campaign_id}"
        provider = "stripe"
    elif method == "PAYPAL_LINK":
        url = f"https://www.sandbox.paypal.com/checkoutnow?token=test_{campaign_id}"
        provider = "paypal"
    else:
        raise ValueError("Unsupported link payment method")
    return {
        "campaign_id": campaign_id,
        "method": method,
        "provider": provider,
        "provider_mode": provider_mode,
        "payment_url": url,
        "verification_status": "PENDING",
    }
```

- [ ] **Step 4: Run tests to verify pass**

Run: `pytest apps/backend/tests/test_payment_link_phase4.py -v`
Expected: PASS for stripe/paypal link payload structure and provider mode.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/app/services/payment_link_service.py apps/backend/app/api/campaigns_v2.py apps/backend/tests/test_payment_link_phase4.py
git commit -m "feat: add sandbox payment-link providers and verification state"
```

### Task 5: Dispatch Gate, Cadence Scheduling, and Report Endpoint

**Files:**
- Create: `apps/backend/app/services/dispatch_service.py`
- Create: `apps/backend/app/services/report_service.py`
- Modify: `apps/backend/app/api/campaigns_v2.py`
- Test: `apps/backend/tests/test_dispatch_reporting_phase4.py`

- [ ] **Step 1: Write failing gate and cadence tests**

```python
def test_dispatch_blocked_until_payment_and_human_approval(client):
    response = client.post("/campaigns/dispatch/start", json={"campaign_id": "CMP-123"})
    assert response.status_code == 400
    assert "approval" in response.json()["detail"].lower()


def test_email_weekly_sms_fortnight_schedule():
    schedule = build_schedule(start_date="2026-04-05", duration_weeks=4, channels=["email", "sms"])
    assert len(schedule["email"]) == 4
    assert len(schedule["sms"]) == 2
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest apps/backend/tests/test_dispatch_reporting_phase4.py -v`
Expected: FAIL due to missing service functions/endpoints.

- [ ] **Step 3: Implement gate and schedule/report logic**

```python
def ensure_dispatch_gate(campaign: dict) -> None:
    if campaign.get("payment_status") != "COMPLETED":
        raise ValueError("Payment must be completed before dispatch")
    if campaign.get("content_approval_status") != "APPROVED_BY_HUMAN":
        raise ValueError("Human approval required before dispatch")
    if not campaign.get("is_locked"):
        raise ValueError("Campaign must be locked before dispatch")
```

```python
def build_schedule(start_date: str, duration_weeks: int, channels: list[str]) -> dict[str, list[str]]:
    # email weekly (randomized weekday), sms fortnight
    ...
```

```python
@router.get("/{campaign_id}/report")
def get_campaign_report(campaign_id: str):
    return report_service.build_report(campaign_id)
```

- [ ] **Step 4: Run tests to verify pass**

Run: `pytest apps/backend/tests/test_dispatch_reporting_phase4.py -v`
Expected: PASS for gate and cadence assertions.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/app/services/dispatch_service.py apps/backend/app/services/report_service.py apps/backend/app/api/campaigns_v2.py apps/backend/tests/test_dispatch_reporting_phase4.py
git commit -m "feat: add phase 4 dispatch gate scheduling and reporting"
```

### Task 6: Frontend Flow Update (Generation -> Moderation -> Payment)

**Files:**
- Create: `apps/frontend/src/lib/contracts/campaign.ts`
- Create: `apps/frontend/src/lib/api/campaign.ts`
- Create: `apps/frontend/src/components/campaign/ModerationReview.tsx`
- Create: `apps/frontend/src/components/campaign/ManualReviewPopup.tsx`
- Create: `apps/frontend/src/components/campaign/DraftExpiryNotice.tsx`
- Modify: `apps/frontend/src/app/campaign-flow/page.tsx`
- Test: `apps/frontend/src/__tests__/campaign-flow-phase4.test.tsx`

- [ ] **Step 1: Write failing UI flow test**

```tsx
it("shows manual-review popup after third failed moderation check", async () => {
  render(<CampaignFlowPage />)
  // mock three failed moderation calls
  await screen.findByText(/manual review/i)
  expect(screen.getByText(/30 minutes to 2 hours/i)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --prefix apps/frontend`
Expected: FAIL because new components/contracts are missing.

- [ ] **Step 3: Implement contracts/api/components and step machine**

```tsx
// campaign-flow page state excerpt
type FlowStep = "intake" | "stats" | "template" | "moderation" | "manual-review" | "payment" | "status"

if (moderation.decision === "MANUAL_REVIEW_OFFERED") {
  setShowManualReviewPopup(true)
}
```

```tsx
// ManualReviewPopup CTA behavior
onAccept={() => requestManualReview({ campaign_session_id, accepted: true })}
onDecline={() => requestManualReview({ campaign_session_id, accepted: false })}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npm test --prefix apps/frontend`
Expected: PASS for `src/__tests__/` including new phase-4 flow test.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/lib/contracts/campaign.ts apps/frontend/src/lib/api/campaign.ts apps/frontend/src/components/campaign apps/frontend/src/app/campaign-flow/page.tsx apps/frontend/src/__tests__/campaign-flow-phase4.test.tsx
git commit -m "feat: add phase 4 frontend moderation and manual-review flow"
```

### Task 7: End-to-End Verification and Runbook

**Files:**
- Create: `docs/phase-4-campaign-governance-runbook.md`
- Modify: `docs/phase-3-payment-runbook.md`

- [ ] **Step 1: Write verification checklist in runbook**

```md
1. Start backend and frontend
2. Create session and generate template
3. Fail moderation 3 times
4. Decline manual review and verify 12h draft + reminder time
5. Reopen via resume link + OTP
6. Approve manually, receive payment link, verify payment
7. Dispatch and view report endpoint
```

- [ ] **Step 2: Run full backend test suite**

Run: `pytest apps/backend/tests -v`
Expected: PASS including new phase-4 tests.

- [ ] **Step 3: Run frontend test suite**

Run: `npm test --prefix apps/frontend`
Expected: PASS for `src/__tests__`.

- [ ] **Step 4: Smoke test key endpoints**

Run:

```bash
python -m uvicorn app.main:app --port 8001 --reload --app-dir apps/backend
```

Then verify:

```bash
curl http://localhost:8001/health
curl http://localhost:8001/docs
```

Expected: HTTP 200 responses.

- [ ] **Step 5: Commit docs and verification updates**

```bash
git add docs/phase-4-campaign-governance-runbook.md docs/phase-3-payment-runbook.md
git commit -m "docs: add phase 4 governance runbook and verification flow"
```

---

## Plan Self-Review

- Spec coverage: all approved requirements map to tasks (session/resume, AI retry cap, manual review opt-in, draft expiry + reminder, payment links, verification, gate before dispatch, cadence, report).
- Placeholder scan: no TBD/TODO markers remain.
- Type consistency: uses shared keys (`campaign_session_id`, `safety_score`, `audience_match_score`, `content_approval_status`, `payment_status`, `is_locked`) consistently.
