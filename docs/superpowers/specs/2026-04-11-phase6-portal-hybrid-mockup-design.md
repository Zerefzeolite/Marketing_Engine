# Phase 6 Portal Hybrid Mockup Design

**Date**: 2026-04-11  
**Status**: Drafted for user review

## Goal

Produce a high-fidelity mockup that helps stakeholders assess product direction before frontend repair is complete, using a low-clutter hybrid navigation model.

## Context

The current low-fidelity mockup is not sufficient for scope validation because it relies on unlabeled placeholder blocks. Stakeholder review requires realistic labels, visible workflow intent, and panel structures that mirror operational assessment tasks.

## Approved Direction

### Navigation Model
- Top navigation controls phase-level context: `Overview`, `Assessment`, `Findings`, `Readiness`.
- Left navigation appears within `Assessment` and controls domain-level panels:
  - UI/UX
  - Compliance and Security
  - Backend Functionality
  - Client and Contact Simulation
  - Efficiency and Workflow
  - Website and Portal

### Rationale
- Top navigation keeps major workflows legible and uncluttered.
- Left navigation supports rapid side-by-side domain assessment without changing global context.
- The hybrid structure balances executive readability and operator depth.

## Visual System

- Style: light enterprise interface with high contrast and restrained accent usage.
- Density: summary-first with progressive disclosure; avoid overloaded tables in default state.
- Hierarchy: strong distinction between page heading, panel heading, key metrics, and evidence/actions.
- Status language: consistent badge system for `PASS`, `IN PROGRESS`, `FAIL`, plus domain health dots in the left menu.

## Panel Structure

Each domain panel follows one template to keep review predictable:

1. **Panel Header**
   - Domain title
   - Owner
   - Last updated
   - Readiness score
2. **Checks Summary**
   - 4-6 named checks with explicit status labels
3. **Evidence Section**
   - Artifacts list (logs, screenshots, API payloads)
4. **Findings Snapshot**
   - Critical and non-critical counts
5. **Action Strip**
   - `Create finding`
   - `Record retest`
   - `Request review`

## Mockup Deliverable

Create one high-fidelity HTML mockup artifact at:

- `docs/mockups/phase6-portal-hybrid-reviewed.html`

The artifact must include clear, labeled states for:

1. `Overview` (executive summary view)
2. `Assessment > Compliance and Security` (detailed domain example)
3. `Findings` (critical queue snapshot)
4. `Readiness` (go/no-go summary)

## Interaction and Review Expectations

- The mockup is for visual and workflow direction review, not production interactivity.
- Panel switching can be represented as structured states in a single file.
- Stakeholder should be able to answer:
  - Is navigation understandable at first glance?
  - Is the content density appropriate?
  - Are audit and remediation actions obvious?
  - Is this presentation suitable for internal and client-facing review?

## Constraints

- Keep the interface uncluttered while preserving operational depth.
- Use realistic labels and sample values to communicate intent.
- Avoid adding implementation-only concerns (routing mechanics, backend fetch logic) into the visual spec.

## Success Criteria

- Stakeholder can identify preferred direction without guessing element meaning.
- The hybrid menu model clearly supports both executive and operational workflows.
- The mockup can be used as a practical reference for subsequent frontend implementation.
