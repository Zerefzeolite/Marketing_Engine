# Coding Dictionary

## Identifiers

| Term | Format | Example | Description |
|------|--------|---------|-------------|
| `session_id` | REQ-xxxxxxxx | REQ-a1b2c3d4 | Campaign session identifier |
| `payment_id` | PAY-xxxxxxxx | PAY-e5f6g7h8 | Payment record identifier |
| `contact_id` | CNT-xxxxxxxx | CNT-i9j0k1l2 | Contact record identifier |
| `execution_id` | EXEC-xxxxxxxx | EXEC-m3n4o5p6 | Campaign execution identifier |
| `campaign_id` | CMP-xxxxxxxx | CMP-q7r8s9t0 | Campaign identifier |
| `ticket_id` | MREV-xxxx | MREV-A1B2 | Manual review ticket |
| `finding_id` | FND-xxxxxxxx | FND-u1v2w3x4 | Assessment finding |

## Status Enums

### Campaign Status

| Value | Description |
|-------|-------------|
| `DRAFT` | Campaign in progress, not submitted |
| `ACTIVE` | Campaign approved, ready to execute |
| `UNDER_MANUAL_REVIEW` | Flagged for human review |
| `DRAFT_HELD` | Revision requested, awaiting updates |
| `COMPLETED` | Campaign execution finished |

### Moderation Decision

| Value | Description |
|-------|-------------|
| `PASS` | Campaign approved by AI |
| `REVISION_REQUIRED` | Campaign needs changes |
| `MANUAL_REVIEW_OFFERED` | Flagged for manual review |

### Payment Status

| Value | Description |
|-------|-------------|
| `PENDING` | Awaiting verification |
| `APPROVED` | Verified by admin |
| `REJECTED` | Rejected by admin |
| `COMPLETED` | Payment received, campaign ready |

### Payment Method

| Value | Description |
|-------|-------------|
| `LOCAL_BANK_TRANSFER` | NCB bank transfer |
| `CASH` | Cash deposit at bank |
| `STRIPE` | Credit card (future) |
| `PAYPAL` | PayPal (future) |

### Execution Status

| Value | Description |
|-------|-------------|
| `PENDING` | Execution queued |
| `RUNNING` | Currently executing |
| `COMPLETED` | Successfully finished |
| `FAILED` | Execution failed |

## Component Terminology

### Frontend

| Term | Definition |
|------|------------|
| `flowStep` | Current step in campaign-flow wizard |
| `packageTier` | Pricing tier: starter, growth, premium |
| `templateTier` | Template quality: basic, enhanced, premium |
| `channelSplit` | Email/SMS distribution percentage |
| `isClientMode` | Whether to show JMD prices |
| `sliderValue` | Contact range from slider control |

### Backend

| Term | Definition |
|------|------------|
| `moderate` | Run content safety check |
| `dispatch` | Send messages to contacts |
| `execute` | Complete campaign run |
| `verify` | Admin approves payment |

## Business Terms

| Term | Definition |
|------|------------|
| `markup` | Price multiplier over provider cost |
| `reach` | Estimated contacts campaign can reach |
| `confidence` | AI recommendation confidence (0-1) |
| `safety_score` | Content safety rating (0-100) |
| `audience_match_score` | Targeting accuracy (0-100) |
| `conversion_rate` | Contacts who took desired action |
| `opt_out` | Contact unsubscribed |

## File Naming

### Backend

```
api/
  ├── campaigns_v2.py      # v2 API routes
  ├── payment.py           # Payment endpoints
  ├── intake.py            # Intake endpoints
  └── contacts.py          # Contact endpoints

services/
  ├── campaign_service.py  # Campaign business logic
  ├── payment_service.py   # Payment processing
  ├── email_service.py     # Email sending
  └── sms_service.py       # SMS sending

models/
  ├── payment.py           # Payment models
  ├── intake.py            # Intake models
  └── campaign.py          # Campaign models
```

### Frontend

```
app/
  ├── page.tsx             # Root page
  ├── intake/page.tsx      # Intake page
  └── campaign-flow/
      ├── page.tsx         # Campaign flow
      └── moderationPhase.ts

components/
  ├── IntakeForm.tsx       # Intake component
  ├── PaymentStep.tsx      # Payment component
  └── analytics/
      └── KPICard.tsx      # Analytics card

lib/
  ├── api/
  │   ├── payment.ts       # Payment API client
  │   └── campaign.ts      # Campaign API client
  ├── pricing.ts           # Pricing config
  └── contracts/
      └── payment.ts       # Type definitions
```

## API Conventions

### Request Format

```typescript
{
  schema_version: "1.0",
  // ... resource-specific fields
}
```

### Response Format

```typescript
{
  schema_version: "1.0",
  // ... response data
}
```

### Error Format

```typescript
{
  detail: "Error message"
}
```

## Function Naming

### Backend (snake_case)

```python
def submit_payment()         # Submit payment
def verify_payment()         # Verify payment
def start_session()         # Start campaign session
def run_moderation()         # Run moderation check
def record_event()          # Record analytics event
def send_email()            # Send email
def send_sms()              # Send SMS
```

### Frontend (camelCase)

```typescript
function submitPayment()    // Submit payment
function handleProceed()    // Handle user action
function fetchSession()     // Fetch session data
function calculatePrice()   // Calculate pricing
```

## URL Patterns

```
/campaigns/session/start
/campaigns/moderation/check
/campaigns/execute
/payments/submit
/payments/verify
/payments/pending
/consent/record
/contacts/{id}
/campaigns/{id}/events
/campaigns/{id}/metrics
```

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `BREVO_API_KEY` | Brevo email API key |
| `TWILIO_ACCOUNT_SID` | Twilio account ID |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | Twilio sender number |
| `SMS_MOCK_MODE` | Enable SMS mock mode |
| `NEXT_PUBLIC_API_URL` | Backend API URL |
| `NEXT_PUBLIC_DEBUG` | Enable debug features |