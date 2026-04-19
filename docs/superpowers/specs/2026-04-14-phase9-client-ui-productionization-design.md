# Phase 9 Client UI Productionization Design

Date: 2026-04-14
Status: Drafted for review

## Goal

Upgrade the client-facing interface from pilot-functional presentation to production-grade UX without destabilizing validated business flows.

## Approved Strategy

Approach selected: **A - Foundation-first polish**

- Build shared visual foundation first (tokens + reusable primitives).
- Apply consistently across client-facing routes.
- Preserve existing functional behavior and reliability guardrails.

## Scope

### In Scope (Priority)

- `Home` route (`/`)
- `Campaign Intake` route (`/intake`)
- `Campaign Flow` route (`/campaign-flow`)

### Limited Scope

- `Quality Gate` route (`/quality-gate`) receives only minor consistency adjustments if required.

### Out of Scope

- Backend feature expansion
- Navigation architecture overhaul
- Heavy animation framework rollout

## Success Criteria

1. Visual consistency across all client-facing routes (typography, spacing, controls, cards).
2. Clear information hierarchy and form guidance in intake and campaign flow.
3. Responsive behavior on desktop and mobile.
4. No functional regression in existing route behaviors and test suites.

## UI Architecture

## Foundation Layer

Introduce a compact token system for:

- Color roles (surface, text, border, action, state)
- Typography scale
- Spacing scale
- Radius and elevation

Token implementation should use shared CSS variables with minimal coupling to route logic.

## Shared Primitives

Create and reuse route-level UI building blocks:

- `RouteHeader`
- `SectionCard`
- `FieldHint`
- `FieldError`
- `PrimaryButton`
- `SecondaryButton`

Each primitive should have one clear responsibility and be reusable across the three target routes.

## Route Implementation Order

1. `/` Home shell and route cards refinement
2. `/intake` form and recommendation presentation refinement
3. `/campaign-flow` step-state and branch readability refinement

## Accessibility and Usability Baseline

- Maintain explicit label-to-input associations
- Ensure readable contrast for text and actionable elements
- Preserve keyboard navigation for all key interactions
- Improve spacing/readability for high-scan form sections

## Testing and Verification

## Regression Guardrail

Retain and run current suites:

- intake validation and guidance tests
- campaign flow transition tests
- route navigation/intent tests

## Additional Checks

- Add focused UI structure tests where practical (header/CTA/guidance visibility)
- Avoid brittle pixel snapshots in this phase

## Manual Verification

For each route, verify:

- desktop readability and flow completion
- mobile readability and control usability
- no blocked action paths

## Rollout Plan

1. Introduce tokens and shared primitives
2. Apply to Home + Intake
3. Apply to Campaign Flow
4. Complete responsive/accessibility pass

## Risk Controls

- Keep flow logic untouched while applying visual refactor
- Validate route behavior after each stage
- If instability is introduced, roll back styling scope for affected stage only

## Completion Gate

Phase 9 is complete when all conditions are true:

1. Client-facing routes are production-presentable and visually coherent
2. Existing core tests pass
3. Manual desktop/mobile verification passes
4. No reliability regressions are introduced
