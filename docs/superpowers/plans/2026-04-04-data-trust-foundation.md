# Data Trust Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Jamaica-launch data trust foundation: local CLI data cleaning pipeline, identity resolution, suppression handling, and controlled upsert into a living `MASTER_CONTACTS` SQLite store.

**Architecture:** Implement a Python CLI pipeline under `core_private/pipeline` with stage modules (`ingest`, `standardize`, `validate`, `identity`, `consent`, `enrich`, `upsert`). Use SQLite for deterministic local state and run audit logs. Drive behavior from typed settings and schema definitions, with pytest coverage per stage and one end-to-end integration test.

**Tech Stack:** Python 3.13, pandas, pydantic, typer, rapidfuzz, sqlite3, pytest

---

## Scope Decomposition (from approved spec)

The approved spec includes multiple independent subsystems. This plan implements only Subproject 1.

- Subproject 1 (this plan): Data Trust Foundation (local pipeline + living master data)
- Subproject 2 (next plan): Client intake web app + dashboard access flow
- Subproject 3 (next plan): Payment-gated execution adapters
- Subproject 4 (next plan): Post-campaign analytics and lifecycle automation

### Task 1: Bootstrap pipeline package and test harness

**Files:**
- Create: `core_private/pipeline/__init__.py`
- Create: `core_private/pipeline/config.py`
- Create: `core_private/pipeline/cli.py`
- Create: `core_private/requirements.txt`
- Create: `core_private/pytest.ini`
- Create: `core_private/tests/unit/test_config.py`

- [ ] **Step 1: Write the failing config test**

```python
# core_private/tests/unit/test_config.py
from pipeline.config import PipelineSettings


def test_default_settings_load():
    settings = PipelineSettings()
    assert settings.db_path.endswith("marketing_engine.db")
    assert settings.country_scope == "JM"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest core_private/tests/unit/test_config.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'pipeline'`

- [ ] **Step 3: Add package scaffold and typed settings**

```python
# core_private/pipeline/config.py
from pydantic import BaseModel


class PipelineSettings(BaseModel):
    db_path: str = "data/local/marketing_engine.db"
    country_scope: str = "JM"
    quarantine_dir: str = "data/quarantine"
    reports_dir: str = "data/reports"
```

```python
# core_private/pipeline/__init__.py
from .config import PipelineSettings

__all__ = ["PipelineSettings"]
```

```python
# core_private/pipeline/cli.py
import typer

app = typer.Typer(help="Local marketing data pipeline")


@app.command("health")
def health() -> None:
    print("ok")


if __name__ == "__main__":
    app()
```

```txt
# core_private/requirements.txt
pandas==2.3.0
pydantic==2.11.0
typer==0.16.0
rapidfuzz==3.13.0
pytest==8.3.5
```

```ini
# core_private/pytest.ini
[pytest]
pythonpath = .
testpaths = tests
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest core_private/tests/unit/test_config.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add core_private/pipeline core_private/requirements.txt core_private/pytest.ini core_private/tests/unit/test_config.py
git commit -m "feat: bootstrap local pipeline package and typed settings"
```

### Task 2: Implement canonical schema + standardization stage

**Files:**
- Create: `core_private/pipeline/schema.py`
- Create: `core_private/pipeline/stages/standardize.py`
- Create: `core_private/tests/unit/test_standardize.py`

- [ ] **Step 1: Write failing standardization test**

```python
# core_private/tests/unit/test_standardize.py
import pandas as pd
from pipeline.stages.standardize import standardize_contacts


def test_standardize_phone_email_parish():
    df = pd.DataFrame(
        [
            {
                "email": "  Jane.DOE@Email.com ",
                "phone": "(876) 555-1234",
                "parish": "st andrew",
            }
        ]
    )

    out = standardize_contacts(df)
    assert out.loc[0, "email"] == "jane.doe@email.com"
    assert out.loc[0, "phone"] == "8765551234"
    assert out.loc[0, "parish"] == "St. Andrew"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest core_private/tests/unit/test_standardize.py -v`
Expected: FAIL with `ImportError` for `standardize_contacts`

- [ ] **Step 3: Add schema map and standardization function**

