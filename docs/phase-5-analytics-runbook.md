# Phase 5 Analytics Runbook

## Purpose
Validate Phase 5 post-campaign analytics flow.

## Start Services
- Backend: `uvicorn app.main:app --reload --app-dir apps/backend --port 8001`

## Endpoint Tests

### Record Event
```bash
curl -X POST http://localhost:8001/campaigns/CMP-TEST/events \
  -H "Content-Type: application/json" \
  -d '{"campaign_id":"CMP-TEST","contact_id":"CNT-001","event_type":"SENT"}'
```
Expected: 200, delivery.sent = 1

### Get Metrics
```bash
curl http://localhost:8001/campaigns/CMP-TEST/metrics
```
Expected: 200 with delivery, interactions, consent_summary

### Get Contact Interactions
```bash
curl http://localhost:8001/campaigns/contacts/CNT-001/interactions
```
Expected: 200 with interaction list

## Test Commands
```bash
python -m pytest apps/backend/tests/test_analytics_phase5.py -v
```

## Verification
- All analytics tests pass
- API endpoints respond correctly
- Consent metrics included in reports
