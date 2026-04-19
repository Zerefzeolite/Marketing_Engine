# Phase 6 Portal Hybrid Mockup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a high-fidelity, labeled HTML mockup for Phase 6 portal review using a hybrid navigation model that stakeholders can open directly in a browser.

**Architecture:** Create one standalone HTML artifact with structured sections for `Overview`, `Assessment > Compliance and Security`, `Findings`, and `Readiness`, all visible in a clear review flow. Add a lightweight pytest-based artifact validator that checks required labels and sections are present so the mockup does not regress into blank placeholders.

**Tech Stack:** HTML/CSS (standalone artifact), Python/pytest (artifact content validation), markdown docs.

---

## File Structure

### New Files
- `docs/mockups/phase6-portal-hybrid-reviewed.html` - Main high-fidelity review artifact with hybrid nav and labeled panel states
- `docs/mockups/tests/test_phase6_portal_hybrid_mockup.py` - Regression test to verify required sections and labels exist in artifact

### Modified Files
- `docs/mockups/README.md` - Short instructions for opening the mockup and running the validator test

---

### Task 1: Create Artifact Validator Test First

**Files:**
- Create: `docs/mockups/tests/test_phase6_portal_hybrid_mockup.py`
- Test: `docs/mockups/tests/test_phase6_portal_hybrid_mockup.py`

- [ ] **Step 1: Write the failing test**

```python
from pathlib import Path


MOCKUP_PATH = Path("docs/mockups/phase6-portal-hybrid-reviewed.html")


def test_mockup_file_exists() -> None:
    assert MOCKUP_PATH.exists(), "Mockup artifact file is missing"


def test_mockup_contains_required_phase_sections() -> None:
    html = MOCKUP_PATH.read_text(encoding="utf-8")
    required_tokens = [
        "Overview",
        "Assessment",
        "Findings",
        "Readiness",
        "Compliance and Security",
        "Create finding",
        "Record retest",
        "Request review",
    ]
    for token in required_tokens:
        assert token in html, f"Missing required token: {token}"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest docs/mockups/tests/test_phase6_portal_hybrid_mockup.py -v`
Expected: FAIL because `docs/mockups/phase6-portal-hybrid-reviewed.html` does not exist yet.

- [ ] **Step 3: Commit the failing test scaffold**

```bash
git add docs/mockups/tests/test_phase6_portal_hybrid_mockup.py
git commit -m "test(mockup): add phase6 portal artifact validator"
```

### Task 2: Build High-Fidelity Hybrid Mockup Artifact

**Files:**
- Create: `docs/mockups/phase6-portal-hybrid-reviewed.html`
- Test: `docs/mockups/tests/test_phase6_portal_hybrid_mockup.py`

- [ ] **Step 1: Write minimal artifact shell that should still fail some checks**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Phase 6 Portal Hybrid Mockup</title>
</head>
<body>
  <h1>Phase 6 Portal Hybrid Mockup</h1>
  <nav>Overview | Assessment | Findings | Readiness</nav>
