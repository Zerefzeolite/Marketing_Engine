# Phase 4 Design: Campaign Generation, Payment Governance, and Controlled Distribution

## Scope and Intent

Phase 4 extends the current intake/payment foundation into a controlled campaign lifecycle where campaign content is generated and reviewed before payment and distribution. The system must prioritize safety, audience fit, manual oversight, and operational clarity while preserving local-first behavior and low-cost testing paths.

This phase includes:

- AI-assisted campaign template generation before payment
- AI + human moderation and approval gates
- Local and online payment paths with verification
- Session resume and draft expiry management
- Channel cadence controls (SMS/Email) with analytics tracking
- End-of-campaign reporting and optimization feedback

This phase excludes:

- Fully autonomous campaign approval and send
- Per-contact send-time optimization (deferred to later phase)
- Real WhatsApp provider integration (template/channel design supports it, adapter can remain stub in this phase)

## Product Rules (Authoritative)

1. Campaign content must be generated and approved before payment can proceed.
2. One campaign advertises one offer/objective at a time.
3. AI moderation runs pre-payment and returns safety and audience-fit scores.
4. AI retry cap is 3 revisions.
5. After 3 failed AI checks, user must be prompted to opt into manual review (never auto-create ticket).
6. If user declines manual review, campaign is saved as draft for 12 hours.
7. A draft reminder is sent 5 hours before expiry.
8. All payment methods require verification before distribution.
9. Human approval is required before distribution, even if AI score is acceptable.
10. Once manually approved, campaign content becomes locked and is not editable.
11. Locked approved campaigns skip repeat AI checks to conserve AI cost.
12. Payment link for manually reviewed campaigns is sent only after manual approval.
13. Campaign duration is client-defined.
14. Delivery status updates are sent during campaign runtime.
15. Post-campaign detailed analytics report is sent after campaign end.
16. Segment-level personalization is used in v1; per-contact timing optimization is deferred.

## User Journey

### 1) Session Start and Resume

- On campaign initiation, system issues `campaign_session_id` and resume URL.
- Resume reopening requires URL + email OTP.
- Session state is persisted with lifecycle timestamps.

### 2) Audience Inputs and Statistics Board

- Client inputs audience/contact requirements.
- System presents a statistics board (projected turnout/reach, estimated interactions, package fit signals).
- This board is shown before package selection to improve decision confidence.

### 3) Package Selection and Custom Path

- Client selects a standard package if projected reach falls within package limits.
- If requested contact volume exceeds package limits, client enters custom request flow:
  - System computes draft quote inputs from requested volume.
  - Admin receives custom request for review/approval.
  - Approved custom request receives payment instructions/link.

### 4) Creative Input and Template Generation

- Client uploads creative assets (image optional by channel, copy, offer details, CTA target intent).
- Client selects campaign medium/template (`sms`, `whatsapp`, `email`).
- AI generates draft template based on audience + brand objective.
- Client previews and confirms campaign draft.

### 5) AI Pre-Check Gate (Pre-Payment)

AI outputs:

- `safety_score`
- `audience_match_score`
- `risk_flags`
- `revision_guidance`

Decision behavior:

- Pass: continue to payment options.
- Fail (attempt < 3): require revision.
- Fail (attempt 3): show manual-review popup with SLA (30 minutes to 2 hours).

Manual-review popup choices:

- Proceed to manual review: create manual review ticket.
- Decline: save campaign as draft (12-hour expiry) and stop flow.

### 6) Draft Hold and Reminder

- Drafts that did not proceed to manual review are held for 12 hours.
- Reminder is sent 5 hours before expiry (T+7h from save event).
- Reminder includes resume link and options:
  - revise campaign
  - request manual review
  - discard campaign

### 7) Manual Review Path

- Reviewer sees AI scorecard + draft preview + audience inputs.
- Outcomes:
  - `MANUAL_APPROVED`: campaign locked, payment link/instructions sent.
  - `MANUAL_REJECTED`: client notified with human-written rejection reason.

### 8) Payment Methods and Verification

Supported methods:

- `LOCAL_BANK_TRANSFER`
- `CASH_DEPOSIT`
- `STRIPE_LINK` (sandbox first)
- `PAYPAL_LINK` (sandbox first)

Verification model:

- Bank/Cash: receipt upload + OCR extraction + admin verification.
- Stripe/PayPal: provider payment confirmation + internal verification review.
- All methods require verified status before send.

### 9) Distribution Gate and Dispatch

Campaign can dispatch only when all conditions are true:

- `payment_status = COMPLETED`
- `content_approval_status = APPROVED_BY_HUMAN`
- `campaign_lock = TRUE`

Dispatch cadence defaults:

- SMS: once every fortnight
- Email: once per week on randomized weekday