```python
# core_private/pipeline/schema.py
CANONICAL_COLUMNS = [
    "contact_id",
    "email",
    "phone",
    "dob",
    "gender",
    "parish",
    "address",
    "occupation",
    "opt_out",
    "opt_out_reason",
    "source_system",
    "source_batch_id",
]


PARISH_MAP = {
    "st andrew": "St. Andrew",
    "st. andrew": "St. Andrew",
    "kingston": "Kingston",
}
```

```python
# core_private/pipeline/stages/standardize.py
import re
import pandas as pd

from pipeline.schema import PARISH_MAP


def _norm_email(value: str) -> str:
    return (value or "").strip().lower()


def _norm_phone(value: str) -> str:
    digits = re.sub(r"\D+", "", value or "")
    return digits[-10:] if len(digits) >= 10 else digits


def _norm_parish(value: str) -> str:
    key = (value or "").strip().lower()
    return PARISH_MAP.get(key, (value or "").strip().title())


def standardize_contacts(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    out["email"] = out["email"].map(_norm_email)
    out["phone"] = out["phone"].map(_norm_phone)
    out["parish"] = out["parish"].map(_norm_parish)
    return out
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest core_private/tests/unit/test_standardize.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add core_private/pipeline/schema.py core_private/pipeline/stages/standardize.py core_private/tests/unit/test_standardize.py
git commit -m "feat: add canonical schema and standardization stage"
```

### Task 3: Implement validation + quarantine outputs

**Files:**
- Create: `core_private/pipeline/stages/validate.py`
- Create: `core_private/tests/unit/test_validate.py`

- [ ] **Step 1: Write failing validation test**

```python
# core_private/tests/unit/test_validate.py
import pandas as pd
from pipeline.stages.validate import validate_contacts


def test_validate_splits_valid_and_invalid_rows():
    df = pd.DataFrame(
        [
            {"email": "ok@example.com", "phone": "8765551234", "parish": "Kingston"},
            {"email": "bad-at-example", "phone": "123", "parish": ""},
        ]
    )

    valid_df, rejected_df = validate_contacts(df)
    assert len(valid_df) == 1
    assert len(rejected_df) == 1
    assert rejected_df.iloc[0]["reject_reason"] != ""
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest core_private/tests/unit/test_validate.py -v`
Expected: FAIL with missing `validate_contacts`

- [ ] **Step 3: Implement validation stage**

```python
# core_private/pipeline/stages/validate.py
import re
import pandas as pd


EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _is_valid_phone(value: str) -> bool:
    return bool(value) and value.isdigit() and len(value) in (10, 11)


def validate_contacts(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    out = df.copy()
    reasons = []
    for _, row in out.iterrows():
        row_reasons = []
        if row.get("email") and not EMAIL_RE.match(str(row["email"])):
            row_reasons.append("invalid_email")
        if row.get("phone") and not _is_valid_phone(str(row["phone"])):
            row_reasons.append("invalid_phone")
        if not str(row.get("parish", "")).strip():
            row_reasons.append("missing_parish")
        reasons.append(",".join(row_reasons))

    out["reject_reason"] = reasons
    rejected = out[out["reject_reason"] != ""].copy()
    valid = out[out["reject_reason"] == ""].drop(columns=["reject_reason"]).copy()
    return valid, rejected
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest core_private/tests/unit/test_validate.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add core_private/pipeline/stages/validate.py core_private/tests/unit/test_validate.py
git commit -m "feat: add validation stage with reject reason routing"
```

### Task 4: Implement identity resolution with hold-for-review queue

**Files:**
- Create: `core_private/pipeline/stages/identity.py`
- Create: `core_private/tests/unit/test_identity.py`

- [ ] **Step 1: Write failing identity resolution test**

```python
# core_private/tests/unit/test_identity.py
import pandas as pd
from pipeline.stages.identity import classify_identity_matches


def test_ambiguous_near_matches_are_held_for_review():
    incoming = pd.DataFrame(
        [{"email": "ana@example.com", "phone": "8765551000", "address": "10 Hope Rd", "dob": "1996-01-01"}]
    )
    master = pd.DataFrame(
        [{"email": "anna@example.com", "phone": "8765551009", "address": "10 Hope Road", "dob": "1996-01-01"}]
    )

    merged, review = classify_identity_matches(incoming, master)
    assert len(merged) == 0
    assert len(review) == 1
    assert review.iloc[0]["decision"] == "hold_for_review"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest core_private/tests/unit/test_identity.py -v`
