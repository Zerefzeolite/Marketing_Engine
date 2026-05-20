# Phase 8 Readiness Checkpoints

## Checkpoint A - Portal UX Readiness

Status: ✅ Completed (2026-04-14)

### Automated Verification

- Frontend UX suite command:
  - `npm --prefix apps/frontend exec vitest run src/__tests__/intake-form.test.tsx src/__tests__/experience-routing-phase7.test.ts src/__tests__/home-navigation-phase7.test.ts src/__tests__/campaign-flow-phase4.test.tsx src/__tests__/quality-gate-phase6.test.tsx`
- Result:
  - `5 test files passed`
  - `19 tests passed`

### Route Smoke Verification

- Verified route responses:
  - `/` -> `200`
  - `/intake` -> `200`
  - `/campaign-flow` -> `200`
  - `/quality-gate` -> `200`
- Verified route intent markers:
  - Home has links to Intake, Campaign Flow, Quality Gate
  - Intake shows `Quick Estimate Only`
  - Campaign Flow shows `Full Campaign Flow`
  - Quality Gate shows `Phase 6 Quality Gate`

### Notes

- UX readiness gate satisfied for Phase 8 Task 1.
- Next checkpoint: **B - Pre-Prod Environment Hardening**.

## Checkpoint B - Pre-Prod Environment Hardening

Status: ✅ Completed (2026-04-14)

### Environment Contract

- Contract documented in:
  - `docs/phase-8-preprod-env-contract.md`
- Frontend env alignment requirement:
  - `NEXT_PUBLIC_API_BASE_URL` and `NEXT_PUBLIC_API_URL` both set to backend base URL.

### Runtime Verification Evidence

- CORS preflight check:
  - `OPTIONS /intake/submit` -> `200`
  - `Access-Control-Allow-Origin` includes `http://127.0.0.1:3000`
- Persistence check across restart:
  - created assessment finding: `FDG-117EEDAA`
  - backend restarted
  - finding still present on `GET /assessment/findings` (`PERSISTED=True`)

### Notes

- Pre-prod hardening gate satisfied for API alignment, CORS, and persistence baseline.
- Next checkpoint: **C - Pilot Scenario Pack + UAT**.

## Checkpoint C - Pilot Scenario Pack + UAT

Status: ✅ Completed (2026-04-14)

### Artifacts Created

- Scenario pack:
  - `docs/phase-8-pilot-scenarios.md`
- UAT results tracker:
  - `docs/phase-8-uat-results.md`

### Scope

- 12 UAT scenarios covering:
  - Home navigation
  - Intake validation and preview
  - Campaign flow progression
  - Quality gate rendering
  - Intake CORS and API chain
  - Critical finding closure policy
  - Persistence and extension-safe runtime checks

### Execution Progress

- Executed scenarios: 12
- Passed: 12
- Failed: 0
- Blocked: 0
- Current recommendation: **GO (Pilot Ready)**

### Notes

- S04 manual intake preview evidence captured (request confirmation + recommendation payload).
- S12 extension-safe verification captured: incognito profile clean; regular-profile hydration warning is extension-induced.
- Next checkpoint: **D - Launch Go/No-Go Confirmation**.

## Checkpoint D - Launch Go/No-Go Confirmation

Status: ✅ Completed (2026-04-14)

### Final Decision

- **GO - Ready for real-world pilot testing**

### Evidence Reference

- `docs/phase-8-uat-results.md`
- `docs/phase-8-launch-decision.md`

### Operational Constraints

- Formal pilot evidence capture should use extension-free/incognito browser profile to avoid non-product hydration noise.
