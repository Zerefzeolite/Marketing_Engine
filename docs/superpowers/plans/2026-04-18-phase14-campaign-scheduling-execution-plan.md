# Phase 14: Campaign Scheduling & Execution - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add campaign scheduling and execution tracking - campaigns can be scheduled for future times and execution history is logged.

**Architecture:** 
- Add scheduling fields to campaign model (stored in JSON)
- Create scheduler and execution services for queue management
- Simple polling-based scheduler (no cron dependency)
- All data stored in JSON files under `data/`

**Tech Stack:** Python/FastAPI, JSON file storage

---

### Task 1: Add Scheduling Types

**Files:**
- Modify: `apps/backend/app/api/campaigns_v2.py`

- [ ] **Step 1: Add scheduling request/response models**

Add after existing models (~line 80):

```python
class ScheduleCampaignRequest(BaseModel):
    scheduled_at: datetime
    timezone: str = "UTC"


class ScheduleCampaignResponse(BaseModel):
    campaign_id: str
    scheduled_at: datetime
    timezone: str
    status: Literal["scheduled", "executing", "completed", "failed"]


class ExecutionLog(BaseModel):
    execution_id: str
    campaign_id: str
    started_at: datetime
    completed_at: datetime | None = None
    status: Literal["pending", "executing", "completed", "failed"]
    contacts_attempted: int = 0
    contacts_delivered: int = 0
    errors: list[str] = []
```

- [ ] **Step 2: Commit**

```bash
git add apps/backend/app/api/campaigns_v2.py
git commit -m "feat(phase14): add scheduling types"
```

---

### Task 2: Create Scheduler Service

**Files:**
- Create: `apps/backend/app/services/scheduler_service.py`

- [ ] **Step 1: Create scheduler service**

```python
from datetime import UTC, datetime
from pathlib import Path
import json
from uuid import uuid4

SCHEDULER_FILE = Path("data/campaign_schedules.json")


def _load_schedules() -> dict:
    if not SCHEDULER_FILE.exists():
        return {}
    with open(SCHEDULER_FILE) as f:
        return json.load(f)


def _save_schedules(schedules: dict) -> None:
    SCHEDULER_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(SCHEDULER_FILE, "w") as f:
        json.dump(schedules, f, indent=2)


def schedule_campaign(campaign_id: str, scheduled_at: datetime, timezone: str = "UTC") -> dict:
    schedules = _load_schedules()
    schedules[campaign_id] = {
        "campaign_id": campaign_id,
        "scheduled_at": scheduled_at.isoformat(),
        "timezone": timezone,
        "status": "scheduled",
    }
    _save_schedules(schedules)
    return schedules[campaign_id]


def get_scheduled_campaigns() -> list[dict]:
    schedules = _load_schedules()
    return list(schedules.values())


def get_due_campaigns() -> list[dict]:
    schedules = _load_schedules()
    now = datetime.now(UTC)
    due = []
    for campaign in schedules.values():
        scheduled = datetime.fromisoformat(campaign["scheduled_at"].replace("Z", "+00:00"))
        if campaign["status"] == "scheduled" and scheduled <= now:
            due.append(campaign)
    return due


def cancel_scheduled(campaign_id: str) -> dict | None:
    schedules = _load_schedules()
    if campaign_id in schedules:
        schedules[campaign_id]["status"] = "cancelled"
        _save_schedules(schedules)
        return schedules[campaign_id]
    return None


def mark_executing(campaign_id: str) -> dict | None:
    schedules = _load_schedules()
    if campaign_id in schedules:
        schedules[campaign_id]["status"] = "executing"
        _save_schedules(schedules)
        return schedules[campaign_id]
    return None


def mark_completed(campaign_id: str) -> dict | None:
    schedules = _load_schedules()
    if campaign_id in schedules:
        schedules[campaign_id]["status"] = "completed"
        _save_schedules(schedules)
        return schedules[campaign_id]
    return None
```

- [ ] **Step 2: Run syntax check**

```bash
python -m py_compile apps/backend/app/services/scheduler_service.py
```

- [ ] **Step 3: Commit**

```bash
git add apps/backend/app/services/scheduler_service.py
git commit -m "feat(phase14): add scheduler service"
```

---

### Task 3: Create Execution Service

**Files:**
- Create: `apps/backend/app/services/execution_service.py`

- [ ] **Step 1: Create execution service**

