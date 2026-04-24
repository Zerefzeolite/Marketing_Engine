# Marketing Engine - Current Structure

## Project Status
**Active Development** - Full-stack web application with analytics dashboard.

## Current Phase
**Phase 23: Package Pricing Redesign** - Redesigning package tiers to use quality/frequency model (not contact count), adding contact range slider, implementing internal quality weights, and enhancing receipts.

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
│           ├── components/ # UI components (intake, campaign, payment, analytics)
│           └── lib/      # API contracts, utilities, pricing config
├── data/
│   ├── fixtures/        # Seed data (analytics_pilot.json, analytics_growth.json)
│   └── campaign_metrics.json
├── scripts/
│   └── seed_phase13_analytics.py
├── docs/
│   ├── superpowers/
│   │   ├── specs/       # Design specs (phase-*-design.md)
│   │   ├── plans/       # Implementation plans (phase-*-plan.md)
│   │   └── internal-pricing-reference.md  # Pricing structure (internal)
│   └── phase-*.md       # Phase runbooks
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
- **Phase 14**: Campaign scheduling & execution ✅
- **Phase 15**: Quality gate improvements ✅
- **Phase 16**: Campaign execution page ✅
- **Phase 17**: Campaign execution page improvements ✅
- **Phase 18**: Contact management ✅
- **Phase 19**: Notification system ✅
- **Phase 23**: Package pricing redesign ✅

## Pricing Model (Internal)
See `docs/superpowers/internal-pricing-reference.md` for complete details.

### Package Tiers (Quality/Frequency)
| Package | Sends | Markup | Description |
|---------|-------|--------|-------------|
| Starter | 2 | 1.5x | Sample size - cost effective |
| Growth | 4 | 2.0x | Standard - budget aligned |
| Premium | 4 | 2.5x | Best Fit - intelligent targeting |

### Channel Costs (Customer-Facing)
| Channel | Per Contact |
|---------|-------------|
| Email | $0.008 |
| SMS | $0.025 |
| Both | Smart routing |

### Quality Weights (Internal Only)
- Standard: 1.0x
- Responsive: 1.3x
- High-Value: 1.6x

## Running the App
```bash
# Seed analytics data
python scripts/seed_phase13_analytics.py --profile pilot --reset

# Backend (port 8000)
cd apps/backend && uvicorn app.main:app --reload

# Frontend (port 3000)
cd apps/frontend && npm run dev

# Build for production
cd apps/frontend && npm run build
```

## Key Components

### Intake Flow
- `IntakeForm.tsx` - Budget and campaign parameters input
- `RecommendationPreview.tsx` - Package options with contact range slider
- `intake.ts` - Pricing logic, quality weights, channel routing

### Campaign Flow
- `CampaignSetupStep.tsx` - Campaign details, template selection, enhanced summary
- `ModerationReview.tsx` - Content quality gate
- `PaymentStep.tsx` - Payment with detailed receipt
- `PaymentStatusDisplay.tsx` - Status tracking with print/email receipt

### Analytics
- `AnalyticsPage.tsx` - Dashboard with tabs
- `ReachTab.tsx` - Delivery and engagement metrics
- `ResponseTab.tsx` - Campaign responses

## Recent Changes (April 2026)
- Package tiers now differentiated by quality/sends, not contact count
- Contact range slider for custom reach
- Internal quality weight system (hidden from customers)
- Smart channel routing (hybrid contacts charged once)
- Enhanced campaign summary with all package details
- Detailed itemized receipts with print styles