Expected: FAIL with missing `classify_identity_matches`

- [ ] **Step 3: Implement identity classifier with strict ambiguity hold**

```python
# core_private/pipeline/stages/identity.py
import pandas as pd
from rapidfuzz.fuzz import ratio


def _score(in_row: pd.Series, master_row: pd.Series) -> float:
    email_score = ratio(str(in_row.get("email", "")), str(master_row.get("email", "")))
    phone_score = 100.0 if str(in_row.get("phone", "")) == str(master_row.get("phone", "")) else 0.0
    addr_score = ratio(str(in_row.get("address", "")), str(master_row.get("address", "")))
    dob_score = 100.0 if str(in_row.get("dob", "")) == str(master_row.get("dob", "")) else 0.0
    return (email_score * 0.35) + (phone_score * 0.35) + (addr_score * 0.2) + (dob_score * 0.1)


def classify_identity_matches(incoming: pd.DataFrame, master: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    merge_rows = []
    review_rows = []

    for _, in_row in incoming.iterrows():
        if master.empty:
            merge_rows.append({**in_row.to_dict(), "decision": "insert_new"})
            continue

        scores = master.apply(lambda m: _score(in_row, m), axis=1)
        best = float(scores.max())

        if best >= 95.0:
            merge_rows.append({**in_row.to_dict(), "decision": "auto_merge"})
        elif best >= 70.0:
            review_rows.append({**in_row.to_dict(), "decision": "hold_for_review", "match_score": best})
        else:
            merge_rows.append({**in_row.to_dict(), "decision": "insert_new"})

    return pd.DataFrame(merge_rows), pd.DataFrame(review_rows)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest core_private/tests/unit/test_identity.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add core_private/pipeline/stages/identity.py core_private/tests/unit/test_identity.py
git commit -m "feat: add identity scoring and hold-for-review near-match policy"
```

### Task 5: Implement SQLite master upsert + audit logging

**Files:**
- Create: `core_private/pipeline/db.py`
- Create: `core_private/pipeline/stages/upsert.py`
- Create: `core_private/tests/unit/test_upsert.py`

- [ ] **Step 1: Write failing upsert test**

```python
# core_private/tests/unit/test_upsert.py
import sqlite3
import pandas as pd

from pipeline.db import init_db
from pipeline.stages.upsert import upsert_master_contacts


def test_upsert_updates_existing_and_inserts_new(tmp_path):
    db_path = tmp_path / "test.db"
    init_db(str(db_path))

    incoming = pd.DataFrame(
        [
            {"unique_key": "a|1", "email": "a@example.com", "phone": "8765550001", "record_status": "active"},
            {"unique_key": "b|2", "email": "b@example.com", "phone": "8765550002", "record_status": "active"},
        ]
    )

    upsert_master_contacts(str(db_path), incoming, source_batch_id="batch-1")
    incoming2 = pd.DataFrame(
        [{"unique_key": "a|1", "email": "a2@example.com", "phone": "8765550001", "record_status": "active"}]
    )
    upsert_master_contacts(str(db_path), incoming2, source_batch_id="batch-2")

    conn = sqlite3.connect(db_path)
    row_count = conn.execute("select count(*) from master_contacts").fetchone()[0]
    updated_email = conn.execute("select email from master_contacts where unique_key='a|1'").fetchone()[0]
    audit_count = conn.execute("select count(*) from audit_log").fetchone()[0]
    conn.close()

    assert row_count == 2
    assert updated_email == "a2@example.com"
    assert audit_count >= 3
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest core_private/tests/unit/test_upsert.py -v`
Expected: FAIL with missing db/upsert modules

- [ ] **Step 3: Implement DB schema initializer and upsert stage**

```python
# core_private/pipeline/db.py
import sqlite3


def init_db(db_path: str) -> None:
    conn = sqlite3.connect(db_path)
    conn.execute(
        """
        create table if not exists master_contacts (
            unique_key text primary key,
            email text,
            phone text,
            record_status text,
            first_seen_at text,
            last_seen_at text,
            last_updated_at text,
            source_batch_id text
        )
        """
    )
    conn.execute(
        """
        create table if not exists audit_log (
            id integer primary key autoincrement,
            event_type text,
            unique_key text,
            source_batch_id text,
            event_at text
        )
        """
    )
    conn.commit()
    conn.close()
```

