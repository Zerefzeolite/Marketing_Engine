# API Endpoints

## Campaign Flow API

### Session Management

```
POST /campaigns/session/start
  Request: { client_email: string }
  Response: { session_id: string, status: string }

POST /campaigns/session/resume
  Request: { session_id: string, resume_token: string }
  Response: { session_id: string, status: string, expires_at: string }
```

### Moderation

```
POST /campaigns/moderation/check
  Request: { campaign_session_id, campaign_id, safety_score: 0-100, audience_match_score: 0-100 }
  Response: { decision: "PASS" | "REVISION_REQUIRED" | "MANUAL_REVIEW_OFFERED", ai_attempt_count: number }

POST /campaigns/moderation/manual-review/request
  Request: { campaign_session_id, accepted: boolean }
  Response: { status: "UNDER_MANUAL_REVIEW" | "DRAFT_HELD", manual_review_ticket_id: string }

POST /campaigns/moderation/manual-review/decision
  Request: { campaign_session_id, decision: "approved" | "rejected", admin_notes?: string }
  Response: { status: "APPROVED" | "REJECTED" | "DRAFT_HELD", payment_link_eligible: boolean }

GET /campaigns/moderation/pending-reviews
  Response: [{ campaign_session_id, ticket_id, client_email, campaign_name, created_at }]
```

### Dispatch & Execution

```
POST /campaigns/dispatch/start
  Request: { campaign_id: string }
  Response: { dispatch_id: string, status: string }

POST /campaigns/execute
  Request: { request_id: string, campaign_data: object }
  Response: { execution_id: string, status: string, contacts_attempted: number }

GET /campaigns/executions
  Query: campaign_id?: string
  Response: [{ execution_id, campaign_id, status, started_at, completed_at }]
```

### Templates

```
POST /campaigns/template/generate
  Request: { campaign_session_id, template_type: "email" | "sms", style_preference?: string }
  Response: { template_content: string, template_id: string }
```

---

## Intake API

```
POST /intake/submit
  Request: { business_name, target_audience, campaign_objective, preferred_channel, estimated_budget }
  Response: { request_id: string, status: string }

POST /intake/estimate
  Request: { target_audience, preferred_channel, budget }
  Response: { estimated_reachable: number, channel_split: string, confidence: number }

POST /intake/recommend
  Request: { audience_size, preferred_channel, campaign_duration }
  Response: { recommended_package, estimated_price, estimated_price_jmd, confidence, package_options: [] }
```

---

## Payment API

### Payment Submission

```
POST /payments/submit
  Request: { request_id: string, amount: number, method: "LOCAL_BANK_TRANSFER" | "CASH" | "STRIPE" | "PAYPAL", auto_approve?: boolean }
  Response: { payment_id, status: "PENDING" | "APPROVED", payment_instructions: string, expected_wait_time: string }
```

### Payment Verification (Admin)

```
POST /payments/verify
  Request: { payment_id: string, action: "approve" | "reject", notes?: string }
  Response: { status: string, verified_at: string }

POST /payments/upload-receipt/{payment_id}
  Body: multipart/form-data with 'file' field
  Response: { receipt_url: string, ocr_extracted: object }
```

### Payment Status

```
GET /payments/status/{payment_id}
  Response: { payment_id, status, amount, method, verified_at }

GET /payments/by-request/{request_id}
  Response: { payment_id, status, amount, method }

GET /payments/pending
  Response: [{ payment_id, request_id, amount, method, created_at }]

GET /payments/all
  Response: [{ payment_id, request_id, status, amount, method, created_at }]
```

---

## Consent API

```
POST /consent/record
  Request: { request_id: string, consent_to_marketing: boolean, terms_accepted: boolean, data_processing_consent: boolean }
  Response: { consent_id: string, recorded_at: string }

GET /consent/status/{request_id}
  Response: { request_id, consent_to_marketing, terms_accepted, data_processing_consent, recorded_at }
```

---

## Analytics API

### Event Recording

```
POST /campaigns/{campaign_id}/events
  Request: { campaign_id, contact_id, event_type: "SENT" | "DELIVERED" | "FAILED" | "OPENED" | "CLICKED" | "REPLIED" | "OPT_OUT" }
  Response: { event_id: string, recorded: true }
```

### Metrics

```
GET /campaigns/{campaign_id}/metrics
  Response: { sent, delivered, opened, clicked, replied, failed, opt_out, open_rate, click_rate }

GET /campaigns/aggregated
  Response: { total_sent, total_delivered, total_opened, avg_open_rate, avg_click_rate }

GET /campaigns/contacts/{contact_id}/interactions
  Response: [{ campaign_id, event_type, timestamp }]
```

---

## Contact API

```
POST /contacts
  Request: { email, phone?, first_name?, last_name?, tags?: string[] }
  Response: { contact_id: string }

GET /contacts
  Query: limit?, offset?, tags?, opt_out?: boolean
  Response: { contacts: [], total: number }

GET /contacts/{contact_id}
  Response: { contact_id, email, phone, first_name, last_name, tags, opt_out, created_at }

DELETE /contacts/{contact_id}
  Response: { deleted: true }

POST /contacts/import
  Request: { contacts: [{ email, phone, first_name, last_name, tags }] }
  Response: { imported: number, failed: number, errors: [] }
```

---

## Quality API

```
POST /api/quality/track
  Request: { contact_id, response_type: "positive" | "negative" | "neutral", source: "email" | "sms" }
  Response: { tracked: true }

GET /api/quality/{contact_id}/score
  Response: { contact_id, response_rate: number, last_updated: string }
```

---

## Test Providers API

```
POST /api/test/email
  Request: { to: string, subject: string, body: string }
  Response: { message_id: string, provider: "brevo" }

POST /api/test/sms
  Request: { to: string, message: string }
  Response: { message_id: string, provider: "twilio", mock: boolean }

GET /api/test/status
  Response: { email: { provider: "brevo", status: "ok" }, sms: { provider: "twilio", mock: boolean } }
```