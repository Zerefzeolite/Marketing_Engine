# Marketing Engine Maintenance Skill

## Purpose

This skill provides guidelines for maintaining, updating, and extending the AI Marketing Engine application. Use it as a reference when:

- Adding new features
- Modifying existing functionality
- Fixing bugs
- Ensuring consistency across frontend/backend
- Planning database migrations

---

## 1. Project Scope

### Core Features

| Feature | Status | Last Updated |
|---------|--------|--------------|
| Campaign Intake | ✅ Complete | 2026-04-26 |
| Package Recommendations | ✅ Complete | 2026-04-26 |
| Consent Recording | ✅ Complete | 2026-04-26 |
| Campaign Setup | ✅ Complete | 2026-04-26 |
| AI Moderation | ✅ Complete | 2026-04-26 |
| Manual Review | ✅ Complete | 2026-04-26 |
| Payment Processing | ✅ Complete | 2026-04-26 |
| Email Delivery (Brevo) | ✅ Complete | 2026-04-26 |
| SMS Delivery (Twilio) | ✅ Complete | 2026-04-26 |
| Analytics Dashboard | ✅ Complete | 2026-04-26 |
| Admin Portal | ✅ Complete | 2026-04-26 |

### Planned Features

- [ ] Stripe/PayPal integration (production payment)
- [ ] PostgreSQL migration
- [ ] Contact list management UI
- [ ] A/B testing for campaigns
- [ ] Automated reporting (email)
- [ ] Webhook integrations

---

## 2. Codebase Structure

### Backend (`apps/backend/`)

```
app/
├── api/                    # FastAPI routers
│   ├── campaigns_v2.py     # Campaign workflow
│   ├── payment.py         # Payment & consent
│   ├── intake.py          # Intake & recommendations
│   ├── contacts.py        # Contact management
│   ├── analytics.py        # Event & metrics
│   └── main.py            # App entry point
│
├── services/              # Business logic
│   ├── campaign_service.py
│   ├── payment_service.py
│   ├── email_service.py
│   ├── sms_service.py
│   ├── intake_service.py
│   ├── analytics_service.py
│   └── contact_service.py
│
├── models/                # Pydantic models
│   ├── payment.py
│   ├── intake.py
│   └── campaign.py
│
└── data/                  # JSON storage
    ├── contacts.json
    ├── sessions.json
    ├── payments.json
    ├── consents.json
    ├── campaign_metrics.json
    ├── executions.json
    └── notifications.json
```

### Frontend (`apps/frontend/`)

```
src/
├── app/                   # Next.js pages
│   ├── page.tsx           # Home
│   ├── intake/            # Intake flow
│   ├── campaign-flow/     # Campaign wizard
│   ├── analytics/         # Dashboard
│   └── admin/reviews/     # Manual review
│
├── components/
│   ├── intake/            # Intake components
│   ├── campaign/          # Campaign components
│   ├── payment/           # Payment components
│   └── analytics/         # Dashboard components
│
└── lib/
    ├── api/               # API clients
    ├── contracts/         # Type definitions
    └── pricing.ts         # Pricing config
```

---

## 3. Development Rules

### 3.1 API Design

**Pattern**: RESTful JSON API

```python
# Request - include schema_version
{
  "schema_version": "1.0",
  "request_id": "REQ-xxx",
  ...
}

# Response - include schema_version
{
  "schema_version": "1.0",
  "data": {...}
}

# Error
{
  "detail": "Error message"
}
```

**Rules**:
1. Always use Pydantic models for validation
2. Return proper HTTP status codes (200, 201, 400, 404, 500)
3. Include `schema_version: "1.0"` in all requests/responses
4. Document new endpoints in `docs/obsidian/151 - API Endpoints.md`

### 3.2 Frontend Components

**Pattern**: Functional components with hooks

```tsx
interface ComponentProps {
  id: string
  onAction: (data: Data) => void
  optional?: boolean
}

export function Component({ id, onAction, optional = false }: ComponentProps) {
  const [state, setState] = useState<Type>(initialValue)
  
  useEffect(() => {
    // side effects
  }, [dependencies])
  
  return <div>...</div>
}
```

**Rules**:
1. Always use TypeScript - no `any` types
2. Define prop interfaces at top of file
3. Use functional components only
4. Keep components focused (single responsibility)
5. Extract reusable logic to hooks or utils
6. Update `docs/obsidian/152 - Database Schema.md` for new types

### 3.3 Service Layer

**Pattern**: Stateless business logic

```python
def submit_payment(request_id: str, amount: int, method: PaymentMethod) -> dict:
    # Load data
    payments = _load_json(PAYMENT_STORAGE_FILE)
    
    # Process
    payment_id = new_payment_id()
    payment_record = {...}
    
    # Save
    payments[payment_id] = payment_record
    _save_json(PAYMENT_STORAGE_FILE, payments)
    
    # Return
    return {...}
```

**Rules**:
1. Use type hints on all functions
2. Load/save via `_load_json` / `_save_json` helpers
3. Keep services stateless (no class state)
4. Validate inputs with Pydantic models
5. Return dicts, let API layer convert to response models

