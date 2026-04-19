# Phase 8 Real-World Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prepare the product for near-term real-world pilot testing with clear UX, stable pre-prod environment, operational monitoring, and formal go/no-go gates.

**Architecture:** Execute in five ordered streams: portal UX readiness, pre-prod hardening, safety/observability, pilot scenario testing, and post-pilot polish. Each stream has explicit owners, target dates, and measurable acceptance criteria.

**Tech Stack:** Next.js frontend, FastAPI backend, Vitest/Pytest, assessment APIs, deployment environment config, operational runbooks.

---

## Timeline and Owners

| Stream | Owner | Start | Target Complete | Dependency |
|---|---|---|---|---|
| 1. Portal UX Readiness | Product + Frontend Lead | 2026-04-15 | 2026-04-19 | Current `phase6-pr` |
| 2. Pre-Prod Environment Hardening | Backend Lead + DevOps | 2026-04-17 | 2026-04-22 | Stream 1 baseline |
| 3. Safety and Monitoring | Backend Lead + Ops | 2026-04-20 | 2026-04-24 | Streams 1-2 |
| 4. Pilot Scenario Pack + UAT | QA Lead + Product | 2026-04-23 | 2026-04-29 | Streams 1-3 |
| 5. Post-Pilot Polish | Product + Design + Eng | 2026-04-30 | 2026-05-06 | Pilot findings |

---

### Task 1: Portal UX Readiness (Highest Priority)

**Files (expected focus):**
- Modify: `apps/frontend/src/app/page.tsx`
- Modify: `apps/frontend/src/app/intake/page.tsx`
- Modify: `apps/frontend/src/app/campaign-flow/page.tsx`
- Modify: `apps/frontend/src/app/quality-gate/page.tsx`
- Modify: `apps/frontend/src/components/intake/IntakeForm.tsx`

- [ ] **Step 1: Home route navigation clarity pass**
Run: `npm --prefix apps/frontend exec vitest run src/__tests__/home-navigation-phase7.test.ts`
Expected: Pass; links for Intake, Campaign Flow, Quality Gate visible and accurate.

- [ ] **Step 2: Intake guidance and validation clarity pass**
Run: `npm --prefix apps/frontend exec vitest run src/__tests__/intake-form.test.tsx src/__tests__/experience-routing-phase7.test.ts`
Expected: Pass; users receive specific missing-field guidance and route intent is clear.

- [ ] **Step 3: Campaign flow usability pass**
Run: `npm --prefix apps/frontend exec vitest run src/__tests__/campaign-flow-phase4.test.tsx`
Expected: Pass; no flow regression in moderation/manual review path.

- [ ] **Step 4: Responsive/manual portal checks**
Manual check:
- `/` navigation on desktop + mobile
- `/intake` full submission flow
- `/campaign-flow` flow entry and transition
- `/quality-gate` readability and state cues

**Acceptance Criteria:**
- No ambiguous route purpose between Intake and Campaign Flow
- No blocking UX confusion in core user path
- Core routes usable on desktop and mobile

---

### Task 2: Pre-Prod Environment Hardening

**Files (expected focus):**
- Modify: `apps/backend/app/main.py` (env-driven CORS)
- Modify: deployment/env docs (`docs/*runbook*.md` as needed)

- [ ] **Step 1: Environment variable contract**
Define and document required env vars for frontend/backend in runbook.

- [ ] **Step 2: CORS + API base URL alignment**
Verify frontend origin is allowlisted and API base URL is correct in pre-prod.

- [ ] **Step 3: Persistent data baseline**
Confirm pre-prod data storage survives restart and supports pilot session continuity.

- [ ] **Step 4: Deployment reproducibility check**
Run one full deploy/restart cycle and confirm all core routes + APIs return expected responses.

**Acceptance Criteria:**
- Repeatable deploy with no manual patching
- Frontend can call intake and assessment APIs from browser
- Data survives service restarts in pre-prod

---

### Task 3: Safety and Monitoring

**Files (expected focus):**
- Modify/add: operational docs and logging config files used by deployment
- Modify: `docs/phase-7-governance-log.md` cadence entries

- [ ] **Step 1: Structured logging baseline**
Ensure request IDs and key error context are emitted for intake/assessment critical paths.

- [ ] **Step 2: Alert thresholds**
Set alerting for:
- elevated 5xx rates
- intake preview failures
- quality-gate fetch timeout spikes

- [ ] **Step 3: Incident playbook update**
Document first-response procedure for top failure classes and rollback trigger.

**Acceptance Criteria:**
- Team can detect and triage critical failures quickly
- Known failure classes have documented response path

---

### Task 4: Pilot Scenario Pack + UAT

**Files (expected focus):**
- Create/modify: `docs/phase-8-pilot-scenarios.md` (new)
- Update: `docs/phase-7-governance-log.md`

- [ ] **Step 1: Build scenario matrix (10-15)**
Include happy path, validation edge cases, network interruptions, consent/opt-out, moderation outcomes.

- [ ] **Step 2: Add pass/fail criteria per scenario**
Each scenario must define exact expected outcome and evidence required.

- [ ] **Step 3: Execute UAT cycle**
Run all scenarios and log results, defects, severity, owner.

- [ ] **Step 4: Gate decision prep**
Summarize open P0/P1 items, mitigations, and go/no-go recommendation.

**Acceptance Criteria:**
- Complete scenario execution evidence
- Zero unresolved P0/P1 for pilot scope
- Formal readiness recommendation produced

---

### Task 5: Post-Pilot Polish (Medium Priority)

**Files (expected focus):**
- Frontend visual/styling components and route-level presentation files

- [ ] **Step 1: Apply highest-impact UX polish from pilot feedback**
- [ ] **Step 2: Keep functional regressions at zero (re-run core test suites)**
- [ ] **Step 3: Update docs with finalized UX behavior and known constraints**

**Acceptance Criteria:**
- Visual clarity improved without breaking core workflows
- Pilot critical defects remain closed

---

## Portal-Specific Acceptance Gates

### Home (`/`)
- Must clearly direct users to Intake, Campaign Flow, and Quality Gate.

### Intake (`/intake`)
- Must provide field guidance and explicit validation messages.
- Preview recommendation must return request confirmation + recommendation payload.

### Campaign Flow (`/campaign-flow`)
- Must remain stable through consent -> moderation -> payment progression.

### Quality Gate (`/quality-gate`)
- Must render domain scorecards and critical/open state accurately.

---

## Checkpoints for Approval

- **Checkpoint A (UX):** Portal UX readiness approved.
- **Checkpoint B (Env):** Pre-prod hardening approved.
- **Checkpoint C (UAT):** Pilot scenario pack execution approved.
- **Checkpoint D (Launch):** Go/no-go decision approved.

---

## Final Verification Commands

- Backend:
  - `$env:PYTHONPATH="apps/backend"; python -m pytest apps/backend/tests/test_analytics_phase5.py -q`
  - `$env:PYTHONPATH="apps/backend"; python -m pytest apps/backend/tests/test_intake_cors_phase7.py -q`
- Frontend:
  - `npm --prefix apps/frontend exec vitest run src/__tests__/intake-form.test.tsx src/__tests__/experience-routing-phase7.test.ts src/__tests__/home-navigation-phase7.test.ts src/__tests__/campaign-flow-phase4.test.tsx src/__tests__/quality-gate-phase6.test.tsx`
