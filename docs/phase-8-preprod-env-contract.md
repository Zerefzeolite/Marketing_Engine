# Phase 8 Pre-Prod Environment Contract

## Purpose

Define the minimum environment contract required for stable real-world pilot testing in pre-production.

## Frontend Environment Variables

Set both values to the same backend base URL in pre-prod:

- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_API_URL`

Recommended value format:

- `https://<your-backend-host>`

Reason:

- Intake and assessment APIs use `NEXT_PUBLIC_API_BASE_URL` in some paths.
- Campaign/payment/analytics APIs use `NEXT_PUBLIC_API_URL` in some paths.
- Setting both removes route-to-route environment mismatch risk.

## Backend Environment / Runtime Requirements

- Backend must be reachable from frontend origin(s).
- CORS must allow frontend origins used for testing:
  - `http://127.0.0.1:3000`
  - `http://localhost:3000`
- Assessment storage location must persist across process restart.

## Deployment Verification Sequence

1. Start backend and verify health:
   - `GET /health` returns `200`.
2. Validate CORS preflight for intake:
   - `OPTIONS /intake/submit` returns `200` with allow-origin header.
3. Validate intake chain:
   - `POST /intake/submit` -> success
   - `POST /intake/estimate` -> success
   - `POST /intake/recommend` -> success
4. Validate persistence:
   - create one assessment finding
   - restart backend
   - finding still present on `GET /assessment/findings`

## Pass Criteria

- Frontend can reach all required API routes from browser.
- CORS preflight passes for intake endpoint.
- Assessment data survives backend restart.
- Environment values are documented and repeatable for redeploy.
