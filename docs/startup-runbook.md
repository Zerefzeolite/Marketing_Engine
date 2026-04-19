# Marketing Engine - Startup Runbook

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 20+
- pnpm

### 1. Seed Analytics Data
```bash
# Choose profile: pilot (5 campaigns) or growth (20 campaigns)
python scripts/seed_phase13_analytics.py --profile pilot --reset
```

### 2. Start Backend
```bash
cd apps/backend
uvicorn app.main:app --reload --port 8000
```
- API: http://localhost:8000
- Docs: http://localhost:8000/docs

### 3. Start Frontend
```bash
cd apps/frontend
npm run dev
```
- UI: http://localhost:3000

## Pages

| Path | Description |
|------|-------------|
| `/` | Landing page |
| `/intake` | Client intake form |
| `/campaign-flow` | Campaign wizard |
| `/quality-gate` | Quality review |
| `/analytics` | Analytics dashboard |

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/campaigns/metrics` | All campaign metrics |
| `GET /api/campaigns/aggregated` | Aggregated dashboard data |
| `GET /health` | Backend health check |

## Data Profiles

| Profile | Campaigns | Contacts |
|---------|-----------|----------|
| `pilot` | 5 | ~500 |
| `growth` | 20 | ~10k |

## Implemented Phases

| Phase | Feature | Status |
|-------|---------|--------|
| 13 | Live Analytics Data | ✅ |
| 14 | Campaign Scheduling | ✅ |
| 15 | Quality Gate UI | ✅ |

## Common Tasks

### Reset Analytics Data
```bash
python scripts/seed_phase13_analytics.py --profile pilot --reset
```

### Schedule a Campaign
```bash
curl -X PATCH http://localhost:8000/api/campaigns/{id}/schedule \
  -H "Content-Type: application/json" \
  -d '{"scheduled_at": "2026-04-20T14:00:00Z", "timezone": "UTC"}'
```

### View Scheduled Campaigns
```bash
curl http://localhost:8000/api/campaigns/scheduled
```

### View Execution History
```bash
curl http://localhost:8000/api/campaigns/executions
```