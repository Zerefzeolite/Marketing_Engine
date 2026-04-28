# AI Marketing Engine - Project Handoff Document

**Date**: 2026-04-26  
**Status**: Phase 8 (Pilot Launch Ready)  
**Repository**: https://github.com/Zerefzeolite/Marketing_Engine  
**Latest Commit**: `f675d78` (Documentation & Maintenance Skill)

---

## 1. PROJECT OVERVIEW

### Tech Stack
| Layer | Technology |
|-------|------------|
| Backend | Python FastAPI |
| Frontend | Next.js 16 (React, TypeScript) |
| Email | Brevo (Sendinblue) - **LIVE** |
| SMS | Twilio - **MOCK MODE** (account suspended) |
| Storage | JSON files (dev), PostgreSQL-ready |
| Testing | Pytest (backend) + Vitest (frontend) |

### Quick Start
```bash
# Backend
cd apps/backend
pip install -r requirements.txt
cp .env.example .env  # Add API keys
python -m uvicorn app.main:app --reload --port 8000

# Frontend
cd apps/frontend
npm install
npm run dev  # http://localhost:3000

# API Docs
http://localhost:8000/docs
```

---

## 2. COMPLETE APPLICATION FLOW

```
┌──────────────────┐
│  1. INTAKE FORM (/intake)                    │
│     User enters: business_name, target_audience,   │
│     campaign_objective, preferred_channel          │
└───────────────┬─────────────────────────────────┘
                ▼
┌──────────────────┐
│  2. RECOMMENDATION PREVIEW                  │
│     AI suggests: package_tier, estimated_price    │
│     User adjusts: contact range (slider)           │
└───────────────┬─────────────────────────────────┘
                ▼
┌──────────────────┐
│  3. CONSENT (/campaign-flow)                 │
│     User accepts: terms, marketing, data_processing│
└───────────────┬─────────────────────────────────┘
                ▼
┌──────────────────┐
│  4. CAMPAIGN SETUP                        │
│     Select: template_tier, package, duration      │
└───────────────┬─────────────────────────────────┘
                ▼
┌──────────────────┐
│  5. MODERATION CHECK                      │
│     AI check: safety_score, audience_match        │
│     ├─ PASS → proceed                         │
│     ├─ REVISION → revise & retry              │
│     └─ 3rd FAIL → Manual Review offered       │
└───────────────┬─────────────────────────────────┘
                ▼
┌──────────────────┐
│  6. MANUAL REVIEW (if triggered)             │
│     Admin reviews at /admin/reviews              │
│     ├─ APPROVE → proceed                      │
│     └─ REJECT → campaign cancelled             │
└───────────────┬─────────────────────────────────┘
                ▼
┌──────────────────┐
│  7. PAYMENT SUBMISSION                     │
│     Select method, submit payment                │
│     Upload receipt (bank transfer/cash)          │
└───────────────┬─────────────────────────────────┘
                ▼
┌──────────────────┐
│  8. PAYMENT VERIFICATION (Admin)            │
│     Verify receipt, approve/reject               │
│     [DEV] Auto-approve button available         │
└───────────────┬─────────────────────────────────┘
                ▼
┌──────────────────┐
│  9. CAMPAIGN EXECUTION                    │
│     Dispatch: Email (Brevo) + SMS (Twilio mock)│
└───────────────┬─────────────────────────────────┘
                ▼
┌──────────────────┐
│  10. ANALYTICS (/analytics)                  │
│      Track: sent, delivered, opened, clicked    │
│      Monitor: costs, health, channels             │
└──────────────────┘
```

---

## 3. FIELDS & LOGISTICS BY STAGE

### 3.1 Intake Form (`/intake`)

**User Input Fields:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `business_name` | string | ✅ | Displayed in recommendations |
| `target_audience` | string | ✅ | Used for audience matching |
| `campaign_objective` | string | ✅ | "Awareness", "Sales", etc. |
| `preferred_channel` | string | ✅ | "email", "sms", or "both" |
| `estimated_budget` | number | ❌ | Optional budget cap |
| `budget_max` | number | ❌ | Max budget for pricing calc |