Cadence runs for the campaign duration selected by client.

### 10) Tracking and Learning

Track per-event:

- campaign id
- contact id
- channel
- send time
- open/click/interaction time
- target URL variant

v1 optimization policy:

- Segment-level timing/response insights only.
- Write interaction data to contact profiles for future evolution.

### 11) End-of-Campaign Reporting

- Send follow-up email report after campaign ends.
- Report includes:
  - delivery summary
  - interaction metrics (opens/clicks/replies by channel)
  - audience fit observations
  - timing performance insights
  - recommendations for next campaign strategy

## Data Model Additions

### CampaignSession

- `campaign_session_id`
- `client_id`
- `status` (`ACTIVE`, `DRAFT_HELD`, `EXPIRED`, `UNDER_MANUAL_REVIEW`, `APPROVED_LOCKED`, `PAID_READY`, `RUNNING`, `COMPLETED`)
- `resume_url_token`
- `otp_required` (bool)
- `expires_at`
- `review_requested_at`

### CampaignDraft

- `campaign_id`
- `session_id`
- `channel`
- `template_id`
- `offer_summary`
- `creative_assets`
- `cta_mode` (`BUSINESS_URL`, `PRIVATE_PORTAL_URL`)
- `cta_target`
- `is_locked`

### ModerationResult

- `campaign_id`
- `attempt_count`
- `safety_score`
- `audience_match_score`
- `risk_flags`
- `revision_guidance`
- `decision` (`PASS`, `REVISION_REQUIRED`, `MANUAL_REVIEW_OFFERED`)

### ManualReviewTicket

- `ticket_id`
- `campaign_id`
- `review_status` (`PENDING`, `APPROVED`, `REJECTED`)
- `review_reason`
- `reviewed_by`
- `reviewed_at`

### PaymentExtension

- `payment_id`
- `campaign_id`
- `method`
- `provider`
- `provider_ref`
- `payment_url`
- `provider_mode` (`test`, `live`)
- `verification_status`

### DispatchEvent and InteractionEvent

- `dispatch_id`, `campaign_id`, `contact_id`, `channel`, `scheduled_at`, `sent_at`, `status`
- `interaction_id`, `dispatch_id`, `event_type`, `event_time`, `metadata`

## API Surface (Phase 4)

- `POST /campaigns/session/start`
- `POST /campaigns/session/resume`
- `POST /campaigns/stats/preview`
- `POST /campaigns/template/generate`
- `POST /campaigns/moderation/check`
- `POST /campaigns/moderation/manual-review/request`
- `POST /campaigns/moderation/manual-review/decision`
- `POST /campaigns/payment/link`
- `POST /campaigns/payment/verify`
- `POST /campaigns/dispatch/start`
- `GET /campaigns/{campaign_id}/status`
- `GET /campaigns/{campaign_id}/report`

## Notifications

Client notifications:

- draft reminder (5 hours before expiry)
- manual review submitted
- manual approval/rejection with reason
- payment link delivery
- delivery status during runtime
- end-of-campaign analytics report

Internal notifications:

- manual review queue alerts (email + push)
- verification pending alerts
- dispatch failure alerts

## Security and Compliance Constraints

- Resume requires email OTP.
- Private control portal URLs are unguessable and per-campaign scoped.
- No raw contact data in client-facing responses.
- Approval audit trail must capture every decision and actor.
- Human final approval remains mandatory before send.

## Configuration

Core flags:

- `SMS_MODE=stub|twilio`
- `EMAIL_MODE=stub|smtp`
- `PAYMENT_MODE=test|live`
- `AI_MODERATION_ENABLED=true|false`
- `AI_RETRY_CAP=3`
- `DRAFT_TTL_HOURS=12`
- `DRAFT_REMINDER_HOURS_BEFORE_EXPIRY=5`

## Error Handling

- Clear rejection reasons for manual reject outcomes.
- Deterministic status model for resumable flow.
- Payment-link generation failures return actionable retry guidance.
- Expired session routes user to controlled restart path with preserved summary when possible.

## Test Strategy

Required validation categories:

- Session lifecycle and expiry logic
- AI retry cap and manual-review popup state transition
- Draft reminder schedule at T+7h
- Manual approval lock behavior and AI bypass after approval
- Payment-link generation (Stripe/PayPal sandbox) and verification gate
- Dispatch gate enforcement (`payment + human approval`)
- Channel cadence scheduler correctness (weekly email randomized weekday, fortnight SMS)
- Tracking event integrity and report generation

## Rollout Plan

1. Implement session + moderation + manual review state machine.
2. Add payment-link adapters (sandbox only) with verification gate.
3. Add dispatch scheduler and tracking pipeline in stub-safe mode.
4. Add reporting and client notification automation.
5. Enable staged provider live modes after controlled validation.
