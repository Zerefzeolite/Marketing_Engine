# Pack 06: PostgreSQL Migration Planning + Implementation

**Date**: 2026-05-01
**Status**: Partial — Schema + Migration Script Done (Repository Layer In Progress)
**Branch**: `feature/pack-06-postgresql-migration`
**Previous**: Pack 05 merged at `0f1cf35`

---

## Goal

Move runtime storage from JSON files to PostgreSQL safely, without breaking current behavior.

---

## 1. JSON Storage Audit

| File | Type | Key Pattern | Est. Rows |
|------|------|--------------|------------|
| `contacts.json` | dict | `CNT-xxx` → contact dict | Low |
| `campaign_sessions.json` | dict | `SES-xxx` → session dict | ~129 |
| `payments.json` | dict | `PAY-xxx` → payment dict | Low |
| `execution_history.json` | dict | `EXEC-xxx` → execution dict | Low |
| `campaign_metrics.json` | dict | `campaign_id` → metrics dict | Low |
| `contact_interactions.json` | dict | `contact_id` → [events] | Medium |
| `consents.json` | dict | `request_id` → consent dict | Low |
| `notifications.json` | dict | `NOTIF-xxx` → notification dict | ~16 |

**Total JSON files**: 8 (runtime storage)

---

## 2. PostgreSQL Schema Designed

**File**: `apps/backend/app/db_schema.py`

### Tables Created

| Table | Purpose | Key Columns |
|-------|---------|--------------|
| `contacts` | Contact storage | id (PK), email, phone, status, preferred_channel |
| `campaign_sessions` | Campaign sessions | session_id (PK), request_id, status, package_tier |
| `consents` | Consent records | id (PK), request_id, consent_to_marketing, terms_accepted |
| `payments` | Payment records | payment_id (PK), request_id, amount, status, audit_trail (JSON) |
| `payment_audit_events` | Audit trail events | id (PK), payment_id, action, actor, timestamp |
| `campaign_executions` | Execution records | execution_id (PK), campaign_id, status, contacts_attempted |
| `campaign_execution_contacts` | Execution↔Contact join | id (PK), execution_id, contact_id |
| `campaign_events` | Contact events | id (PK), campaign_id, contact_id, event_type, metadata (JSON) |
| `campaign_metrics` | Aggregated metrics | campaign_id (PK), sent, delivered, open_rate, click_rate |

### Indexes Added
- `contacts`: email, phone, status
- `campaign_sessions`: request_id, status
- `payments`: request_id, status
- `campaign_executions`: campaign_id, session_id
- `campaign_events`: campaign_id, contact_id, event_type

---

## 3. Database Config

**Added to `requirements.txt`:**
```
sqlalchemy>=2.0.0
psycopg2-binary>=2.9.0  # For PostgreSQL (dev only; use psycopg3 in production)
```

**`.env.example` placeholder already present:**
```
DATABASE_URL=sqlite:///./marketing_engine.db
```

**Environment variable:**
- `DATABASE_URL` — set to `postgresql://user:pass@localhost/marketing_engine` for PostgreSQL
- If unset or empty → **JSON fallback mode** (current behavior preserved)

---

## 4. JSON Fallback Strategy

**File**: `apps/backend/app/db.py`

The `HybridRepo` base class provides:
- `USE_DB` flag — auto-detected from `DATABASE_URL`
- If DB available → use SQLAlchemy session
- If DB unavailable → read/write JSON files (unchanged behavior)
- All existing service code can migrate gradually

**Safety:**
- Existing JSON logic is NOT deleted
- Database is optional (not required for pilot)
- Migration is idempotent (safe to run multiple times)

---

## 5. Migration Script

**File**: `apps/backend/app/migrate_json_to_db.py`

Usage:
```bash
# Set DATABASE_URL
export DATABASE_URL="postgresql://user:pass@localhost/marketing_engine"

# Ensure tables exist
python -m app.db_schema

# Run migration
python -m app.migrate_json_to_db
```

**What it does:**
1. Reads each JSON file
2. Inserts rows into corresponding PostgreSQL table
3. Skips duplicates (by primary key)
4. Reports counts for each table
5. Safe to run multiple times (idempotent)

---

## 6. Files Changed

| File | Action | Description |
|------|--------|-------------|
| `apps/backend/app/db_schema.py` | Created | PostgreSQL schema (9 tables) |
| `apps/backend/app/db.py` | Created | Hybrid JSON/DB config + `HybridRepo` base |
| `apps/backend/app/repos/contact_repo.py` | Created | Contact repository (hybrid) |
| `apps/backend/app/migrate_json_to_db.py` | Created | Migration script (JSON → DB) |
| `apps/backend/requirements.txt` | Updated | Added sqlalchemy, psycopg2-binary |
| `docs/PACK_06_POSTGRESQL_MIGRATION.md` | Created | This document |

---

## 7. Tests/Build Status

| Check | Result |
|-------|--------|
| Backend tests (130 existing) | **Pending** — need to run after service updates |
| Frontend build | **Pending** |
| DB schema creation | **✅ Done** (`db_schema.py`) |
| Migration script | **✅ Done** (idempotent) |
| Hybrid repo layer | **🟡 Partial** — ContactRepo done, others pending |

---

## 8. JSON Fallback Status

| Service | JSON Fallback | DB Repo | Status |
|---------|---------------|---------|--------|
| ContactService | ✅ Yes | ✅ contact_repo.py | Done |
| CampaignService | ✅ Yes | ❌ | Pending |
| PaymentService | ✅ Yes | ❌ | Pending |
| ExecutionService | ✅ Yes | ❌ | Pending |
| AnalyticsService | ✅ Yes | ❌ | Pending |
| IntakeService | ✅ Yes | ❌ | Pending |

**Current state**: Contact repo done. Others use JSON fallback until their repos are implemented.

---

## 9. Migration Limitations

1. **Repository layer incomplete** — only Contact repo implemented
2. **Service code not yet updated** — still reads JSON directly
3. **No DB tests yet** — need pytest with test database
4. **psycopg2-binary** is for dev; production should use `psycopg[binary]` (v3)
5. **SQLite supported** for dev — `DATABASE_URL=sqlite:///./test.db`

---

## 10. Next Steps

### Immediate (finish Pack 06)
1. Implement remaining repos:
   - `campaign_session_repo.py`
   - `payment_repo.py`
   - `execution_repo.py`
   - `metrics_repo.py`
   - `event_repo.py`
2. Update services to use repos (with JSON fallback)
3. Add DB tests (pytest with SQLite)
4. Run full test suite (130+ tests)

### Future
- Remove JSON fallback once DB is stable
- Switch to Alembic for schema migrations
- Deploy with managed PostgreSQL (e.g., Neon, Supabase)

---

## Safety Notes

- **No breaking changes** — JSON fallback preserves current behavior
- **DATABASE_URL unset** → app works exactly as before (JSON mode)
- **DATABASE_URL set** → new DB path used; JSON files untouched
- **Migration is optional** — run only when ready for PostgreSQL

---

**Pack 06 Status: 🟡 IN PROGRESS** — Schema and migration tools done. Repository layer partially implemented.
