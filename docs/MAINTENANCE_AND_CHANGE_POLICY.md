# Maintenance and Change Policy

## Purpose
Maintain code integrity, prevent service breakdowns, and avoid destructive overwrites during ongoing development.

## Core Rules
- Private-first documentation: update private vault first, then publish sanitized public updates.
- Spec -> plan -> implementation: no direct large-scope edits without scoped design and task plan.
- Incremental delivery only: small bounded changes, not broad rewrites.
- Test-gated updates: targeted tests plus regression suite must pass before considering work complete.
- Contract-first integrations: backend and frontend must use explicit versioned contracts.
- No raw data exposure in client surfaces.
- Keep auditability for critical data operations.

## Safe Update Workflow
1. Define change scope and impact.
2. Update spec/plan documents.
3. Implement smallest viable task.
4. Run focused tests.
5. Run full regression tests.
6. Review for spec compliance and code quality.
7. Update changelog and vault sync checklist.

## Maintenance Cadence
- Per change: run local tests and review data exposure guardrails.
- Weekly: review dependency updates and failing warnings.
- Monthly: review architecture boundaries and technical debt list.

## Overwrite and Breakage Prevention
- Do not replace working modules wholesale when incremental edits are possible.
- Preserve stable interfaces unless versioned changes are intentional.
- Add migration paths before schema/contract changes.
- Block release when critical tests fail.
