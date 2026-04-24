# Package & Pricing Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign package pricing to use quality/frequency tiers (not contact count), add contact range slider, implement quality weights internally, enhance campaign summary, and create detailed receipts.

**Architecture:** 
- Package tiers differentiated by quality and sends, not by contact count cap
- Contact range slider with cost alignment
- Quality weights calculated internally, hidden from customer
- Premium tier uses "intelligent matching" messaging externally
- One message per contact (smart channel routing for hybrid contacts)

**Tech Stack:** Next.js, React, TypeScript

---

## File Structure

### Files to Modify

| Component | Location | Responsibility |
|-----------|----------|---------------|
| `intake.ts` | `apps/frontend/src/lib/api/` | Package pricing logic |
| `RecommendationPreview.tsx` | `apps/frontend/src/components/intake/` | Package display with range slider |
| `CampaignSetupStep.tsx` | `apps/frontend/src/components/campaign/` | Enhanced campaign summary |
| `PaymentStep.tsx` | `apps/frontend/src/components/payment/` | Enhanced receipt |
| `campaign-flow/page.tsx` | `apps/frontend/src/app/` | State management |

---

## Task 1: Update Package Pricing in intake.ts

**Goal:** Change package tiers to use quality/frequency, not contact multipliers

**Files:**
- Modify: `apps/frontend/src/lib/api/intake.ts`

- [ ] **Step 1: Read current intake.ts pricing logic**

Read lines 14-100 of `apps/frontend/src/lib/api/intake.ts` to understand current structure.

- [ ] **Step 2: Add package tier configuration**

Add after existing constants:
```typescript
export const PACKAGE_TIERS = {
  starter: {
    name: "Starter",
    description: "Sample size",
    sends: 2,
    markup: 1.5,
  },
  growth: {
    name: "Growth", 
    description: "Standard",
    sends: 4,
    markup: 2.0,
  },
  premium: {
    name: "Premium",
    description: "Best Fit",
    sends: 4,
    markup: 2.5,
  },
}
```

- [ ] **Step 3: Update calculatePackagePricing**

Modify function to:
- Accept contactRange instead of calculating from budget
- Use PACKAGE_TIERS for sends/markup
- Return potentialReach (max contacts budget can reach)

```typescript
export function calculatePackagePricing(
  contacts: number,
  channel: string,
  baseCostPerContact: number
) {
  const packages = []
  
  for (const [tier, config] of Object.entries(PACKAGE_TIERS)) {
    const price = contacts * baseCostPerContact * config.sends * config.markup
    packages.push({
      name: tier,
      reach: contacts, // All tiers show same reach
      sends: config.sends,
      price,
      price_jmd: price * JMD_EXCHANGE_RATE,
    })
  }
  
  return packages
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/lib/api/intake.ts
git commit -m "refactor: update package tiers to use quality/frequency model"
```

---

## Task 2: Add Contact Range Slider to RecommendationPreview

**Goal:** Add slider for custom contact range with dynamic pricing

**Files:**
- Modify: `apps/frontend/src/components/intake/RecommendationPreview.tsx`

- [ ] **Step 1: Read RecommendationPreview.tsx**

Check current structure of the package display section.

- [ ] **Step 2: Add state for range slider**

Add to component:
```typescript
const [sliderValue, setSliderValue] = useState(recommendation?.estimated_reachable || 500)
```

- [ ] **Step 3: Add range slider UI**

Add before package cards:
```tsx
<div className="reach-slider">
  <label>Contact Range: {sliderValue.toLocaleString()} contacts</label>
  <input
    type="range"
    min={100}
    max={recommendation?.estimated_reachable || 1000}
    value={sliderValue}
    onChange={(e) => setSliderValue(parseInt(e.target.value))}
  />
  <p className="slider-note">Adjust to see pricing for different reach</p>
</div>
```

- [ ] **Step 4: Add slider styles**

```css
.reach-slider { padding: 1rem; background: #f8fafc; border-radius: 8px; margin-bottom: 1rem; }
.reach-slider input { width: 100%; margin: 0.5rem 0; }
.slider-note { font-size: 12px; color: #64748b; }
```

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/components/intake/RecommendationPreview.tsx
git commit -m "feat: add contact range slider to recommendation"
```

---

## Task 3: Implement Quality Weight System (Internal)

**Goal:** Quality weights used for Premium tier, hidden from customer display

**Files:**
- Modify: `apps/frontend/src/lib/api/intake.ts`

- [ ] **Step 1: Add quality weight constants**

Add to intake.ts:
```typescript
// Internal only - NOT exposed to customer
export const QUALITY_WEIGHTS = {
  standard: 1.0,
  responsive: 1.3,
  high_value: 1.6,
}