---

## 4. Naming Conventions

### Files

| Type | Convention | Example |
|------|------------|---------|
| API routes | snake_case | `campaigns_v2.py` |
| Services | snake_case | `payment_service.py` |
| Models | snake_case | `payment.py` |
| Pages | page.tsx | `campaign-flow/page.tsx` |
| Components | PascalCase | `PaymentStep.tsx` |
| API clients | camelCase | `payment.ts` |
| Utilities | camelCase | `pricing.ts` |

### Identifiers

| Type | Format | Example |
|------|--------|---------|
| Session | REQ-xxxxxxxx | REQ-a1b2c3d4 |
| Payment | PAY-xxxxxxxx | PAY-e5f6g7h8 |
| Contact | CNT-xxxxxxxx | CNT-i9j0k1l2 |
| Execution | EXEC-xxxxxxxx | EXEC-m3n4o5p6 |
| Campaign | CMP-xxxxxxxx | CMP-q7r8s9t0 |
| Ticket | MREV-xxxx | MREV-A1B2 |

---

## 5. Database Rules

### Current: JSON Files

**Location**: `apps/backend/data/`

**Pattern**: One entity per file

```
contacts.json      → Contact[]
sessions.json      → CampaignSession[]
payments.json      → Payment[]
consents.json      → Consent[]
campaign_metrics.json → CampaignMetrics[]
executions.json    → Execution[]
```

### Future: PostgreSQL Migration

When migrating:

1. Create migration script
2. Export JSON to CSV
3. Import to PostgreSQL
4. Update service layer
5. Remove JSON operations
6. Update tests

**See**: `docs/obsidian/152 - Database Schema.md` for full schema

---

## 6. Configuration

### Pricing

```typescript
// apps/frontend/src/lib/pricing.ts
export const PACKAGE_TIERS = {
  starter: { sends: 2, markup: 1.5 },
  growth: { sends: 4, markup: 2.0 },
  premium: { sends: 4, markup: 2.5 }
}

export const CHANNEL_COSTS = {
  email: { usd: 0.008, jmd: 1.24 },
  sms: { usd: 0.025, jmd: 3.88 }
}
```

### Environment Variables

| Variable | Backend | Frontend | Required |
|----------|---------|----------|----------|
| BREVO_API_KEY | ✓ | | ✓ |
| TWILIO_ACCOUNT_SID | ✓ | | ✓ |
| TWILIO_AUTH_TOKEN | ✓ | | ✓ |
| TWILIO_PHONE_NUMBER | ✓ | | ✓ |
| SMS_MOCK_MODE | ✓ | | Development |
| NEXT_PUBLIC_API_URL | | ✓ | Development |
| NEXT_PUBLIC_DEBUG | | ✓ | Development |

---

## 7. Testing

### Backend

```bash
cd apps/backend
pytest tests/
```

### Frontend

```bash
cd apps/frontend
npm test
```

### Adding Tests

1. Backend: Add to `apps/backend/tests/test_*.py`
2. Frontend: Add to `apps/frontend/src/__tests__/*.test.tsx`
3. Follow naming: `test_<feature>_<phase>.py`

---

## 8. Process Flows

### Adding a New Feature

```
1. Create feature branch
   git checkout -b feature/feature-name

2. Update documentation
   - Add to this skill
   - Update API reference
   - Update schema docs

3. Backend changes
   - Add API route in apps/backend/app/api/
   - Add service in apps/backend/app/services/
   - Add models in apps/backend/app/models/
   - Write tests

4. Frontend changes
   - Add page in apps/frontend/src/app/
   - Add components in apps/frontend/src/components/
   - Add API client in apps/frontend/src/lib/api/
   - Write tests

5. Verify
   - Run backend tests: pytest
   - Run frontend tests: npm test
   - Build frontend: npm run build

6. Commit & push
   - git add .
   - git commit -m "feat: feature description"
   - git push
```

### Fixing a Bug

```
1. Reproduce the bug
2. Identify root cause
3. Create fix branch
4. Apply minimal fix
5. Add regression test
6. Verify fix
7. Commit & push
```

---

## 9. Release Checklist

Before pushing to production:

- [ ] All tests passing
- [ ] Build succeeds
- [ ] No hardcoded secrets
- [ ] Environment variables documented
- [ ] API documentation updated
- [ ] Migration scripts ready (if DB changes)
- [ ] Rollback plan in place

---

## 10. Key Files Reference

| File | Purpose |
|------|---------|
| `README.md` | Project overview & quick start |
| `docs/TECHNICAL_DOCUMENTATION.md` | Full technical reference |
| `docs/obsidian/151 - API Endpoints.md` | API reference |
| `docs/obsidian/152 - Database Schema.md` | Data models |
| `docs/obsidian/153 - Coding Dictionary.md` | Terminology |
| `AGENTS.md` | Agent instructions |

---

## Revision History

| Date | Version | Changes |
|------|---------|---------|
| 2026-04-26 | 1.0 | Initial skill creation |