**Auto-Generated Fields:**
| Field | Source | Logic |
|-------|--------|-------|
| `request_id` | Backend | Format: `REQ-xxxxxxxx` |
| `estimated_reachable` | `calculatePackagePricing()` | Based on audience + channel |
| `channel_split` | User input | "email:100%", "sms:100%", or "email:60%, sms:40%" |
| `confidence` | Backend | 0.0–1.0 (AI confidence score) |

**Logistics:**
- Frontend: `IntakeForm.tsx` → `RecommendationPreview.tsx`
- Backend: `POST /intake/submit` → `intake_service.py`
- Data stored in: `sessions.json` (key: `request_id`)

---

### 3.2 Recommendation Preview

**Displayed Fields:**
| Field | Source | Notes |
|-------|--------|-------|
| `recommended_package` | Backend AI | "starter", "growth", "premium" |
| `estimated_price` (USD) | `calculatePackagePricing()` | Base price |
| `estimated_price_jmd` | Price × 155 | JMD equivalent |
| `package_options[]` | Dynamic calc | Array of tier options |
| `confidence` | Backend | Shown as percentage |

**Slider Logic (Contact Range):**
| Property | Value |
|-----------|-------|
| Min | 100 contacts |
| Max | `max(estimated_reachable, sliderValue) × 2` |
| Step | 10 |
| Recalculates | `packageOptions` via `calculatePackagePricing()` |

**Pricing Recalculation Trigger:**
```
sliderValue changes
    ↓
useMemo() hook fires
    ↓
calculatePackagePricing(sliderValue, channel, duration)
    ↓
Returns updated packageOptions[] with new reach/pricing
```

---

### 3.3 Consent (`/campaign-flow`)

**Fields Collected:**
| Field | Type | Notes |
|-------|------|-------|
| `request_id` | string | From intake |
| `consent_to_marketing` | boolean | ✅ Required |
| `terms_accepted` | boolean | ✅ Required |
| `data_processing_consent` | boolean | ✅ Required |

**Logistics:**
- Endpoint: `POST /consent/record`
- Stored in: `consents.json`
- Blocks flow if not all `true`

---

### 3.4 Campaign Setup

**Fields Collected:**
| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `package_tier` | "starter" \| "growth" \| "premium" | From recommendation | Determines sends & markup |
| `template_tier` | "basic" \| "enhanced" \| "premium" | "basic" | Upgraded if above package level |
| `campaign_duration` | "weekly" \| "biweekly" \| "monthly" | "monthly" | Affects number of sends |
| `sends` | number | 4 (monthly) | 4 (monthly), 2 (biweekly), 1 (weekly) |

**Template Tier Logic:**
```typescript
Package Level: starter=1, growth=2, premium=3
Template Level: basic=1, enhanced=2, premium=3

needsUpgrade = templateTierLevel > packageLevel
upgradeCost = templateTier === "enhanced" ? $50 : $150
```

**Logistics:**
- Component: `CampaignSetupStep.tsx`
- Data saved to: `sessions.json` (under `session_id`)

---

### 3.5 Moderation Check

**Fields Sent to API:**
| Field | Source | Value Range |
|-------|--------|-----------|
| `campaign_session_id` | Session | `REQ-xxxxxxxx` |
| `campaign_id` | Session | `CMP-xxxxxxxx` |
| `safety_score` | Mock/AI | 0–100 |
| `audience_match_score` | Mock/AI | 0–100 |

**Decision Outcomes:**
| Decision | Meaning | Next Step |
|-----------|---------|------------|
| `PASS` | Approved | Proceed to Payment |
| `REVISION_REQUIRED` | Needs changes | Revise & retry (count increments) |
| `MANUAL_REVIEW_OFFERED` | 3rd failure | User can accept manual review |

**Failed Attempts Tracking:**
```python
session["ai_attempt_count"] += 1

if ai_attempt_count >= 3:
    return "MANUAL_REVIEW_OFFERED"
```

**Logistics:**
- Endpoint: `POST /campaigns/moderation/check`
- State managed by: `moderationPhase.ts`

---

### 3.6 Manual Review

**User Choice:**
| Action | API Call | Result |
|--------|-----------|--------|
| Accept | `POST /campaigns/moderation/manual-review/request` with `accepted: true` | Status → `UNDER_MANUAL_REVIEW`, Ticket ID generated |
| Reject | Same endpoint with `accepted: false` | Status → `DRAFT_HELD`, 12hr expiry |