</body>
</html>
```

- [ ] **Step 2: Run test to verify partial artifact still fails**

Run: `python -m pytest docs/mockups/tests/test_phase6_portal_hybrid_mockup.py -v`
Expected: FAIL with missing tokens such as `Compliance and Security` and action labels.

- [ ] **Step 3: Implement complete high-fidelity labeled artifact**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Phase 6 Portal Hybrid Mockup</title>
  <style>
    body { margin: 0; font-family: "Segoe UI", sans-serif; background: #f4f6f8; color: #112330; }
    .top-nav { display: flex; gap: 12px; padding: 12px 20px; border-bottom: 1px solid #d8e1e8; background: #fff; position: sticky; top: 0; }
    .layout { display: grid; grid-template-columns: 250px 1fr; min-height: calc(100vh - 52px); }
    .side { background: #f9fbfc; border-right: 1px solid #d8e1e8; padding: 14px; }
    .side h3 { margin: 0 0 10px; font-size: 14px; text-transform: uppercase; color: #5d7280; }
    .side ul { margin: 0; padding: 0; list-style: none; }
    .side li { padding: 8px 10px; border-radius: 8px; margin-bottom: 6px; }
    .side li.active { background: #e8f4f5; border: 1px solid #c7e3e5; }
    .main { padding: 18px; }
    .state { background: #fff; border: 1px solid #d8e1e8; border-radius: 12px; padding: 14px; margin-bottom: 12px; }
    .state h2 { margin-top: 0; }
    .checks, .evidence, .findings, .actions { margin-top: 10px; }
    .actions button { margin-right: 8px; }
  </style>
</head>
<body>
  <nav class="top-nav">
    <strong>Overview</strong>
    <span>Assessment</span>
    <span>Findings</span>
    <span>Readiness</span>
  </nav>

  <div class="layout">
    <aside class="side">
      <h3>Assessment Domains</h3>
      <ul>
        <li>UI/UX</li>
        <li class="active">Compliance and Security</li>
        <li>Backend Functionality</li>
        <li>Client and Contact Simulation</li>
        <li>Efficiency and Workflow</li>
        <li>Website and Portal</li>
      </ul>
    </aside>

    <main class="main">
      <section class="state">
        <h2>Overview</h2>
        <p>Readiness score 82 / 100, critical findings open: 2, closed this week: 7.</p>
      </section>

      <section class="state">
        <h2>Assessment - Compliance and Security</h2>
        <p>Owner: Security Ops | Last Updated: 2026-04-11 | Readiness: 79%</p>
        <div class="checks">Checks: Consent enforcement (PASS), Audit trail integrity (IN PROGRESS), Sensitive data exposure (FAIL)</div>
        <div class="evidence">Evidence: consent-log-2026-04-11.json, endpoint-redaction-screenshot.png</div>
        <div class="findings">Findings: Critical 1 | Non-critical 3</div>
        <div class="actions">
          <button>Create finding</button>
          <button>Record retest</button>
          <button>Request review</button>
        </div>
      </section>

      <section class="state">
        <h2>Findings</h2>
        <p>Critical Queue: P1 consent-state mismatch awaiting retest evidence.</p>
      </section>

      <section class="state">
        <h2>Readiness</h2>
        <p>Go/No-Go summary: NO-GO until all P0/P1 findings include PASS retest evidence.</p>
      </section>
    </main>
  </div>
</body>
</html>
```

- [ ] **Step 4: Run tests to verify artifact passes**

Run: `python -m pytest docs/mockups/tests/test_phase6_portal_hybrid_mockup.py -v`
Expected: PASS.

- [ ] **Step 5: Commit artifact implementation**

```bash
git add docs/mockups/phase6-portal-hybrid-reviewed.html
git commit -m "feat(mockup): add high-fidelity phase6 hybrid portal artifact"
```

### Task 3: Add Review Instructions and Final Verification

**Files:**
- Modify: `docs/mockups/README.md`
- Test: `docs/mockups/tests/test_phase6_portal_hybrid_mockup.py`

- [ ] **Step 1: Add README instructions for human review**

```markdown
# Mockup Review Guide

## Open the artifact
- File: `docs/mockups/phase6-portal-hybrid-reviewed.html`
- Open directly in a browser (double-click or drag into browser window)

## What to evaluate
- Navigation clarity between top-level phase tabs and left domain menu
- Content density in `Assessment > Compliance and Security`
- Visibility of findings workflow actions: `Create finding`, `Record retest`, `Request review`
- Readiness decision clarity in the `Readiness` section

## Validate artifact labels
- Run: `python -m pytest docs/mockups/tests/test_phase6_portal_hybrid_mockup.py -v`
```

- [ ] **Step 2: Run validator one more time**

Run: `python -m pytest docs/mockups/tests/test_phase6_portal_hybrid_mockup.py -v`
Expected: PASS.

- [ ] **Step 3: Commit docs updates**

```bash
git add docs/mockups/README.md docs/mockups/tests/test_phase6_portal_hybrid_mockup.py
git commit -m "docs(mockup): add review checklist and validation command"
```

---

## Final Verification Checklist

- [ ] `python -m pytest docs/mockups/tests/test_phase6_portal_hybrid_mockup.py -v`
- [ ] Open `docs/mockups/phase6-portal-hybrid-reviewed.html` manually and verify all four states are visible and labeled
- [ ] Confirm hybrid navigation model is readable without any backend/frontend runtime services
