# Phase 2 Design: Client Intake Web Surface (Local-First)

## 1) Purpose

Define the Phase 2 product surface that allows businesses to submit campaign requirements, receive audience-fit summaries, and view package recommendations in a client-safe web experience.

This design follows the approved direction:

- Local-first runtime (no cloud deployment required yet)
- Monorepo with split services (Next.js frontend + FastAPI backend)
- Public-safe output model (no raw contact data exposure)

## 2) Scope

### In Scope

- Responsive website pages for project explanation and intake
- Intake wizard for campaign criteria and budget
- Backend intake normalization and request registration
- Audience estimate summary response (safe aggregate data only)
- Package recommendation response (Starter/Growth/Premium)
- Local development execution model and test coverage

### Out of Scope

- Payment capture and settlement integration
- Live email/SMS dispatch execution
- External cloud deployment and production infrastructure
- Operator/admin internal dashboard

## 3) Architecture (Recommended Option)

## 3.1 Repo Shape

Use monorepo structure to keep frontend and backend coordinated while preserving separation of concerns:

- `apps/frontend/` (Next.js + TypeScript + Tailwind + shadcn/ui)
- `apps/backend/` (FastAPI + Pydantic)

## 3.2 Runtime Model (Local-First)

- Frontend dev server: `localhost:3000`
- Backend API server: `localhost:8000`
- Existing local data pipeline and SQLite-backed artifacts remain system of record for this phase

## 3.3 Integration Principle

Phase 2 backend must consume or derive only summary-level outputs needed for client decisions. It must not return raw contact rows, internal suppression internals, or sensitive matching traces.

## 4) User Experience Flow

## 4.1 Public Entry

Landing page explains:

- what the service does
- high-level process from request to campaign readiness
- channel options (Email/SMS)
- privacy and compliance positioning at summary level

## 4.2 Intake Wizard

Capture fields:

- business identity and contact
- campaign objective
- target geography and demographic preferences
- preferred channel (Email/SMS/Both)
- budget range
- campaign timeline

UX requirements:

- clear multi-step flow
- inline validation and actionable messages
- mobile-first responsiveness with desktop parity

## 4.3 Request Confirmation

After submit:

- show `request_id`
- show normalized request summary
- show next step: estimate and recommendation preview

## 4.4 Estimate and Recommendation Preview

Show only safe summaries:

- estimated reachable audience count
- channel split at aggregate level
- confidence indicator
- recommended package tier and rationale summary

No raw contact exposure is permitted.

## 5) Backend API Design

## 5.1 Endpoint Set

- `POST /intake/submit`
  - Input: validated intake payload
  - Output: `request_id`, normalized summary

- `POST /intake/estimate`
  - Input: `request_id` (or equivalent normalized payload)
  - Output: aggregate audience estimate, channel availability summary, confidence score

- `POST /intake/recommend`
  - Input: estimate context + budget
  - Output: package recommendation and high-level rationale

## 5.2 Contracts

- Backend contracts: Pydantic models
- Frontend contracts: mirrored Zod schemas
- Include `schema_version` in request/response contracts to prevent drift

## 5.3 Error Handling

- Validation errors return user-safe field messages
- Server errors return non-sensitive generic messages with correlation id
- No internal stack traces or dataset details in client responses

## 6) Security and Data Exposure Rules

- Do not expose raw contact lists through Phase 2 endpoints
- Keep matching internals and suppression mechanics private
- Log requests with minimal sensitive content
- Ensure request payloads are validated before processing

## 7) Testing Strategy

## 7.1 Backend

- Pytest contract tests for each endpoint
- Validation tests for model schema constraints
- Guard test: ensure no raw contact fields are present in client-facing response payloads

## 7.2 Frontend

- Vitest for form validation and step state behavior
- Playwright for end-to-end intake flow and summary rendering smoke test

## 7.3 Integration

- Local end-to-end happy path from wizard submit -> estimate -> recommendation
- Negative path for invalid payload handling

## 8) File-Level Blueprint

## 8.1 Frontend

- `apps/frontend/src/app/` for routed pages
- `apps/frontend/src/components/intake/` for wizard components
- `apps/frontend/src/lib/contracts/` for Zod mirrors
- `apps/frontend/src/lib/api/` for backend request clients

## 8.2 Backend

- `apps/backend/app/api/` for route handlers
- `apps/backend/app/models/` for Pydantic contracts
- `apps/backend/app/services/` for estimate/recommend logic
- `apps/backend/tests/` for API and contract tests

## 9) Phase Exit Criteria

Phase 2 is complete when:

- client can submit campaign intake through responsive UI
- system returns normalized summary and package recommendation preview
- responses are aggregate-only and client-safe
- local test suite for frontend/backend flows passes

Payment activation and send execution remain deferred to Phase 3.

## 10) Risks and Mitigations

- Contract drift between frontend and backend
  - Mitigation: versioned schema + mirrored contract tests

- Overexposure of internal data in responses
  - Mitigation: response guard tests and endpoint allowlist for fields

- Premature complexity in local phase
  - Mitigation: keep local-first architecture and defer cloud/payment execution to later phase
