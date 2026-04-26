# AI Marketing Engine - Technical Documentation

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Database Structure](#2-database-structure)
3. [API Reference](#3-api-reference)
4. [Coding Dictionary](#4-coding-dictionary)
5. [Process Flows](#5-process-flows)
6. [Component Inventory](#6-component-inventory)
7. [Configuration](#7-configuration)
8. [Coding Standards](#8-coding-standards)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js)                        │
│  ┌─────────┐  ┌─────────────┐  ┌──────────┐  ┌───────────────┐ │
│  │ /intake │  │/campaign-flow│  │/analytics│  │  /admin/reviews│ │
│  └────┬────┘  └──────┬──────┘  └────┬─────┘  └───────┬───────┘ │
└───────┼──────────────┼─────────────┼───────────────┼───────────┘
        │              │             │               │
        └──────────────┴─────────────┴───────────────┘
                              │ HTTP/REST
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND (FastAPI)                           │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                        API Routes                            ││
│  │  ┌──────────┐ ┌────────────┐ ┌──────────┐ ┌────────────┐  ││
│  │  │ /intake  │ │ /campaigns │ │/payments │ │ /analytics │  ││
│  │  └────┬─────┘ └─────┬──────┘ └────┬─────┘ └─────┬──────┘  ││
│  └───────┼─────────────┼─────────────┼─────────────┼──────────┘│
│  ┌───────┴─────────────┴─────────────┴─────────────┴──────────┐│
│  │                     Services Layer                          ││
│  │  intake_service │ campaign_service │ payment_service │ ... ││
│  └───────┬─────────────┬─────────────┬─────────────┬──────────┘│
│  ┌───────┴─────────────┴─────────────┴─────────────┴──────────┐│
│  │                     Data Layer (JSON Files)                 ││
│  │  contacts.json │ sessions.json │ payments.json │ metrics.json││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
        │                                          │
        ▼                                          ▼
┌───────────────┐                        ┌─────────────────────┐
│  Email (Brevo)│                        │    SMS (Twilio)     │
└───────────────┘                        └─────────────────────┘
```

---

## 2. Database Structure

### 2.1 Storage Model

**Type**: JSON file-based (development)  
**Location**: `apps/backend/data/`  
**Future**: PostgreSQL-ready architecture

### 2.2 Entity Relationship

```
┌──────────────────┐
│  CampaignSession │──────┐
│  (sessions.json) │      │
└────────┬─────────┘      │
         │                │ 1:many
         ▼                ▼
┌──────────────────┐  ┌────────────┐
│   Contacts       │  │  Payments  │
│ (contacts.json) │◄─┤(payments.json)
└────────┬─────────┘  └──────┬─────┘
         │                   │
         │ 1:many            │ 1:1
         ▼                   ▼
┌──────────────────┐  ┌──────────────┐
│ContactInteraction│  │    Consent   │
│(interactions.json)│ │(consents.json)
└──────────────────┘  └──────────────┘
```

### 2.3 Data Schemas

#### CampaignSession (`sessions.json`)

```json
{
  "session_id": "REQ-xxxxxxxx",
  "client_email": "user@example.com",
  "campaign_name": "Summer Sale Campaign",
  "status": "UNDER_MANUAL_REVIEW | DRAFT_HELD | ACTIVE | COMPLETED",
  "package_tier": "starter | growth | premium",
  "channel_split": "email: 100% | sms: 100% | email: 60%, sms: 40%",
  "estimated_reachable": 1000,
  "recommended_package": "growth",
  "confidence": 0.85,
  "template_tier": "basic | enhanced | premium",
  "manual_review_ticket_id": "MREV-XXXX",
  "latest_moderation_decision": "PASS | REVISION_REQUIRED | MANUAL_REVIEW_OFFERED",
  "ai_attempt_count": 3,
  "expires_at": "2024-01-15T12:00:00Z",
  "reminder_at": "2024-01-15T07:00:00Z",
  "created_at": "2024-01-14T12:00:00Z",
  "updated_at": "2024-01-14T14:30:00Z"
}
```

#### Contact (`contacts.json`)

```json
{
  "contact_id": "CNT-xxxxxxxx",
  "email": "contact@example.com",
  "phone": "+1234567890",
  "first_name": "John",
  "last_name": "Doe",
  "tags": ["customer", "newsletter"],
  "source": "import | manual | api",
  "created_at": "2024-01-14T12:00:00Z",
  "opt_out": false
}
```

#### Payment (`payments.json`)

```json
{
  "payment_id": "PAY-xxxxxxxx",
  "request_id": "REQ-xxxxxxxx",
  "amount": 100,
  "amount_jmd": 15500,
  "method": "LOCAL_BANK_TRANSFER | CASH | STRIPE | PAYPAL",
  "status": "PENDING | APPROVED | REJECTED | COMPLETED",
  "receipt_url": "https://...",
  "verified_at": "2024-01-14T12:00:00Z",
  "admin_notes": "Manual verification completed",
  "created_at": "2024-01-14T12:00:00Z"
}
```

#### CampaignMetrics (`campaign_metrics.json`)

```json
{
  "campaign_id": "CMP-xxxxxxxx",
  "session_id": "REQ-xxxxxxxx",
  "sent": 950,
  "delivered": 940,
  "opened": 235,
  "clicked": 47,
  "replied": 12,
  "failed": 10,
  "opt_out": 3,
  "cost_usd": 7.60,
  "cost_jmd": 1178,
  "period_start": "2024-01-14",
  "period_end": "2024-01-21"
}
```

#### Consent (`consents.json`)

```json
{
  "request_id": "REQ-xxxxxxxx",
  "consent_to_marketing": true,
  "terms_accepted": true,
  "data_processing_consent": true,
  "recorded_at": "2024-01-14T12:00:00Z"
}
```

---

## 3. API Reference

### 3.1 Intake API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/intake/submit` | Submit intake form |
| POST | `/intake/estimate` | Estimate campaign reach |
| POST | `/intake/recommend` | Get package recommendation |

### 3.2 Campaign API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/campaigns/session/start` | Start new session |
| POST | `/campaigns/session/resume` | Resume expired session |
| POST | `/campaigns/moderation/check` | Run moderation check |
| POST | `/campaigns/moderation/manual-review/request` | Request manual review |
| POST | `/campaigns/moderation/manual-review/decision` | Complete review decision |
| GET | `/campaigns/moderation/pending-reviews` | List pending reviews |
| POST | `/campaigns/execute` | Execute campaign |
| GET | `/campaigns/executions` | Get execution history |
| POST | `/campaigns/template/generate` | Generate template |

### 3.3 Payment API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/payments/submit` | Submit payment |
| POST | `/payments/verify` | Verify/reject payment |
| POST | `/payments/upload-receipt/{id}` | Upload receipt |
| GET | `/payments/status/{id}` | Get payment status |
| GET | `/payments/pending` | List pending payments |
| GET | `/payments/all` | List all payments |

### 3.4 Consent API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/consent/record` | Record consent |
| GET | `/consent/status/{id}` | Get consent status |

### 3.5 Analytics API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/campaigns/{id}/events` | Record campaign event |
| GET | `/campaigns/{id}/metrics` | Get campaign metrics |
| GET | `/campaigns/aggregated` | Get aggregated metrics |

### 3.6 Contact API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/contacts` | Create contact |
| GET | `/contacts` | List contacts |
| GET | `/contacts/{id}` | Get contact |
| DELETE | `/contacts/{id}` | Delete contact |
| POST | `/contacts/import` | Bulk import |

---

## 4. Coding Dictionary

### 4.1 Backend Terms

| Term | Definition |
|------|------------|
| `campaign_session_id` | Unique identifier for campaign flow (format: REQ-xxxxxxxx) |
| `payment_id` | Unique identifier for payment (format: PAY-xxxxxxxx) |
| `contact_id` | Unique identifier for contact (format: CNT-xxxxxxxx) |
| `execution_id` | Unique identifier for campaign execution (format: EXEC-xxxxxxxx) |
| `manual_review_ticket_id` | Ticket for manual review (format: MREV-xxxx) |
| `session` | CampaignSession entity tracking full campaign lifecycle |
| `moderate` | Run AI content safety check on campaign |
| `dispatch` | Send campaign messages to contacts |
| `execute` | Complete campaign run including dispatch |

### 4.2 Frontend Terms

| Term | Definition |
|------|------------|
| `flowStep` | Current step in campaign-flow (intake, consent, campaign_setup, moderation, payment, status, execute) |
| `packageTier` | Selected pricing tier (starter, growth, premium) |
| `templateTier` | Template quality level (basic, enhanced, premium) |
| `channelSplit` | Distribution of channels (email: X%, sms: Y%) |
| `isClientMode` | Display mode showing JMD prices |

### 4.3 Business Terms

| Term | Definition |
|------|------------|
| `markup` | Price multiplier over provider cost |
| `reach` | Estimated contacts campaign can reach |
| `confidence` | AI confidence in recommendation (0-1) |
| `safety_score` | Content safety rating from moderation (0-100) |
| `audience_match_score` | Audience targeting accuracy (0-100) |

### 4.4 File Naming Conventions

| Pattern | Example |
|---------|---------|
| API routes | `campaigns_v2.py`, `payment.py` |
| Services | `campaign_service.py`, `email_service.py` |
| Models | `payment.py`, `intake.py` |
| Frontend pages | `page.tsx`, `campaign-flow/page.tsx` |
| Components | `CamelCase.tsx`, `PaymentStep.tsx` |
| API clients | `camelCase.ts`, `payment.ts` |

---

## 5. Process Flows

### 5.1 Campaign Lifecycle

```
┌─────────┐
│  START  │
└────┬────┘
     ▼
┌─────────────┐     ┌──────────────────┐
│   INTAKE    │────►│  Get Recommendation │
└────┬────────┘     └──────────────────┘
     │ Yes                   │
     ▼                       ▼
┌─────────────┐     ┌──────────────────┐
│   CONSENT   │────►│  User accepts terms │
└────┬────────┘     └──────────────────┘
     │ Yes                   │
     ▼                       ▼
┌─────────────────┐     ┌──────────────────┐
│ CAMPAIGN SETUP   │────►│  Configure campaign │
└────┬────────────┘     └──────────────────┘
     │ Run Check              │
     ▼                       ▼
┌─────────────────┐     ┌──────────────────┐
│   MODERATION    │────►│  3 failed → Manual │
└────┬────────────┘     │  Review else pass │
     │                   └──────────────────┘
     ├─► PASS ──────────────────────────────────┐
     │                                           │
     ├─► REVISION_REQUIRED ────► Revise ─────────┤
     │                                           │
     └─► MANUAL_REVIEW_OFFERED ──► Accept ──────┘
                                               │
     ▼                                           │
┌─────────────┐                                 │
│  PAYMENT    │◄────────────────────────────────┘
└────┬────────┘
     │ Verified                │
     ▼                         ▼
┌─────────────┐     ┌──────────────────┐
│   EXECUTE   │────►│  Dispatch messages │
└────┬────────┘     └──────────────────┘
     │ Complete               │
     ▼                         ▼
┌─────────────┐     ┌──────────────────┐
│  ANALYTICS  │◄────│  Track & report  │
└────┬────────┘     └──────────────────┘
     │
     ▼
┌─────────┐
│  END    │
└─────────┘
```

### 5.2 Payment Flow

```
User selects payment method
         │
         ▼
┌─────────────────────────────┐
│   Bank Transfer / Cash      │────► Show instructions
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│    Upload Receipt           │────► Receipt uploaded
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│   Admin verifies receipt     │────► OCR extracted
└─────────────┬───────────────┘
              │
      ┌───────┴───────┐
      │               │
      ▼               ▼
┌──────────┐   ┌──────────┐
│ APPROVED │   │ REJECTED │
└────┬─────┘   └────┬─────┘
     │              │
     ▼              ▼
┌──────────┐   ┌──────────┐
│ Execute  │   │  Notify  │
│ Campaign │   │  User    │
└──────────┘   └──────────┘
```

### 5.3 Manual Review Flow

```
AI Moderation fails 3x
         │
         ▼
┌─────────────────────────────┐
│ Offer Manual Review        │────► User sees popup
└─────────────┬───────────────┘
              │
      ┌───────┴───────┐
      │               │
      ▼               ▼
┌──────────┐   ┌──────────┐
│  Accept  │   │  Reject  │
└────┬─────┘   └────┬─────┘
     │              │
     ▼              ▼
┌─────────────┐  ┌────────────────┐
│ Ticket ID   │  │ Set 12hr hold  │
│ MREV-XXXX   │  │ Draft expires  │
└────┬────────┘  └───────┬────────┘
     │                   │
     ▼                   ▼
┌─────────────────────────────┐
│ Admin reviews at /admin/reviews │
└─────────────┬───────────────┘
              │
      ┌───────┴───────┐
      │               │
      ▼               ▼
┌──────────┐   ┌──────────┐
│ APPROVED │   │ REJECTED │
└────┬─────┘   └────┬─────┘
     │              │
     ▼              ▼
┌──────────┐   ┌──────────┐
│ Proceed  │   │  Cancel  │
│ to pay   │   │ Campaign │
└──────────┘   └──────────┘
```

---

## 6. Component Inventory

### 6.1 Backend Components

#### Services

| Service | Responsibility | Key Functions |
|---------|----------------|---------------|
| `intake_service.py` | Campaign estimation | `estimate_reach()`, `generate_recommendation()` |
| `campaign_service.py` | Session management | `start_session()`, `run_moderation()`, `set_manual_review_choice()` |
| `payment_service.py` | Payment processing | `submit_payment()`, `verify_payment()`, `record_consent()` |
| `email_service.py` | Email sending | `send_email()`, `send_test()` |
| `sms_service.py` | SMS sending | `send_sms()`, `send_test()` |
| `analytics_service.py` | Metrics tracking | `record_event()`, `get_metrics()` |
| `contact_service.py` | Contact management | `create()`, `list()`, `import_bulk()` |

#### Models

| Model | Purpose |
|-------|---------|
| `payment.py` | PaymentMethod, PaymentStatus, Request/Response types |
| `intake.py` | IntakeSubmitRequest, IntakeEstimateResponse |
| `campaign.py` | CampaignSession, ModerationResult |
| `assessment.py` | Finding, RetestResult, Severity |

### 6.2 Frontend Components

#### Pages

| Page | Route | Purpose |
|------|-------|---------|
| Home | `/` | Navigation hub |
| Intake | `/intake` | Campaign intake form |
| Campaign Flow | `/campaign-flow` | Multi-phase campaign wizard |
| Analytics | `/analytics` | Metrics dashboard |
| Admin Reviews | `/admin/reviews` | Manual review queue |

#### Shared Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `IntakeForm` | `components/intake/` | Multi-step intake form |
| `RecommendationPreview` | `components/intake/` | Package recommendation display |
| `CampaignSetupStep` | `components/campaign/` | Campaign configuration |
| `ModerationReview` | `components/campaign/` | Moderation interface |
| `PaymentStep` | `components/payment/` | Payment flow |
| `ConsentStep` | `components/payment/` | Consent recording |
| `KPICard` | `components/analytics/` | Metric display card |

---

## 7. Configuration

### 7.1 Pricing Configuration

```typescript
// apps/frontend/src/lib/pricing.ts

export const PACKAGE_TIERS = {
  starter: {
    sends: 2,
    markup: 1.5,
    label: "Starter",
    color: "#22c55e"
  },
  growth: {
    sends: 4,
    markup: 2.0,
    label: "Growth",
    color: "#3b82f6"
  },
  premium: {
    sends: 4,
    markup: 2.5,
    label: "Premium",
    color: "#8b5cf6"
  }
}

export const CHANNEL_COSTS = {
  email: { usd: 0.008, jmd: 1.24 },
  sms: { usd: 0.025, jmd: 3.88 }
}

export const TEMPLATE_UPGRADES = {
  enhanced: { usd: 50, jmd: 8000 },
  premium: { usd: 150, jmd: 24000 }
}
```

### 7.2 Provider Configuration

```python
# apps/backend/app/services/email_service.py

BREVO_API_KEY = os.getenv("BREVO_API_KEY")
SENDER_EMAIL = os.getenv("SENDER_EMAIL", "noreply@marketingengine.com")
SENDER_NAME = os.getenv("SENDER_NAME", "Marketing Engine")

# apps/backend/app/services/sms_service.py

TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER")
MOCK_MODE = os.getenv("SMS_MOCK_MODE", "true").lower() == "true"
```

### 7.3 Environment Variables

| Variable | Backend | Frontend | Description |
|----------|---------|----------|-------------|
| `BREVO_API_KEY` | ✓ | | Brevo/Sendinblue API key |
| `TWILIO_ACCOUNT_SID` | ✓ | | Twilio account ID |
| `TWILIO_AUTH_TOKEN` | ✓ | | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | ✓ | | Twilio phone number |
| `SMS_MOCK_MODE` | ✓ | | Enable SMS mock mode |
| `NEXT_PUBLIC_API_URL` | | ✓ | Backend API URL |
| `NEXT_PUBLIC_DEBUG` | | ✓ | Enable debug features |

---

## 8. Coding Standards

### 8.1 Backend (Python)

```python
# Use type hints
def submit_payment(request_id: str, amount: int, method: PaymentMethod) -> dict:
    ...

# Use Pydantic models for validation
class PaymentSubmitRequest(BaseModel):
    request_id: str = Field(min_length=1)
    amount: int = Field(ge=1)
    method: PaymentMethod

# Follow naming conventions
FUNCTION_NAME = "snake_case"
ClassName = "PascalCase"
CONSTANT = "SCREAMING_SNAKE_CASE"
```

### 8.2 Frontend (TypeScript/React)

```typescript
// Use functional components with hooks
export function PaymentStep({ requestId, onComplete }: PaymentStepProps) {
  const [step, setStep] = useState<"select" | "instructions">("select")
  ...
}

// Follow naming conventions
const functionName = "camelCase"
const ClassName = "PascalCase"
const CONSTANT_NAME = "SCREAMING_SNAKE_CASE"
const componentName = "PascalCase.tsx"

// Component props interface
interface ComponentProps {
  propName: string
  optionalProp?: boolean
}
```

### 8.3 API Design

```typescript
// Request format
{
  schema_version: "1.0",
  // ... other fields
}

// Response format
{
  schema_version: "1.0",
  // ... response data
}

// Error format
{
  detail: "Error message"
}
```

### 8.4 File Organization

```
Backend:
├── app/
│   ├── api/          # One file per resource
│   ├── models/       # One file per model group
│   ├── services/     # One file per service
│   └── main.py       # App entry point

Frontend:
├── app/              # One folder per route
│   └── [page]/        # page.tsx + optional subfolders
├── components/       # Organized by feature
│   ├── analytics/
│   ├── campaign/
│   └── payment/
└── lib/
    ├── api/          # API clients
    └── contracts/    # Type definitions
```

---

## Revision History

| Date | Version | Changes |
|------|---------|---------|
| 2024-01-14 | 1.0 | Initial documentation |
| 2026-04-26 | 2.0 | Full technical documentation |