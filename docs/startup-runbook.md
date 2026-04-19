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

## Common Tasks

### Reset Analytics Data
```bash
python scripts/seed_phase13_analytics.py --profile pilot --reset
```

### View Current Metrics
```bash
cat data/campaign_metrics.json
```

### Add New Campaign
POST to `/api/campaigns` with campaign config.