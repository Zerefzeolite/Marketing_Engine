# Phase 3 Payment + Execution Runbook

## Migration Note (Phase 4)
Phase 3 payment verification remains valid for legacy flow checks, but active campaign governance has moved to the Phase 4 session-driven lifecycle.

For current operations, use `docs/phase-4-campaign-governance-runbook.md` as the primary runbook for moderation, manual-review handling, payment-link verification, dispatch gating, and reporting.

## Start Services
- Backend: `uvicorn app.main:app --reload --app-dir apps/backend`

## Complete Flow Test

### Step 1: Submit Intake
```bash
curl -X POST http://localhost:8000/intake/submit \
  -H "Content-Type: application/json" \
  -d '{
    "schema_version": "1.0",
    "business_name": "Test Business",
    "contact_email": "test@example.com",
    "campaign_objective": "Lead generation",
    "preferred_channel": "email",
    "budget_min": 5000,
    "budget_max": 10000
  }'
```
Save the returned `request_id` (e.g., `REQ-abc12345`)

### Step 2: Record Consent (required before payment)
```bash
curl -X POST http://localhost:8000/consent/record \
  -H "Content-Type: application/json" \
  -d '{
    "schema_version": "1.0",
    "request_id": "REQ-abc12345",
    "consent_to_marketing": true,
    "terms_accepted": true,
    "data_processing_consent": true
  }'
```

### Step 3: Submit Payment
```bash
curl -X POST http://localhost:8000/payments/submit \
  -H "Content-Type: application/json" \
  -d '{
    "schema_version": "1.0",
    "request_id": "REQ-abc12345",
    "amount": 5000,
    "method": "LOCAL_BANK_TRANSFER"
  }'
```
Note the `payment_id` returned and payment instructions.

### Step 4: Upload Receipt (simulated)
```bash
# Create a dummy image file first
echo "fake image" > /tmp/receipt.txt

# Upload (would normally be image, using text for stub testing)
curl -X POST http://localhost:8000/payments/upload-receipt/PAY-xxxxxx \
  -F "file=@/tmp/receipt.txt"
```

### Step 5: Admin Verify Payment
```bash
curl -X POST http://localhost:8000/payments/verify \
  -H "Content-Type: application/json" \
  -d '{
    "schema_version": "1.0",
    "payment_id": "PAY-xxxxxx",
    "action": "approve",
    "admin_notes": "Verified against bank statement"
  }'
```

### Step 6: Execute Campaign (requires payment verified + consent)
```bash
curl -X POST http://localhost:8000/campaigns/execute \
  -H "Content-Type: application/json" \
  -d '{
    "schema_version": "1.0",
    "request_id": "REQ-abc12345",
    "campaign_data": {
      "channels": ["email"],
      "target_count": 500
    }
  }'
```

## Admin Dashboard Endpoints
- `GET /payments/pending` - List pending payments
- `GET /payments/all` - List all payments
- `GET /consent/status/{request_id}` - Check consent status
- `GET /payments/status/{payment_id}` - Check specific payment
- `GET /payments/by-request/{request_id}` - Get payment by request

## Verify Flow Status
```bash
curl http://localhost:8000/intake/status/REQ-abc12345
```

## Test Commands
- Backend tests: `pytest apps/backend/tests -v`

## Safety Checks
- Payment verification required before campaign execution (402 if not paid)
- Consent required before campaign execution (400 if not recorded)
- No raw contact data in responses
- Schema-versioned responses
- Admin notifications logged on receipt upload
- Client notifications logged on approval/rejection

## Key Warnings Displayed
- Bank transfer: "Bank transfer requires verification (24-48 hrs). Your campaign will launch after approval."
- Shown in flow status endpoint and payment submission response

## Database Storage
- Payments: `data/payments.json`
- Consents: `data/consents.json`
- Executions: `data/executions.json`
- Notifications: `data/notifications.json`, `data/admin_notifications.json`