**Admin Decision (at `/admin/reviews`):**
| Action | Endpoint | Result |
|--------|-----------|--------|
| Approve | `POST /campaigns/moderation/manual-review/decision` with `decision: "approved"` | Status → `APPROVED` |
| Reject | Same with `decision: "rejected"` | Status → `REJECTED` |

**Ticket Format:** `MREV-XXXX` (generated by `uuid4().hex[:4].upper()`)

---

### 3.7 Payment Submission

**Fields Collected:**
| Field | Type | Notes |
|-------|------|-------|
| `request_id` | string | From session |
| `amount` | number | `packagePrice + templateUpgradeCost` |
| `method` | enum | `LOCAL_BANK_TRANSFER`, `CASH`, `STRIPE`, `PAYPAL` |
| `auto_approve` | boolean | Dev mode only |

**Package Price Calculation:**
```typescript
const totalUSD = packagePrice + templateUpgradeCost
const totalJMD = packagePriceJMD + templateUpgradeCostJMD
```

**Payment Methods & Logistics:**
| Method | Instructions Shown | Receipt Required? | Wait Time |
|--------|---------------------|-------------------|-----------|
| `LOCAL_BANK_TRANSFER` | NCB account details | ✅ Yes | 24–48 hours |
| `CASH` | NCB branch deposit | ✅ Yes | 24–48 hours |
| `STRIPE` | "Coming soon" | ❌ No | Instant (future) |
| `PAYPAL` | "Coming soon" | ❌ No | Instant (future) |

**Dev Mode Shortcut:**
- Button: `[DEV] Auto-Approve Payment`
- Sets `auto_approve: true` → payment status = `APPROVED` immediately

---

### 3.8 Payment Verification (Admin)

**Receipt Upload:**
- Endpoint: `POST /payments/upload-receipt/{payment_id}`
- Body: `multipart/form-data` with `file` field
- OCR extraction: simulated (returns mock data)

**Admin Verification:**
| Action | Endpoint | Status Change |
|--------|-----------|---------------|
| Approve | `POST /payments/verify` with `action: "approve"` | `PENDING` → `APPROVED` |
| Reject | Same with `action: "reject"` | `PENDING` → `REJECTED` |

---

### 3.9 Campaign Execution

**Dispatch Logic:**
| Channel | Provider | Mode | Logic |
|---------|----------|------|-------|
| Email | Brevo (Sendinblue) | Live | `email_service.py` → Brevo API |
| SMS | Twilio | **Mock Mode** | `sms_service.py` → logs only |

**Execution Flow:**
```
1. User clicks "Execute Campaign"
    ↓
2. POST /campaigns/execute
    ↓
3. Backend iterates contacts from contacts.json
    ↓
4. For each contact:
   - Email: send_email() via Brevo
   - SMS: send_sms() via Twilio (mock)
    ↓
5. Record events: POST /campaigns/{id}/events
   - Types: SENT, DELIVERED, FAILED, OPENED, CLICKED, REPLIED, OPT_OUT
    ↓
6. Update campaign_metrics.json
```

**Events Recorded:**
| Event | Trigger | Affects Metric |
|-------|--------|----------------|
| `SENT` | Message dispatched | `sent++` |
| `DELIVERED` | Confirmed delivery | `delivered++` |
| `OPENED` | Email opened | `opened++`, `open_rate` |
| `CLICKED` | Link clicked | `clicked++`, `click_rate` |
| `REPLIED` | User replied | `replied++` |
| `FAILED` | Delivery failed | `failed++` |
| `OPT_OUT` | Unsubscribed | `opt_out++` |

---

### 3.10 Analytics Dashboard (`/analytics`)

**Tabs & Metrics:**

| Tab | Metrics Shown |
|-----|----------------|
| **Reach** | Total sent, delivered, delivery rate |
| **Channels** | Email vs SMS performance breakdown |
| **Costs** | USD/JMD spend, cost per contact |
| **Health** | Open rate, click rate, failure rate |

**Data Fetching:**
| Metric | Endpoint |
|--------|----------|
| Campaign metrics | `GET /campaigns/{id}/metrics` |
| All campaigns | `GET /campaigns/aggregated` |
| Contact interactions | `GET /campaigns/contacts/{id}/interactions` |

---

## 4. PRICING LOGIC (Detailed)

### 4.1 Base Pricing Formula

