# Phase 7 Reliability Hardening Task Board Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Execute Phase 7 reliability hardening with explicit ownership, ETA, and acceptance gates for contact safety, portal first-load resilience, and governance continuity.

**Architecture:** Work is split into three streams mapped to the approved scope: backend contact-safety controls, frontend first-load resilience, and operational governance/reporting. Each stream has a clear owner, daily progression steps, and hard pass/fail gates tied to tests and evidence.

**Tech Stack:** FastAPI/Python/pytest (backend), Next.js/TypeScript/Vitest (frontend), assessment API workflow, markdown governance artifacts.

---

## File Structure

- Create: `docs/superpowers/plans/2026-04-13-phase7-reliability-task-board.md` (this file)
- Read during execution:
  - `docs/superpowers/specs/2026-04-13-phase7-reliability-hardening-scope.md`
  - `apps/backend/tests/test_analytics_phase5.py`
  - `apps/frontend/src/__tests__/quality-gate-phase6.test.tsx`

---

## Task Board Summary

| Stream | Owner | ETA | Dependency | Deliverable |
|---|---|---|---|---|
| Contact Safety + Dedup | Backend Engineer | 1 day | Phase 6 closed critical queue | Suppression logic + backend regression tests |
| Portal First-Load Resilience | Frontend Engineer | 1 day | Stable `/assessment/findings` API | Timeout/retry + frontend regression tests |
| Governance Continuity | Ops Lead + QA | 1 day | Both streams merged to test env | Daily triage template + weekly owner rollup |

---

### Task 1: Contact Safety and Deduplication Execution

**Owner:** Backend Engineer  
**ETA:** 1 day  
**Primary Acceptance Gate:** No duplicate outbound touch after contact opt-out for same campaign.

**Files:**
- Modify: `apps/backend/app/services/analytics_service.py`
- Test: `apps/backend/tests/test_analytics_phase5.py`

- [ ] **Step 1: Keep failing regression in place and validate red/green history**

Run:
`$env:PYTHONPATH="apps/backend"; python -m pytest apps/backend/tests/test_analytics_phase5.py -k "suppressed_after_contact_opt_out" -v`

Expected: PASS after fix; if fail, task remains open.

- [ ] **Step 2: Validate full analytics regression suite**

Run:
`$env:PYTHONPATH="apps/backend"; python -m pytest apps/backend/tests/test_analytics_phase5.py -v`

Expected: PASS with no regression in consent and interaction metrics behavior.

- [ ] **Step 3: Capture acceptance evidence**

Record in daily log:
- test command
- pass count
- commit SHA implementing/confirming suppression behavior

- [ ] **Step 4: Mark stream complete**

Completion criteria:
- duplicate-touch suppression test passing
- full analytics suite passing
- evidence logged

---

### Task 2: Portal First-Load Resilience Execution

**Owner:** Frontend Engineer  
**ETA:** 1 day  
**Primary Acceptance Gate:** First-load abort/timeout path retries once and does not silently fail.

**Files:**
- Modify: `apps/frontend/src/lib/api/assessment.ts`
- Test: `apps/frontend/src/__tests__/quality-gate-phase6.test.tsx`

- [ ] **Step 1: Validate retry regression test**

Run:
`npm --prefix apps/frontend exec vitest run src/__tests__/quality-gate-phase6.test.tsx -t "retries getFindings once when first request aborts"`

Expected: PASS.

- [ ] **Step 2: Validate full quality-gate frontend suite**

Run:
`npm --prefix apps/frontend exec vitest run src/__tests__/quality-gate-phase6.test.tsx`

Expected: PASS with all tests green.

- [ ] **Step 3: Manual smoke on review route**

Run app and verify:
- `http://127.0.0.1:3000/quality-gate` loads
- no blocking runtime error on first open (use extension-free session if needed)

- [ ] **Step 4: Mark stream complete**

Completion criteria:
- retry regression passing
- full frontend suite passing
- manual smoke confirmed

---

### Task 3: Governance Continuity and Operating Cadence

**Owner:** Ops Lead + QA  
**ETA:** 1 day (then recurring cadence)  
**Primary Acceptance Gate:** Daily and weekly process artifacts are produced and actionable.

**Files:**
- Create/Update operational notes in existing governance docs workspace

- [ ] **Step 1: Daily critical queue checklist**

Checklist:
- list all open `P0/P1` findings
- validate retest evidence status
- assign owner and due date

- [ ] **Step 2: Weekly owner rollup snapshot**

Required output fields:
- owner
- total findings
- open critical count
- closed count (week)

- [ ] **Step 3: Closure policy enforcement**

Rule:
- no `P0/P1` finding closed without PASS retest evidence attached

- [ ] **Step 4: Mark stream complete**

Completion criteria:
- daily checklist template in use
- first weekly rollup generated
- closure policy enforced in triage review

---

## Acceptance Gates (Program Level)

1. **Engineering Gate**
   - Backend and frontend regression suites pass for Phase 7 reliability scope.
2. **Operational Gate**
   - Zero unresolved `P0/P1` findings for duplicate-touch and first-load timeout classes.
3. **Evidence Gate**
   - Each closure has explicit retest evidence and timestamped owner acknowledgment.

---

## Delivery Sequence (Recommended)

1. Complete Task 1 (backend reliability)
2. Complete Task 2 (frontend resilience)
3. Execute Task 3 (governance cadence)
4. Run final cross-check:
   - backend tests
   - frontend tests
   - open critical queue = 0 for scoped classes

---

## Risk Watchlist

- Extension-induced hydration mismatch can create false-positive frontend instability during review.
- Non-local/network-mounted workspace can reintroduce npm tar write errors; use local path execution for reliability testing.
- Governance drift risk if owner rollup cadence is not enforced weekly.

---

## Final Verification Commands

- Backend:
  - `$env:PYTHONPATH="apps/backend"; python -m pytest apps/backend/tests/test_analytics_phase5.py -v`
- Frontend:
  - `npm --prefix apps/frontend exec vitest run src/__tests__/quality-gate-phase6.test.tsx`
