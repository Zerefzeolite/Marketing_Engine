# Phase 2 Intake Runbook

## Start Services
- Backend: `uvicorn app.main:app --reload --app-dir apps/backend`
- Frontend: `npm --prefix apps/frontend run dev`

## Verify Flow
1. Open `http://localhost:3000/intake`.
2. Complete Step 1 and Step 2 inputs.
3. Click `Preview Recommendation`.
4. Confirm request confirmation appears with request id.
5. Confirm preview shows estimated reachable, package, channel split, rationale, and confidence.

## Test Commands
- Backend tests: `pytest apps/backend/tests -v`
- Frontend tests: `npm --prefix apps/frontend test`
- E2E (when Playwright is installed): `npx playwright test apps/frontend/e2e/intake-flow.spec.ts`

## Safety Checks
- Confirm client responses contain no raw contact rows.
- Confirm estimate and recommend payloads are schema-versioned.
- Confirm errors are user-safe and do not expose internals.

## Known Environment Issue
- Some environments may fail frontend dependency installation due filesystem/cache corruption.
- If this occurs, clear npm cache and reinstall in `apps/frontend` before running frontend tests.
