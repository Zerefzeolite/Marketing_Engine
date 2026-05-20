# Phase 8 Pilot Scenarios (UAT Pack)

## Purpose

Provide a real-world validation pack for pilot readiness across Intake, Campaign Flow, Quality Gate, and core backend APIs.

## Execution Rules

- Run scenarios in order.
- Capture evidence for each scenario (screenshot, API response, log snippet, or video clip).
- Mark severity for any failure (`P0`, `P1`, `P2`, `P3`).
- `P0/P1` failures block go-live recommendation.

## Environment

- Frontend: `http://127.0.0.1:3000`
- Backend: `http://127.0.0.1:8001`
- Required env alignment:
  - `NEXT_PUBLIC_API_BASE_URL` and `NEXT_PUBLIC_API_URL` set to backend URL

---

## Scenario Matrix

### S01 - Home Navigation Clarity
- Area: Home (`/`)
- Steps:
  1. Open `/`
  2. Verify links to `/intake`, `/campaign-flow`, `/quality-gate`
- Expected:
  - All links visible and clickable
  - Route intent text is clear
- Evidence: screenshot of home cards

### S02 - Intake Required Field Validation
- Area: Intake (`/intake`)
- Steps:
  1. Leave Step 1 fields blank
  2. Click `Next`
- Expected:
  - User is not advanced to Step 2
  - Explicit required-field message shown
- Evidence: screenshot with validation message

### S03 - Intake Guidance Usability
- Area: Intake (`/intake`)
- Steps:
  1. Complete Step 1
  2. Move to Step 2
  3. Verify demographic/timeline/budget examples are visible
- Expected:
  - Guidance text present and understandable
- Evidence: screenshot of Step 2 guidance copy

### S04 - Intake Preview Recommendation Success
- Area: Intake (`/intake`)
- Steps:
  1. Fill all fields with valid values
  2. Click `Preview Recommendation`
- Expected:
  - `Request Confirmation` displayed
  - Recommendation panel populated (package/reach/rationale)
- Evidence: screenshot + request id

### S05 - CORS Preflight for Intake API
- Area: Backend API
- Steps:
  1. Send `OPTIONS /intake/submit` with frontend origin headers
- Expected:
  - Status `200`
  - `Access-Control-Allow-Origin` includes frontend origin
- Evidence: terminal output

### S06 - Intake API Chain Integrity
- Area: Backend API
- Steps:
  1. `POST /intake/submit`
  2. `POST /intake/estimate`
  3. `POST /intake/recommend`
- Expected:
  - All calls succeed
  - Recommendation package returned
- Evidence: payload/response snippets

### S07 - Campaign Flow Entry and Progression
- Area: Campaign Flow (`/campaign-flow`)
- Steps:
  1. Open route
  2. Complete intake step
  3. Continue through consent and moderation transitions
- Expected:
  - No route crash/build error
  - Step transitions follow expected order
- Evidence: screen recording or screenshots

### S08 - Manual Review Branch Handling
- Area: Campaign Flow moderation branch
- Steps:
  1. Trigger manual review branch
  2. Verify `UNDER_MANUAL_REVIEW` and `DRAFT_HELD` transitions
- Expected:
  - Correct state messaging and no dead-end UI
- Evidence: screenshots of both outcomes

### S09 - Quality Gate Rendering
- Area: Quality Gate (`/quality-gate`)
- Steps:
  1. Open route
  2. Verify six domain scorecards render
- Expected:
  - Scorecards visible with total/open-critical/closed counts
- Evidence: screenshot

### S10 - Critical Finding Closure Policy
- Area: Assessment lifecycle API
- Steps:
  1. Create `P1` finding
  2. Attempt close without retest
  3. Add PASS retest evidence
  4. Close finding
- Expected:
  - Step 2 fails (`400`)
  - Step 4 succeeds (`200`)
- Evidence: API responses

### S11 - Persistence Across Restart
- Area: Backend assessment storage
- Steps:
  1. Create finding
  2. Restart backend
  3. Re-query findings
- Expected:
  - Finding remains present after restart
- Evidence: finding id before/after restart

### S12 - Extension-Safe Frontend Check
- Area: Browser runtime
- Steps:
  1. Open core routes in incognito/extension-free session
  2. Verify no blocking hydration/runtime warning
- Expected:
  - Core routes remain usable without dev-overlay blockers
- Evidence: screenshots or clean console note

---

## Exit Criteria for Checkpoint C

- All 12 scenarios executed.
- Evidence captured for every scenario.
- No unresolved `P0/P1` defects.
- Go/No-Go recommendation documented in `docs/phase-8-uat-results.md`.
