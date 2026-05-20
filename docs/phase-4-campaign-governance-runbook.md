# Phase 4 Campaign Governance Runbook

## Purpose
This runbook validates the Phase 4 flow from campaign session creation through moderation, payment-link governance, dispatch gating, and reporting.

## Start Services
- Backend: `uvicorn app.main:app --reload --app-dir apps/backend --port 8001`
- Frontend: `npm run dev --prefix apps/frontend`

## Endpoint Smoke Checks (Run First)
Run these checks before full flow testing:

```bash
curl -i http://localhost:8001/health
curl -i http://localhost:8001/docs
```

Expected:
- `GET /health` returns `200` with `{"status":"ok"}`
- `GET /docs` returns `200` and serves the OpenAPI docs UI

## End-to-End Verification Checklist
1. Start backend and frontend services.
2. Create a campaign session via `POST /campaigns/session/start`.
3. Run `POST /campaigns/moderation/check` three times with failing scores and confirm `MANUAL_REVIEW_OFFERED` on attempt three.
4. Submit `POST /campaigns/moderation/manual-review/request` with `accepted: false` and confirm:
   - status is `DRAFT_HELD`
   - reminder window is 5 hours before draft expiry
   - expiry window is 12 hours
5. Submit `POST /campaigns/moderation/manual-review/request` with `accepted: true` and confirm status `UNDER_MANUAL_REVIEW` with a `manual_review_ticket_id`.
6. Generate payment link via `POST /campaigns/payment/link` and verify payment via `POST /payments/verify`.
7. Start distribution via `POST /campaigns/dispatch/start`.
8. Validate reporting payload via `GET /campaigns/{campaign_id}/report`.

## Spec-Parity Pending Checks (Not Yet Implemented Endpoints)

The approved Phase 4 spec includes additional flow points that are planned but not yet exposed by current backend routes. Track these checks once endpoints are implemented:

1. Generate campaign draft content via `POST /campaigns/template/generate`.
2. Reopen workflow via `POST /campaigns/session/resume` with URL + email OTP confirmation.
3. Complete manual approval decision via `POST /campaigns/moderation/manual-review/decision`.
4. Enforce sequencing: manual approval decision must complete before payment link is issued in controlled-review flow.

## Focused API Checks

### 1) Start Session
```bash
curl -X POST http://localhost:8001/campaigns/session/start \
  -H "Content-Type: application/json" \
  -d '{"client_email":"owner@example.com"}'
```
Expected: `200`, `campaign_session_id` prefixed with `SES-`, `status` equals `ACTIVE`.

### 2) Force Manual Review Offer After Three Fails
```bash
curl -X POST http://localhost:8001/campaigns/moderation/check \
  -H "Content-Type: application/json" \
  -d '{
    "campaign_session_id":"SES-REPLACE",
    "campaign_id":"CMP-123",
    "safety_score":50,
    "audience_match_score":40
  }'
```
Expected by third failed call: `200`, `decision` equals `MANUAL_REVIEW_OFFERED`, `ai_attempt_count` equals `3`.

### 3) Decline Manual Review and Confirm Hold Window
```bash
curl -X POST http://localhost:8001/campaigns/moderation/manual-review/request \
  -H "Content-Type: application/json" \
  -d '{
    "campaign_session_id":"SES-REPLACE",
    "accepted":false
  }'
```
Expected: `200`, `status` equals `DRAFT_HELD`, and `expires_at` / `reminder_at` are present.

### 4) Create Payment Link
```bash
curl -X POST http://localhost:8001/campaigns/payment/link \
  -H "Content-Type: application/json" \
  -d '{
    "campaign_id":"CMP-123",
    "method":"STRIPE_LINK",
    "amount":5000,
    "provider_mode":"test"
  }'
```
Expected: `200`, `verification_status` equals `PENDING`, and `payment_url` is returned.

### 4b) Verify Payment (Manual/Admin)
```bash
curl -X POST http://localhost:8001/payments/verify \
  -H "Content-Type: application/json" \
  -d '{
    "schema_version":"1.0",
    "payment_id":"PAY-REPLACE",
    "action":"approve",
    "admin_notes":"Approved during phase 4 runbook validation"
  }'
```
Expected: `200`, status equals `COMPLETED` and `notification_sent` is `true`.

### 5) Dispatch Gate Validation
```bash
curl -X POST http://localhost:8001/campaigns/dispatch/start \
  -H "Content-Type: application/json" \
  -d '{"campaign_id":"CMP-123"}'
```
Expected:
- If governance gates are not met: `400` with gate reason.
- If payment + human approval + lock are complete: `200` with dispatch schedule.

### 6) Reporting Check
```bash
curl http://localhost:8001/campaigns/CMP-123/report
```
Expected: report payload includes `delivery`, `interactions`, `audience_fit_observations`, `timing_performance_insights`, and `recommendations`.

## Verification Commands
- Backend: `pytest apps/backend/tests -v`
- Frontend: `npm test --prefix apps/frontend`

## Latest Verification Snapshot

Captured in `C:\marketing-engine` during Task 7 execution:

- Backend: `pytest apps/backend/tests -v` -> `51 passed`, `0 failed`.
- Frontend: `npm test --prefix apps/frontend` -> `2` files passed, `6` tests passed.
- Smoke checks are environment-dependent and require backend process running on `8001`.
- Run before release:
  - `curl -i http://localhost:8001/health`
  - `curl -i http://localhost:8001/docs`

Note: pytest currently emits a non-blocking `pytest-asyncio` deprecation warning about loop scope configuration.
