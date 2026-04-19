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