# Marketing Engine Pricing & Cost Structure

**Document Type:** Internal Reference  
**Last Updated:** April 2026  
**Status:** Pending provider integration

---

## Overview

This document outlines the internal cost structure and customer-facing pricing for the Marketing Engine. It serves as the single source of truth for all pricing calculations.

**Key Principles:**
- Customer-facing pricing hides internal margins
- Premium tiers positioned by value, not by contact count
- Quality weights tracked internally, not shown to customers

---

## 1. Provider Costs (Your Actual Costs)

### Email Providers

| Provider | Best For | Estimated Cost | Notes |
|----------|---------|----------------|-------|
| Mailchimp | Startups | $0.001-0.003/email | Free tier available |
| Amazon SES | High volume | $0.0001/email | Pay-per-use |
| SendGrid | Enterprise | $0.002-0.005/email | Good deliverability |
| ConvertKit | Creators | $0.003-0.008/email | Automation focus |

**Recommended:** Start with Mailchimp (free up to 500 contacts), migrate to Amazon SES at scale.

### SMS Providers

| Provider | Estimated Cost | Notes |
|----------|----------------|-------|
| Twilio | $0.007-0.015/sms | Most reliable |
| Plivo | $0.005-0.012/sms | Cost-effective |
| ClickSend | $0.02-0.04/sms | Simple dashboard |

**Recommended:** Twilio for reliability.

### Target Provider Costs (Update when integrated)

| Channel | Your Cost Per Message | Provider |
|---------|---------------------|----------|
| Email | $_____ | _____ |
| SMS | $_____ | _____ |

---

## 2. Internal Cost Calculations

### Per-Contact Cost Formula

```
internalCost = (contacts × costPerMessage × sendsPerCampaign)
```

### Current Internal Costs

| Channel | Cost Per Message | Sends | Total Per Contact |
|---------|------------------|-------|-------------------|
| Email | $0.004 | 4 | $0.016 |
| SMS | $0.012 | 4 | $0.048 |

---

## 3. Customer-Facing Pricing

### Base Pricing (Per Contact, Per Send)

| Channel | Display Price | Internal Cost | Your Margin |
|---------|--------------|---------------|------------|
| Email | $0.008 | $0.004 | $0.004 (50%) |
| SMS | $0.025 | $0.012 | $0.013 (52%) |

### Package Tiers

| Package | Sends | Markup | Price/Contact | Internal Cost |
|---------|-------|--------|---------------|---------------|
| Starter | 2 | 1.5x | $0.012 | $0.008 |
| Growth | 4 | 2.0x | $0.016 | $0.008 |
| Premium | 4 | 2.5x | $0.020 | $0.008 |

**Note:** Premium markup covers quality targeting overhead (not shown to customer).

---

## 4. Addon Pricing

### Template Addons

| Tier | Your Cost | Customer Price | Your Margin |
|------|-----------|----------------|-------------|
| Basic | $0 | $0 | $0 |
| Enhanced | $15 | $50 | $35 (70%) |
| Premium | $40 | $150 | $110 (73%) |

### Duration (Sends) Multiplier

| Duration | Sends | Multiplier | Notes |
|----------|-------|-----------|-------|
| Weekly | 4 | 1.0x | Base (default) |
| Bi-Weekly | 2 | 0.6x | 40% discount |
| Monthly | 1 | 0.4x | 60% discount |
| Quarterly | 1 | 0.25x | 75% discount |

---

## 5. Quality Weight System (Internal Only)

### Tier Multipliers

| Quality Tier | Multiplier | Description |
|-------------|-----------|-------------|
| Standard | 1.0x | New/untested contacts |
| Responsive | 1.3x | Past engagement |
| High-Value | 1.6x | Proven converters |

### Pricing Impact (Hidden)

```
effectiveCost = baseCost × qualityTier
displayPrice = basePrice × qualityTier  (hidden from customer)
```

### Premium Tier Logic

- **Early Stage:** No quality data; Premium = same base rate + "targeting" premium
- **Accumulating:** Use proxy signals (profile completeness, recency)
- **Mature:** Full quality scoring based on response history

---

## 6. Channel Mix Logic (Internal Only)

### "Both" Channel Selection

When customer selects email + SMS:

```
If contact has both email AND phone:
  - Charge for ONE message (lower of the two channels)
  - Route to best-performing channel per contact
  
If contact has only email:
  - Send email only (email price)
  
If contact has only phone:
  - Send SMS only (SMS price)
```

### Contact Types

| Type | Definition | Charge |
|------|------------|--------|
| Email-only | Has email, no phone | Email rate |
| Phone-only | Has phone, no email | SMS rate |
| Hybrid | Has both email + phone | Lower rate (one message) |

---

## 7. Sample Calculations

### Example 1: Growth Package, 500 contacts, Email only

```
Internal Calculation:
─────────────────────
Contacts: 500
Sends: 4
Cost: 500 × $0.004 × 4 = $8.00

Customer Price:
─────────────────────
Base: 500 × $0.008 × 4 = $16.00
─────────────────────
Total: $16.00
Your Margin: $8.00 (50%)
```

### Example 2: Premium Package, 500 contacts, Both channels, Enhanced template

```
Internal Calculation:
─────────────────────
Contacts: 500 (assume 40% hybrid, 60% email-only)
Hybrid: 500 × 0.4 × $0.008 × 4 = $6.40
Email-only: 500 × 0.6 × $0.008 × 4 = $9.60
Template: $15.00
─────────────────────
Internal Cost: $31.00

Customer Price:
─────────────────────
Base: 500 × $0.020 × 4 = $40.00
Template: $50.00
─────────────────────
Total: $90.00
Your Margin: $59.00 (65.5%)
```

---

## 8. Receipt Detail Structure

### Customer-Facing Receipt (per specs)

```
┌─────────────────────────────────────────────────────────┐
│                    PAYMENT RECEIPT                       │
├─────────────────────────────────────────────────────────┤
│ Campaign: [Campaign Name]                             │
│ Request ID: [SES-XXXXX]    Date: [Date]              │
│ Payment ID: [PAY-XXXXX]    Status: COMPLETED         │
├─────────────────────────────────────────────────────────┤
│ CAMPAIGN DETAILS                                      │
│ Package:        [Package Tier]                        │
│ Duration:       [Duration] ([sends] sends)           │
│ Total Contacts: [X,XXX] contacts                     │
│ Channel:       [Email/SMS/Both - routing method]     │
├─────────────────────────────────────────────────────────┤
│ COST BREAKDOWN                                        │
│ Base Package ([Tier]):        $[$,$$$.$$]            │
│ Template Upgrade ([Tier]):    $[$,$$$.$$]            │
│ ────────────────────────────────────────────────────  │
│ TOTAL:                         $[$,$$$.$$]           │
│ Equivalent (JMD):              J$[$,$$$.$$]         │
├─────────────────────────────────────────────────────────┤
│ PAYMENT METHOD                                         │
│ [Method] - [Details]                                │
└─────────────────────────────────────────────────────────┘
```

---

## 9. Configuration File

All pricing should be centralized in:
```
apps/frontend/src/lib/pricing.ts
```

Update this file when:
- Provider costs change
- Margins need adjustment
- New addons added

---

## 10. Action Items

- [ ] Integrate email provider and update costs
- [ ] Integrate SMS provider and update costs  
- [ ] Build pricing.ts configuration file
- [ ] Add quality weight logic to contacts system
- [ ] Configure channel routing rules
- [ ] Test margin calculations

---

**Document Owner:** Internal  
**Review Cycle:** Quarterly or after provider change