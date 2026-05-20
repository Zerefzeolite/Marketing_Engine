# Data Pipeline Runbook

## Run Modes
- `full_import`
- `incremental_import`
- `reclean_existing`

## Example Command
```bash
cd core_private
python -m pipeline.cli run "../data/input/contacts.csv" "batch-2026-04-04" --db-path "../data/local/marketing_engine.db"
```

## Safety Rules
- Never send from raw datasets.
- Review `hold_for_review` records before merge.
- Keep `audit_log` immutable.

## Review Queue Output
- Ambiguous matches are exported to `reports/hold_for_review_<source_batch_id>.csv`.
