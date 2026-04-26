# Database Schema

## Storage Architecture

**Type**: JSON file-based (development)  
**Location**: `apps/backend/data/`  
**Pattern**: One JSON file per entity  
**Future**: PostgreSQL migration-ready

## Entity Schemas

### CampaignSession (`sessions.json`)

```typescript
interface CampaignSession {
  // Identifiers
  session_id: string;           // Format: REQ-xxxxxxxx
  client_email: string;
  
  // Campaign Details
  campaign_name: string;
  channel_split: string;        // "email: 100%" | "sms: 100%" | "email: 60%, sms: 40%"
  estimated_reachable: number;
  recommended_package: "starter" | "growth" | "premium";
  confidence: number;           // 0-1
  
  // Configuration
  package_tier: "starter" | "growth" | "premium";
  template_tier: "basic" | "enhanced" | "premium";
  
  // Moderation
  latest_moderation_decision: "PASS" | "REVISION_REQUIRED" | "MANUAL_REVIEW_OFFERED";
  ai_attempt_count: number;
  manual_review_ticket_id: string | null;  // Format: MREV-xxxx
  
  // Status
  status: "DRAFT" | "ACTIVE" | "UNDER_MANUAL_REVIEW" | "DRAFT_HELD" | "COMPLETED";
  
  // Timestamps
  expires_at: string | null;    // ISO 8601
  reminder_at: string | null;   // ISO 8601
  created_at: string;           // ISO 8601
  updated_at: string;           // ISO 8601
}
```

### Payment (`payments.json`)

```typescript
interface Payment {
  payment_id: string;           // Format: PAY-xxxxxxxx
  request_id: string;           // References CampaignSession.session_id
  amount: number;               // In cents (USD)
  amount_jmd: number;           // In JMD cents
  method: PaymentMethod;
  status: PaymentStatus;
  
  // Verification
  receipt_url: string | null;
  ocr_extracted: object | null;
  verified_at: string | null;   // ISO 8601
  admin_notes: string | null;
  
  // Metadata
  created_at: string;           // ISO 8601
}

enum PaymentMethod {
  LOCAL_BANK_TRANSFER = "LOCAL_BANK_TRANSFER";
  CASH = "CASH";
  STRIPE = "STRIPE";
  PAYPAL = "PAYPAL";
}

enum PaymentStatus {
  PENDING = "PENDING";
  APPROVED = "APPROVED";
  REJECTED = "REJECTED";
  COMPLETED = "COMPLETED";
}
```

### Contact (`contacts.json`)

```typescript
interface Contact {
  contact_id: string;           // Format: CNT-xxxxxxxx
  email: string;
  phone: string | null;
  first_name: string | null;
  last_name: string | null;
  tags: string[];
  source: "import" | "manual" | "api";
  opt_out: boolean;
  created_at: string;           // ISO 8601
}
```

### CampaignMetrics (`campaign_metrics.json`)

```typescript
interface CampaignMetrics {
  campaign_id: string;          // Format: CMP-xxxxxxxx
  session_id: string;           // References CampaignSession.session_id
  
  // Counts
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  replied: number;
  failed: number;
  opt_out: number;
  
  // Costs
  cost_usd: number;
  cost_jmd: number;
  
  // Period
  period_start: string;         // ISO 8601 date
  period_end: string;           // ISO 8601 date
}
```

### Consent (`consents.json`)

```typescript
interface Consent {
  request_id: string;           // References CampaignSession.session_id
  consent_to_marketing: boolean;
  terms_accepted: boolean;
  data_processing_consent: boolean;
  recorded_at: string;          // ISO 8601
}
```

### Execution (`executions.json`)

```typescript
interface Execution {
  execution_id: string;          // Format: EXEC-xxxxxxxx
  campaign_id: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
  contacts_attempted: number;
  contacts_delivered: number;
  errors: string[];
  started_at: string;           // ISO 8601
  completed_at: string | null;   // ISO 8601
}
```

### ContactInteraction (`contact_interactions.json`)

```typescript
interface ContactInteraction {
  contact_id: string;
  campaign_id: string;
  event_type: "SENT" | "DELIVERED" | "FAILED" | "OPENED" | "CLICKED" | "REPLIED" | "OPT_OUT";
  timestamp: string;            // ISO 8601
}
```

## Relationships

```
CampaignSession (1)
    │
    ├── payments (1) ──────────► Payment
    ├── consents (1) ──────────► Consent
    ├── executions (many) ─────► Execution
    └── contacts (many) ───────► Contact
                                    │
                                    └── interactions (many) ──► ContactInteraction
```

## Indexes (Future PostgreSQL)

```sql
-- Primary Keys
CREATE UNIQUE INDEX idx_session_id ON campaign_sessions(session_id);
CREATE UNIQUE INDEX idx_payment_id ON payments(payment_id);
CREATE UNIQUE INDEX idx_contact_id ON contacts(contact_id);

-- Foreign Keys
CREATE INDEX idx_payment_request ON payments(request_id);
CREATE INDEX idx_execution_campaign ON executions(campaign_id);
CREATE INDEX idx_interaction_contact ON contact_interactions(contact_id);

-- Queries
CREATE INDEX idx_sessions_status ON campaign_sessions(status);
CREATE INDEX idx_sessions_email ON campaign_sessions(client_email);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_contacts_opt_out ON contacts(opt_out);
```

## Migration Path

1. Export JSON files to CSV
2. Create PostgreSQL schema
3. Import data with ID mapping
4. Update service layer to use SQLAlchemy
5. Remove JSON file operations