```python
# core_private/pipeline/stages/upsert.py
import sqlite3
from datetime import datetime, timezone
import pandas as pd


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def upsert_master_contacts(db_path: str, df: pd.DataFrame, source_batch_id: str) -> None:
    conn = sqlite3.connect(db_path)
    now = _now()

    for _, row in df.iterrows():
        existing = conn.execute(
            "select unique_key from master_contacts where unique_key = ?", (row["unique_key"],)
        ).fetchone()

        if existing:
            conn.execute(
                """
                update master_contacts
                   set email = ?, phone = ?, record_status = ?, last_seen_at = ?,
                       last_updated_at = ?, source_batch_id = ?
                 where unique_key = ?
                """,
                (
                    row.get("email"),
                    row.get("phone"),
                    row.get("record_status", "active"),
                    now,
                    now,
                    source_batch_id,
                    row["unique_key"],
                ),
            )
            event_type = "update"
        else:
            conn.execute(
                """
                insert into master_contacts (
                    unique_key, email, phone, record_status,
                    first_seen_at, last_seen_at, last_updated_at, source_batch_id
                ) values (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    row["unique_key"],
                    row.get("email"),
                    row.get("phone"),
                    row.get("record_status", "active"),
                    now,
                    now,
                    now,
                    source_batch_id,
                ),
            )
            event_type = "insert"

        conn.execute(
            "insert into audit_log (event_type, unique_key, source_batch_id, event_at) values (?, ?, ?, ?)",
            (event_type, row["unique_key"], source_batch_id, now),
        )

    conn.commit()
    conn.close()
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest core_private/tests/unit/test_upsert.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add core_private/pipeline/db.py core_private/pipeline/stages/upsert.py core_private/tests/unit/test_upsert.py
git commit -m "feat: add sqlite master upsert and audit logging"
```

### Task 6: Wire full CLI run and end-to-end pipeline test

**Files:**
- Modify: `core_private/pipeline/cli.py`
- Create: `core_private/pipeline/stages/ingest.py`
- Create: `core_private/pipeline/stages/consent.py`
- Create: `core_private/pipeline/stages/enrich.py`
- Create: `core_private/tests/integration/test_pipeline_run.py`

- [ ] **Step 1: Write failing integration test for one pipeline run**

```python
# core_private/tests/integration/test_pipeline_run.py
import sqlite3
import pandas as pd

from pipeline.db import init_db
from pipeline.stages.standardize import standardize_contacts
from pipeline.stages.validate import validate_contacts
from pipeline.stages.identity import classify_identity_matches
from pipeline.stages.upsert import upsert_master_contacts


def test_pipeline_run_inserts_and_audits(tmp_path):
    db_path = tmp_path / "pipeline.db"
    init_db(str(db_path))

    raw = pd.DataFrame(
        [
            {"email": "new@example.com", "phone": "8765555555", "parish": "kingston", "address": "1 Main St", "dob": "1998-09-10", "opt_out": "No", "unique_key": "new@example.com|8765555555"}
        ]
    )

    std = standardize_contacts(raw)
    valid, _ = validate_contacts(std)
    merge_df, review_df = classify_identity_matches(valid, pd.DataFrame())
    assert review_df.empty
    upsert_master_contacts(str(db_path), merge_df, source_batch_id="it-batch-1")

    conn = sqlite3.connect(db_path)
    rows = conn.execute("select count(*) from master_contacts").fetchone()[0]
    conn.close()
    assert rows == 1
```

- [ ] **Step 2: Run integration test to verify it fails**

Run: `pytest core_private/tests/integration/test_pipeline_run.py -v`
Expected: FAIL because ingestion/consent/enrich/CLI orchestration are not implemented

- [ ] **Step 3: Add ingest/consent/enrich stages and CLI run command**

```python
# core_private/pipeline/stages/ingest.py
import pandas as pd


def load_contacts(path: str) -> pd.DataFrame:
    if path.lower().endswith(".csv"):
        return pd.read_csv(path)
    return pd.read_excel(path)
```