```
Provider Cost (per contact):
  Email: $0.008 USD (Brevo)
  SMS:   $0.025 USD (Twilio)

Markup (by package tier):
  Starter: 1.5x
  Growth:  2.0x
  Premium: 2.5x

Package Price = reach × provider_cost × markup
```

### 4.2 Example Calculation

```
User selects: 1,000 contacts, Email, Growth tier

Provider cost = 1000 × $0.008 = $8.00
Markup = 2.0x
Base price = $8.00 × 2.0 = $16.00

If template = "enhanced" (and package < 2):
  Upgrade cost = $50.00
  Total = $66.00

If template = "premium" (and package < 3):
  Upgrade cost = $150.00
  Total = $166.00
```

### 4.3 Sends Multiplier

```
Duration: Weekly   → sends = 1 (per month)
Duration: Biweekly → sends = 2 (per month)
Duration: Monthly  → sends = 4 (per month)

Total messages = reach × sends
Total cost = package_price × sends
```

### 4.4 JMD Conversion

```
Exchange rate: 1 USD = 155 JMD

price_jmd = price_usd × 155
```

### 4.5 Package Tiers

| Tier | Sends Multiplier | Markup | Use Case |
|------|------------------|--------|----------|
| Starter | 2 | 1.5x | Sample/testing |
| Growth | 4 | 2.0x | Standard campaigns |
| Premium | 4 | 2.5x | High-value campaigns |

### 4.6 Template Upgrade Costs

| Current Package | Template Tier | Upgrade Cost (USD) | Upgrade Cost (JMD) |
|-----------------|----------------|----------------------|---------------------|
| Starter | Enhanced | $50 | $8,000 |
| Starter/Growth | Premium | $150 | $24,000 |
| Growth/Premium | No upgrade needed | $0 | $0 |

---

## 5. KEY FILES FOR HANDOFF

| File | Purpose |
|------|---------|
| `README.md` | Project overview & quick start |
| `docs/TECHNICAL_DOCUMENTATION.md` | Full technical reference |
| `docs/obsidian/SKILL.md` | **Maintenance guidelines (READ FIRST)** |
| `docs/obsidian/151 - API Endpoints.md` | API reference |
| `docs/obsidian/152 - Database Schema.md` | Data models |
| `docs/obsidian/153 - Coding Dictionary.md` | Terminology |
| `CLAUDE.md` / `AGENTS.md` | Agent instructions |

---

## 6. NEXT PRIORITIES (For Next Developer)

### 🔴 Critical
- [ ] **Fix Twilio account** — Resolve suspension or switch SMS provider
- [ ] **Clean repository** — Remove `__pycache__`, temp files, update `.gitignore`
- [ ] **Production payment** — Integrate Stripe/PayPal (currently bank transfer only)

### 🟡 Important  
- [ ] **PostgreSQL migration** — Move from JSON files to real database
- [ ] **Contact management UI** — Build frontend for contact lists
- [ ] **Security audit** — Ensure no secrets, add pre-commit hooks

### 🟢 Enhancements
- [ ] **A/B testing** for campaigns
- [ ] **Automated reporting** (email reports to clients)
- [ ] **Webhook integrations** (payment confirmations)
- [ ] **Deployment guide** — Docker, CI/CD

---

## 7. HANDOFF CHECKLIST

- [ ] Clone repo: `git clone https://github.com/Zerefzeolite/Marketing_Engine.git`
- [ ] Backend setup: `cd apps/backend && pip install -r requirements.txt`
- [ ] Create `apps/backend/.env` with:
  ```
  BREVO_API_KEY=your_key
  TWILIO_ACCOUNT_SID=your_sid
  TWILIO_AUTH_TOKEN=your_token
  ```
- [ ] Frontend setup: `cd apps/frontend && npm install`
- [ ] Create `apps/frontend/.env.local` with:
  ```
  NEXT_PUBLIC_API_URL=http://localhost:8000
  ```
- [ ] Run backend: `python -m uvicorn app.main:app --reload --port 8000`
- [ ] Run frontend: `npm run dev` (port 3000)
- [ ] Read `docs/obsidian/SKILL.md` thoroughly
- [ ] Review open issues and prioritize next steps

---

**Project is functional and ready for production preparation.**  
Focus on fixing SMS delivery, cleaning repo, and adding production payment gateways.
