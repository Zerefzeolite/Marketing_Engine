# Phase 6 System Assessment Runbook

## Purpose
Operate the six-domain Phase 6 assessment workflow and enforce critical-remediation closure rules for P0/P1 findings before release.

## Start Services
- Backend API: `uvicorn app.main:app --reload --app-dir apps/backend --port 8001`
- Frontend portal: `npm --prefix apps/frontend run dev`

## Core Workflow Endpoints
1. Create finding: `POST /assessment/findings`
2. List findings: `GET /assessment/findings`
3. Record retest evidence: `POST /assessment/findings/{finding_id}/retest`
4. Close finding: `POST /assessment/findings/{finding_id}/close`
5. Review quality-gate UI: `GET /quality-gate` (frontend route)

## Backend Verification Commands
- `$env:PYTHONPATH="apps/backend"; python -m pytest apps/backend/tests/test_phase6_assessment_service.py -v`
- `$env:PYTHONPATH="apps/backend"; python -m pytest apps/backend/tests/test_phase6_assessment_api.py -v`

## Frontend Verification Command
- Preferred (direct Vitest invocation): `npm --prefix apps/frontend exec vitest run src/__tests__/quality-gate-phase6.test.tsx`
- If using the plan command and Vitest is not found on PATH, use the working equivalent above.
- Plan command reference: `npm --prefix apps/frontend test -- quality-gate-phase6.test.tsx`

## Exit Gate Conditions
- No open `P0` or `P1` findings remain.
- Every closed `P0`/`P1` finding has at least one PASS retest with evidence.
- Domain scorecards are reviewed in `/quality-gate` and closure evidence is recorded.