```python
# core_private/pipeline/stages/consent.py
import pandas as pd


def filter_suppressed(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    out = df.copy()
    mask = out.get("opt_out", "No").astype(str).str.lower().eq("yes")
    suppressed = out[mask].copy()
    active = out[~mask].copy()
    return active, suppressed
```

```python
# core_private/pipeline/stages/enrich.py
import pandas as pd


def enrich_fields(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    out["channel_available"] = out.apply(
        lambda r: "email_and_sms"
        if bool(str(r.get("email", "")).strip()) and bool(str(r.get("phone", "")).strip())
        else ("email_only" if bool(str(r.get("email", "")).strip()) else "sms_only"),
        axis=1,
    )
    return out
```

```python
# core_private/pipeline/cli.py
import typer
import pandas as pd

from pipeline.config import PipelineSettings
from pipeline.db import init_db
from pipeline.stages.ingest import load_contacts
from pipeline.stages.standardize import standardize_contacts
from pipeline.stages.validate import validate_contacts
from pipeline.stages.identity import classify_identity_matches
from pipeline.stages.consent import filter_suppressed
from pipeline.stages.enrich import enrich_fields
from pipeline.stages.upsert import upsert_master_contacts

app = typer.Typer(help="Local marketing data pipeline")


@app.command("run")
def run(path: str, source_batch_id: str) -> None:
    settings = PipelineSettings()
    init_db(settings.db_path)

    raw = load_contacts(path)
    std = standardize_contacts(raw)
    valid, _rejected = validate_contacts(std)
    active, _suppressed = filter_suppressed(valid)
    enriched = enrich_fields(active)
    merge_df, _review = classify_identity_matches(enriched, pd.DataFrame())
    upsert_master_contacts(settings.db_path, merge_df, source_batch_id=source_batch_id)
    print("pipeline_run_complete")


if __name__ == "__main__":
    app()
```

- [ ] **Step 4: Run integration test to verify it passes**

Run: `pytest core_private/tests/integration/test_pipeline_run.py -v`
Expected: PASS

- [ ] **Step 5: Run full test suite**

Run: `pytest core_private/tests -v`
Expected: PASS across unit + integration tests

- [ ] **Step 6: Commit**

```bash
git add core_private/pipeline core_private/tests
git commit -m "feat: wire end-to-end cli pipeline with suppression and enrichment"
```

### Task 7: Add operator documentation and runbook commands

**Files:**
- Create: `docs/data-pipeline-runbook.md`
- Modify: `docs/current_structure.md`

- [ ] **Step 1: Write failing docs assertion test (smoke check)**

```python
# core_private/tests/unit/test_docs_presence.py
from pathlib import Path


def test_runbook_exists_and_mentions_run_modes():
    content = Path("docs/data-pipeline-runbook.md").read_text(encoding="utf-8")
    assert "full_import" in content
    assert "incremental_import" in content
    assert "reclean_existing" in content
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest core_private/tests/unit/test_docs_presence.py -v`
Expected: FAIL with missing runbook file

- [ ] **Step 3: Create runbook and update structure doc**

```md
# docs/data-pipeline-runbook.md
# Data Pipeline Runbook

## Run Modes
- full_import
- incremental_import
- reclean_existing

## Example Command
python core_private/pipeline/cli.py run --path data/input/contacts.csv --source-batch-id batch-2026-04-04

## Safety Rules
- Never send from raw datasets.
- Review `hold_for_review` records before merge.
- Keep `audit_log` immutable.
```

```md
# docs/current_structure.md (append section)
## Added Local Data Trust Foundation
- core_private/pipeline/
- core_private/tests/
- docs/data-pipeline-runbook.md
```

- [ ] **Step 4: Run docs test to verify it passes**

Run: `pytest core_private/tests/unit/test_docs_presence.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add docs/data-pipeline-runbook.md docs/current_structure.md core_private/tests/unit/test_docs_presence.py
git commit -m "docs: add data pipeline runbook and structure updates"
```

## Verification Checklist (before closing Subproject 1)

- [ ] `pytest core_private/tests -v` passes.
- [ ] Sample CLI run writes rows into `master_contacts` and `audit_log`.
- [ ] Ambiguous near-matches are emitted to review queue, not auto-merged.
- [ ] Suppressed contacts are excluded from upsert.
- [ ] Runbook includes run modes and operational safety rules.
