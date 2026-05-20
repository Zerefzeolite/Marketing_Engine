# Phase 8 Pilot Kickoff Run Sheet

Date: 2026-04-14
Owner: Product + Engineering + QA

## Important Clarification (UI/UX)

Current portal UI is **pilot-functional**, not final production-polished visual design.

- Pilot objective: validate reliability, flows, and operational readiness.
- Production UI objective: deliver refined visual system, component consistency, and polished interaction quality.

### UI/UX Productionization Timeline

- **Week 1 (Phase 9A):** design system pass (typography, spacing, form hierarchy, nav shell consistency)
- **Week 2 (Phase 9B):** full portal polish across Home, Intake, Campaign Flow, Quality Gate
- **Week 3 (Phase 9C):** accessibility + responsive + final visual QA

First visibly improved build target: **within 5 business days**.

## Day 0 (Pilot Start)

### Pre-Flight (Owner: Engineering)

1. Verify backend health endpoint responds (`/health` -> 200).
2. Verify frontend routes respond (`/`, `/intake`, `/campaign-flow`, `/quality-gate`).
3. Verify intake recommendation chain works (`submit -> estimate -> recommend`).
4. Verify assessment closure policy still enforced (`P1` close without retest fails).

### Environment Rule (Owner: Ops)

- Use extension-free/incognito browser profile for formal evidence capture.

### Go-Live Switch (Owner: Product)

- Confirm pilot cohort list and support channel.
- Start pilot window and begin issue logging cadence.

## Day 1 (Stability Review)

### Operational Review (Owner: QA + Ops)

1. Check open critical queue (`P0/P1`) and owner assignment.
2. Capture owner rollup (total/open-critical/closed).
3. Confirm no blocked core flows in Intake/Campaign/Quality Gate.

### Engineering Follow-Up (Owner: Engineering)

1. Fix any pilot-blocking UX confusion with targeted changes.
2. Preserve test green state for reliability suites.

## Day 3 (Pilot Gate Review)

### Decision Inputs (Owner: Product + Eng Lead)

1. Defect severity trend (`P0/P1` count, open duration).
2. User completion rates for intake and campaign flow.
3. Operational burden in quality gate triage.

### Decision

- Continue pilot if no unresolved `P0/P1` and no core-flow regression.
- Pause/rollback if `P0/P1` unresolved beyond agreed response SLA.

## Rollback Triggers

Trigger rollback if any of the following occurs:

1. Intake preview flow unavailable for multiple consecutive attempts.
2. Campaign flow route fails to compile/render.
3. Critical closure policy bypass is observed.

## Pilot Communication Cadence

- Daily: critical queue + owner rollup update
- Every 72 hours: stability checkpoint summary
- Weekly: pilot health report and UI/UX productionization progress