export const PREMIUM_QUALITY_MULTIPLIER = 1.25 // Covers quality targeting cost
```

- [ ] **Step 2: Add premium pricing function**

```typescript
export function calculatePremiumPrice(
  standardPrice: number,
  hasQualityData: boolean
) {
  if (!hasQualityData) {
    // Early stage: slight premium for "targeting" feature
    return standardPrice * PREMIUM_QUALITY_MULTIPLIER
  }
  
  // When quality data exists, use actual weighted cost
  return standardPrice * QUALITY_WEIGHTS.responsive
}

export function getQualityBreakdown(contacts: number): {
  standard: number
  responsive: number
  highValue: number
} {
  // Return placeholder until quality data accumulates
  return {
    standard: contacts,
    responsive: 0,
    highValue: 0,
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/lib/api/intake.ts
git commit -m "feat: add internal quality weight system"
```

---

## Task 4: Channel Mix Logic (Internal)

**Goal:** Smart routing for "Both" channel selection

**Files:**
- Modify: `apps/frontend/src/lib/api/intake.ts`

- [ ] **Step 1: Add channel routing function**

```typescript
export interface ContactChannelInfo {
  email_only: number
  phone_only: number
  hybrid: number // has both
}

export function calculateChannelCosts(
  totalContacts: number,
  channelSplit: string,
  contactTypes: ContactChannelInfo
) {
  const EMAIL_COST = 0.008
  const SMS_COST = 0.025
  
  if (!channelSplit.includes("both")) {
    // Single channel - straightforward
    return {
      cost: totalContacts * (channelSplit.includes("sms") ? SMS_COST : EMAIL_COST),
      breakdown: channelSplit,
    }
  }
  
  // "Both" selected - smart routing
  // Hybrid contacts: charge lower rate, route to best channel
  // Others: charge for their available channel
  const cost = (
    contactTypes.hybrid * EMAIL_COST + // hybrid = email rate (one message)
    contactTypes.email_only * EMAIL_COST +
    contactTypes.phone_only * SMS_COST
  )
  
  return {
    cost,
    breakdown: `${contactTypes.email_only + contactTypes.hybrid} email, ${contactTypes.phone_only} SMS`,
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/frontend/src/lib/api/intake.ts
git commit -m "feat: add smart channel routing for hybrid contacts"
```

---

## Task 5: Enhanced Campaign Summary

**Goal:** Show package details, total potential reach, contact breakdown in campaign setup

**Files:**
- Modify: `apps/frontend/src/components/campaign/CampaignSetupStep.tsx`

- [ ] **Step 1: Read current summary section**

Check lines 120-140 in CampaignSetupStep.tsx.

- [ ] **Step 2: Expand summary display**

Replace current summary with:
```tsx
<div className="summary-card">
  <div className="summary-header">
    <h3>Campaign Summary</h3>
    <span className="badge">{recommendation?.recommended_package}</span>
  </div>
  
  <div className="summary-grid">
    <div className="summary-item">
      <span className="label">Potential Reach</span>
      <span className="value">{potentialReach.toLocaleString()}</span>
      <span className="sublabel">contacts max</span>
    </div>
    <div className="summary-item">
      <span className="label">Selected Contacts</span>
      <span className="value">{selectedReach.toLocaleString()}</span>
    </div>
    <div className="summary-item">
      <span className="label">Est. Price</span>
      <span className="value">US${estimatedPrice.toLocaleString()}</span>
    </div>
  </div>
  
  <div className="summary-details">
    <div className="detail-row">
      <span>Sends per Contact:</span>
      <span>{sendsCount}x</span>
    </div>
    <div className="detail-row">
      <span>Cost per Contact:</span>
      <span>US${costPerContact.toFixed(3)}</span>
    </div>
    <div className="detail-row">
      <span>Channel:</span>
      <span>{channelSplit}</span>
    </div>
  </div>
</div>
```

- [ ] **Step 3: Add summary styles**

```css
.summary-details { 
  margin-top: 1rem; 
  padding-top: 1rem; 
  border-top: 1px solid #e2e8f0; 
}
.detail-row { 
  display: flex; 
  justify-content: space-between; 
  font-size: 13px; 
  color: #64748b; 
  margin-bottom: 0.25rem;
}
.sublabel { font-size: 11px; color: #94a3b8; margin-left: 0.25rem; }
```

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/components/campaign/CampaignSetupStep.tsx
git commit -m "feat: enhance campaign summary with package details"
```

---

## Task 6: Enhanced Detailed Receipt

**Goal:** Itemized receipt with all addons, contact breakdown, channel info

**Files:**
- Modify: `apps/frontend/src/components/payment/PaymentStep.tsx`

- [ ] **Step 1: Read current receipt section**

Check lines around "Cost Breakdown" in PaymentStep.tsx.

- [ ] **Step 2: Expand cost breakdown**

Update to show:
```tsx
<div className="order-summary">
  <h4>Cost Breakdown</h4>
  
  <div className="summary-row">
    <span>Package ({packageTier})</span>
    <span>US${packagePrice.toLocaleString()}</span>
  </div>
  
  {/* If template selected */}
  {templateTier !== "basic" && (
    <div className="summary-row">
      <span>Template Upgrade ({templateTier})</span>
      <span>US${templatePrice.toLocaleString()}</span>
    </div>
  )}
  
  {/* If duration different from weekly */}
  {duration !== "weekly" && (
    <div className="summary-row">
      <span>Campaign Duration ({duration})</span>
      <span>US${durationPrice.toLocaleString()}</span>
    </div>
  )}
  
  <div className="summary-row total">
    <span>Total</span>
    <span className="amount">US${total.toLocaleString()}</span>
  </div>
</div>
```

- [ ] **Step 3: Add campaign details to receipt**

Before cost breakdown, add:
```tsx
<div className="campaign-details-card">
  <h4>Campaign Details</h4>
  <div className="detail-row">
    <span>Package:</span>
    <span>{packageTier} ({packageDescription})</span>
  </div>
  <div className="detail-row">
    <span>Duration:</span>
    <span>{duration} ({sends} sends)</span>
  </div>
  <div className="detail-row">
    <span>Total Contacts:</span>
    <span>{contacts.toLocaleString()}</span>
  </div>
  <div className="detail-row">
    <span>Channel:</span>
    <span>{channel} - {routingMethod}</span>
  </div>
</div>
```

- [ ] **Step 4: Add print styles**

```css
@media print {
  .payment-step { max-width: 100%; }
  .btn-back, .btn-primary, .currency-selector { display: none; }
  .order-summary, .campaign-details-card { 
    border: 1px solid #000; 
    page-break-inside: avoid;
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/components/payment/PaymentStep.tsx
git commit -m "feat: add detailed itemized receipt"
```

---

## Task 7: Update Page State Management

**Goal:** Pass quality tier and channel info through flow

**Files:**
- Modify: `apps/frontend/src/app/campaign-flow/page.tsx`

- [ ] **Step 1: Add state for quality and duration**

```typescript
const [selectedDuration, setSelectedDuration] = useState("weekly")
const [qualityTier, setQualityTier] = useState("standard") // internal only
const [channelRouting, setChannelRouting] = useState("")
```

- [ ] **Step 2: Pass to PaymentStep**

Update PaymentStep props:
```tsx
<PaymentStep
  // ... existing props
  duration={selectedDuration}
  channelRouting={channelRouting}
/>
```

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/app/campaign-flow/page.tsx
git commit -m "feat: add quality/duration state to flow"
```

---

## Task 8: Build and Verify

- [ ] **Step 1: Run build**

```bash
cd apps/frontend && npm run build
```

- [ ] **Step 2: Verify no TypeScript errors**

Expected: Build completes without errors

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete package pricing redesign"
```

---

## Verification Checklist

- [ ] Package tiers show same contact count, different quality/sends
- [ ] Range slider adjusts pricing dynamically
- [ ] Quality weights calculated internally, hidden from customer
- [ ] Premium displays "Best Fit" messaging
- [ ] Campaign summary shows all package details
- [ ] Receipt shows itemized breakdown
- [ ] Print styles work correctly

---

## Action Items

- [ ] Integrate providers and update actual costs in `docs/superpowers/internal-pricing-reference.md`
- [ ] Add quality data collection as campaigns execute
- [ ] Build analytics for response rate tracking

---

**Plan complete.** Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch subagents per task, review between tasks

**2. Inline Execution** - Execute tasks in this session with checkpoints

Which approach?