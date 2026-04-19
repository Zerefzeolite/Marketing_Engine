# Phase 16: Campaign Execution - Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Execute scheduled campaigns - run the actual message dispatch.

**Architecture:** Polling-based scheduler triggers dispatch_service

**Tech Stack:** Python/FastAPI, existing dispatch_service

---

### Task 1: Add Manual Execute Endpoint

**Files:**
- Modify: `apps/backend/app/api/campaigns_v2.py`

- [ ] **Step 1: Add execute endpoint**

```python
@router.post("/{campaign_id}/execute")
def execute_campaign(campaign_id: str) -> dict:
    # Validate campaign exists
    # Start execution
    # Call dispatch_service
    # Complete execution
    return {"status": "executed", "campaign_id": campaign_id}
```

- [ ] **Step 2: Commit**

```bash
git add apps/backend/app/api/campaigns_v2.py
git commit -m "feat(phase16): add manual execute endpoint"
```

---

### Task 2: Connect to Dispatch Service

**Files:**
- Modify: `apps/backend/app/services/dispatch_service.py` (if needed)

- [ ] **Step 1: Add campaign dispatch function**

```python
def dispatch_campaign(campaign_id: str) -> dict:
    """Dispatch all messages for a campaign."""
    # Load campaign contacts
    # For each: send message
    # Return results
```

- [ ] **Step 2: Commit**

```bash
git add apps/backend/app/services/dispatch_service.py
git commit -m "feat(phase16): add campaign dispatch"
```

---

### Task 3: Scheduler Integration

**Files:**
- Modify: `apps/backend/app/services/scheduler_service.py`

- [ ] **Step 1: Add execute_due function**

```python
def execute_due_campaigns() -> list[dict]:
    """Find and execute all due campaigns."""
    due = get_due_campaigns()
    results = []
    for campaign in due:
        mark_executing(campaign["campaign_id"])
        try:
            dispatch_service.dispatch_campaign(campaign["campaign_id"])
            mark_completed(campaign["campaign_id"])
            results.append({"campaign_id": campaign["campaign_id"], "status": "completed"})
        except Exception as e:
            mark_failed(campaign["campaign_id"])
            results.append({"campaign_id": campaign["campaign_id"], "status": "failed", "error": str(e)})
    return results
```

- [ ] **Step 2: Commit**

```bash
git add apps/backend/app/services/scheduler_service.py
git commit -m "feat(phase16): add execute due campaigns"
```

---

## Summary

| Task | Description |
|------|-------------|
| 1 | Manual execute endpoint |
| 2 | Connect dispatch service |
| 3 | Scheduler integration |