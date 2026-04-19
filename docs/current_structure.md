# Marketing Engine - Current Structure

## Project Status
**Active Development** - Full-stack web application with analytics dashboard.

## Local Folder Structure
```
Marketing_Engine/
├── apps/
│   ├── backend/           # FastAPI backend
│   │   └── app/
│   │       ├── api/      # API routes (intake, payment, campaigns, analytics)
│   │       ├── services/ # Business logic
│   │       └── main.py   # App entry
│   └── frontend/          # Next.js frontend
│       └── src/
│           ├── app/      # Pages (/intake, /campaign-flow, /analytics, /quality-gate)
│           └── components/ # UI components
├── data/
│   ├── fixtures/        # Seed data (analytics_pilot.json, analytics_growth.json)
│   └── campaign_metrics.json
├── scripts/
│   └── seed_phase13_analytics.py
├── docs/
│   └── phase-*.md       # Phase runbooks and specs
└── core_private/       # Internal utilities
```

## Implemented Phases
- **Phase 2**: Client intake web surface ✅
- **Phase 4**: Campaign generation & payment links ✅
- **Phase 5**: Post-campaign analytics ✅
- **Phase 6**: Portal hybrid mockup ✅
- **Phase 7**: Reliability hardening ✅
- **Phase 8**: Pilot kickoff ✅
- **Phase 9**: Client UI productionization ✅
- **Phase 12**: Analytics dashboard ✅
- **Phase 13**: Live analytics data integration ✅

## Running the App
```bash
# Seed analytics data
python scripts/seed_phase13_analytics.py --profile pilot --reset

# Backend (port 8000)
cd apps/backend && uvicorn app.main:app --reload

# Frontend (port 3000)
cd apps/frontend && npm run dev
```
