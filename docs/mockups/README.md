# Mockup Review Guide

## Open the artifact
- File: `docs/mockups/phase6-portal-hybrid-reviewed.html`
- Open directly in a browser (double-click or drag into browser window)

## What to evaluate
- Navigation clarity between top-level phase tabs and left domain menu
  - Pass: All four phase tabs (`Overview`, `Assessment`, `Findings`, `Readiness`) are visible on initial load, active tab state is obvious, and all six left-menu domain labels remain readable without overlap or truncation.
  - Fail: Missing phase tabs, ambiguous active state, or any left-menu domain label overlap/truncation that blocks quick navigation.
- Content density in `Assessment > Compliance and Security`
  - Pass: At least one full viewport section can be reviewed without horizontal scrolling, with headings, body text, and key status badges readable at 100% zoom.
  - Fail: Horizontal scrolling is required for core content, or text/badges are too dense to scan at 100% zoom.
- Visibility of findings workflow actions: `Create finding`, `Record retest`, `Request review`
  - Pass: All three actions are visible in the findings workflow area, visually distinct as actionable controls, and readable without zoom changes.
  - Fail: Any action is missing, visually blends into non-action text, or requires zoom changes to confirm its purpose.
- Readiness decision clarity in the `Readiness` section
  - Pass: Current readiness state and next decision step are both explicit in section copy or status UI, with no conflicting labels.
  - Fail: Readiness state is implied rather than explicit, next step is unclear, or labels conflict.

## Reviewer outcome capture
- In your terminal reply, record one line per evaluation item using this format:
  - `Navigation clarity: PASS|FAIL - <evidence>`
  - `Content density: PASS|FAIL - <evidence>`
  - `Workflow actions visibility: PASS|FAIL - <evidence>`
  - `Readiness decision clarity: PASS|FAIL - <evidence>`
- Then add:
  - `Overall outcome: PASS|FAIL`
  - `Blocking issues: <none|issue list>`
  - `Follow-up required: <yes|no> - <owner/next step if yes>`

## Validate artifact labels
- Run: `python -m pytest docs/mockups/tests/test_phase6_portal_hybrid_mockup.py -v`
- Expected result: pytest exits with code `0` and all tests in this module pass (currently `2 passed`).
- If it fails: copy the failing assertion and test name into your terminal reply, mark `Overall outcome: FAIL`, and do not approve the mockup until the failure is resolved and rerun passes.