```python
from datetime import UTC, datetime
from pathlib import Path
import json
from uuid import uuid4

EXECUTION_FILE = Path("data/execution_history.json")


def _load_executions() -> dict:
    if not EXECUTION_FILE.exists():
        return {}
    with open(EXECUTION_FILE) as f:
        return json.load(f)


def _save_executions(executions: dict) -> None:
    EXECUTION_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(EXECUTION_FILE, "w") as f:
        json.dump(executions, f, indent=2)


def start_execution(campaign_id: str) -> dict:
    executions = _load_executions()
    execution_id = f"EXEC-{uuid4().hex[:8].upper()}"
    executions[execution_id] = {
        "execution_id": execution_id,
        "campaign_id": campaign_id,
        "started_at": datetime.now(UTC).isoformat(),
        "completed_at": None,
        "status": "executing",
        "contacts_attempted": 0,
        "contacts_delivered": 0,
        "errors": [],
    }
    _save_executions(executions)
    return executions[execution_id]


def complete_execution(
    execution_id: str,
    contacts_attempted: int = 0,
    contacts_delivered: int = 0,
    errors: list[str] = None,
) -> dict:
    executions = _load_executions()
    if execution_id in executions:
        executions[execution_id].update({
            "completed_at": datetime.now(UTC).isoformat(),
            "status": "completed" if not errors else "failed",
            "contacts_attempted": contacts_attempted,
            "contacts_delivered": contacts_delivered,
            "errors": errors or [],
        })
        _save_executions(executions)
        return executions[execution_id]
    return {}


def get_execution_history(campaign_id: str | None = None) -> list[dict]:
    executions = _load_executions()
    if campaign_id:
        return [e for e in executions.values() if e["campaign_id"] == campaign_id]
    return list(executions.values())
```

- [ ] **Step 2: Run syntax check**

```bash
python -m py_compile apps/backend/app/services/execution_service.py
```

- [ ] **Step 3: Commit**

```bash
git add apps/backend/app/services/execution_service.py
git commit -m "feat(phase14): add execution service"
```

---

### Task 4: Add API Endpoints

**Files:**
- Modify: `apps/backend/app/api/campaigns_v2.py`

- [ ] **Step 1: Add imports**

Add after existing imports:

```python
from app.services import scheduler_service
from app.services import execution_service
```

- [ ] **Step 2: Add schedule endpoint**

Add at end of file:

```python
@router.patch("/{campaign_id}/schedule", response_model=ScheduleCampaignResponse)
def schedule_campaign(campaign_id: str, req: ScheduleCampaignRequest) -> ScheduleCampaignResponse:
    result = scheduler_service.schedule_campaign(
        campaign_id=campaign_id,
        scheduled_at=req.scheduled_at,
        timezone=req.timezone,
    )
    return ScheduleCampaignResponse.model_validate(result)


@router.get("/scheduled", response_model=list[ScheduleCampaignResponse])
def get_scheduled_campaigns() -> list[ScheduleCampaignResponse]:
    results = scheduler_service.get_scheduled_campaigns()
    return [ScheduleCampaignResponse.model_validate(r) for r in results]


@router.get("/executions")
def get_executions(campaign_id: str | None = None) -> list[dict]:
    return execution_service.get_execution_history(campaign_id)
```

- [ ] **Step 3: Test syntax**

```bash
python -m py_compile apps/backend/app/api/campaigns_v2.py
```

- [ ] **Step 4: Commit**

```bash
git add apps/backend/app/api/campaigns_v2.py
git commit -m "feat(phase14): add scheduling API endpoints"
```

---

### Task 5: Integration Test

**Files:**
- Modify: `data/campaign_metrics.json` (seed data)

- [ ] **Step 1: Add scheduler test**

```bash
# Seed scheduler data
python -c "
import json
from pathlib import Path
data = {'CMP-PILOT-001': {'campaign_id': 'CMP-PILOT-001', 'scheduled_at': '2026-04-20T14:00:00+00:00', 'timezone': 'UTC', 'status': 'scheduled'}}
Path('data/campaign_schedules.json').write_text(json.dumps(data, indent=2))
print('Created scheduler data')
"
```

- [ ] **Step 2: Test API**

```bash
cd apps/backend && uvicorn app.main:app --reload --port 8000 &
sleep 3
curl http://localhost:8000/api/campaigns/scheduled
```

- [ ] **Step 3: Commit**

```bash
git add data/
git commit -m "feat(phase14): add scheduler seed data"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Scheduling types | `campaigns_v2.py` |
| 2 | Scheduler service | `scheduler_service.py` |
| 3 | Execution service | `execution_service.py` |
| 4 | API endpoints | `campaigns_v2.py` |
| 5 | Integration test | seed data |