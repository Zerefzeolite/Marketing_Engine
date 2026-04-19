# AI Marketing Engine Foundation Design (Jamaica Launch)

## 1) Purpose and Scope

This design defines the launch architecture for an AI-assisted, script-assisted marketing platform that uses a growing first-party and partner-sourced contact dataset to run targeted campaign recommendations and post-payment email/SMS campaign execution.

The launch scope is Jamaica-only compliance, script-first operations, and a local data-cleaning pipeline that feeds a continuously evolving `MASTER_CONTACTS` dataset.

## 2) Launch Goals

- Process mixed-source contact data (CSV primary, Excel secondary) at 100,000+ row scale.
- Clean, validate, deduplicate, and upsert contacts into a living `MASTER_CONTACTS` store.
- Match client campaign requests against compliant, reachable, high-fit audience segments.
- Provide client-facing insights and package recommendations without exposing raw contact data.
- Enforce payment and compliance gates before any campaign execution.
- Track campaign outcomes and feed engagement outcomes back into contact lifecycle logic.

## 3) Out of Scope (Launch)

- Multi-jurisdiction legal support outside Jamaica.
- Full desktop/web operator UI for data cleaning (CLI pipeline first).
- Full AWS migration and advanced distributed orchestration.

## 4) Current Baseline (Verified)

Existing workbook and documented flow already implement these phases:

- Intake and request capture: `CLIENT_RESPONSES`, `CLIENT_REQUESTS`, `REQUEST_SELECTOR`
- Audience logic and reporting: `CAMPAIGN_FILTER`, `CLIENT_REPORT`, `DASHBOARD_DATA`
- Internal exports: `EMAIL_EXPORT`, `SMS_EXPORT`

This design keeps that baseline and adds production-safe data engineering, security controls, and product workflow gating.

## 5) High-Level Architecture

### 5.1 Core Layers

1. Local Data Prep Pipeline (CLI scripts)
2. Master Contact Store (growing, upsert-driven)
3. Request + Matching Engine (filter + fit score)
4. Client Dashboard Layer (insights-only)
5. Payment Layer (gateway-agnostic, Stripe test adapter initially)
6. Campaign Execution Layer (email/SMS adapters)
7. Post-Campaign Analytics + Lifecycle Engine

### 5.2 Governing Principle

No direct sends from raw or intermediate datasets. Execution lists are generated only from approved, paid, compliance-passing request states.

## 6) Data Pipeline Design (Local Script-First)

### 6.1 Run Modes

- `full_import`: full source ingestion and rebuild of staging outputs.
- `incremental_import`: append/update only new source batches.
- `reclean_existing`: reprocess selected records with updated rules.

### 6.2 Pipeline Stages

1. `01_ingest`
   - Load CSV and XLSX files.
   - Map source columns to canonical schema.
   - Stamp `source_system` and `source_batch_id`.

2. `02_standardize`
   - Normalize email, phone, date formats.
   - Normalize parish/location labels into canonical values.
   - Normalize casing and whitespace.

3. `03_validate`
   - Required field checks.
   - Channel format checks.
   - Schema/type validation.
   - Route malformed records to `rejected_records`.

4. `04_identity_resolution`
   - Exact duplicate detection.
   - Near-match scoring for probable duplicates.
   - Decision outcomes:
     - `auto_merge` (high-confidence only)
     - `auto_separate`
     - `hold_for_review` (ambiguous near-match)

5. `05_consent_suppression`
   - Remove/mark unsubscribed, opt-out, stop-listed contacts.
   - Keep suppression reason and timestamp.

6. `06_enrich`
   - Derive `age_group`, `channel_available`, quality indicators.
   - Compute fit-assist fields used by campaign scoring.

7. `07_upsert_export`
   - Upsert into `MASTER_CONTACTS`.
   - Export run artifacts (kept, rejected, merged, suppressed, conflicts).

### 6.3 Upsert Behavior (Living Master)

`MASTER_CONTACTS` is continuous and mutable via controlled updates:

- New unique contact -> insert.
- Existing contact with higher-confidence new data -> update approved fields.
- Existing contact with conflicting lower-confidence data -> preserve current value and enqueue conflict review.

### 6.4 Required Lifecycle Fields

- `first_seen_at`
- `last_seen_at`
- `last_updated_at`
- `source_system`
- `source_batch_id`
- `record_status` (`active`, `suppressed`, `archived`)

## 7) Duplicate and Near-Match Handling

### 7.1 Identity Scoring Inputs

- Email exact/normalized match
- Phone exact/normalized match
- Name similarity
- DOB consistency
- Address similarity
- Source trust weight

### 7.2 Ambiguity Policy (Locked)

Ambiguous near-matches must default to `hold_for_review`. They are not auto-merged.

### 7.3 AI-Assisted Review Queue

When records are ambiguous, review flow requests additional differentiators such as:

- middle name
- fuller address
- alternate verified channel
- corrected DOB

Resolved outcomes are audited before merge/split action.

## 8) Request Matching and Campaign Fit

### 8.1 Hard Eligibility Filters

- Target parish/location
- Age group
- Gender (when client specifies)
- Preferred/available channel
- Consent + suppression clearance

### 8.2 Fit Scoring (Ranking)

Rank eligible contacts using weighted factors:

- demographic fit
- channel fit
- freshness fit
- data-quality fit

### 8.3 Output Datasets per Request

- `eligible_pool`
- `ranked_pool`
- `recommended_sample`

## 9) Package Recommendation Logic

### 9.1 Inputs

- Client budget
- Reachable audience count by channel
- Audience quality distribution

### 9.2 Outputs

- Starter/Growth/Premium recommendation
- Reach projection per package
- Confidence indicator based on data and fit quality

Client-facing views show metrics and projected outcomes only, never raw contact-level data.

## 10) Payment and Execution Gating

### 10.1 Provider Model

Use a gateway-agnostic payment interface. For development/testing, use Stripe test mode adapter now.

Planned adapters:

- `provider_stripe_test` (active for model/testing)
- `provider_amber_elink` (future production candidate)
- optional manual transfer adapter (fallback)

### 10.2 Payment State Gate

Request must satisfy all conditions before execution export:

- request approved
- payment verified
- compliance passed

Any non-verified state remains `awaiting_payment` and cannot generate send-ready outputs.

### 10.3 Payment Security

- webhook signature validation
- idempotency protection
- replay protection
- immutable payment event log

## 11) Campaign Execution and Tracking

### 11.1 Execution Flow

1. Generate final internal send lists from approved ranked pool.
2. Re-check suppression and validity before dispatch.
3. Dispatch through channel adapters:
   - email adapter (Mailchimp/Brevo)
   - sms adapter (Twilio/Bulk SMS)

### 11.2 Tracking and Reporting

- Track delivery and engagement events.
- Aggregate to client-safe metrics in report/dashboard datasets.
- Keep event-level internals for operational optimization.

## 12) Contact Lifecycle After Campaigns

- Positive engagement -> quality/freshness increase.
- Inactivity threshold -> demote priority or archive.
- Opt-out/bounce/stop -> immediate suppression with reason and timestamp.

This enables data recycling only where consent remains valid and activity signals support reuse.

## 13) Data Security and Insertion Controls

- Strict schema/type validation before write.
- Sanitization and required-field enforcement.
- Controlled write path (scripts/service account only).
- Append-only audit log for insert/update/merge/suppress actions.
- Batch-level hash/idempotency controls to prevent duplicate re-import corruption.
- Quarantine table/area for anomalous records.

## 14) Product Experience Requirements (Web)

Client-facing website must provide:

- clear process guidance from intake to execution
- form capture for campaign criteria and budget
- dashboard summaries of reachable audiences and package options
- tracked links for hosted/private ad destinations
- responsive behavior across desktop and mobile

## 15) Rollout Phases

### Phase 1: Data Trust Foundation

- Script pipeline implementation
- canonical schema and normalization rules
- identity resolution + review queue
- `MASTER_CONTACTS` upsert lifecycle fields

### Phase 2: Client Product Surface

- intake frontend
- dashboard access flow
- package recommendation outputs

### Phase 3: Payments + Controlled Execution

- Stripe test adapter integration
- payment-gated execution release
- email/SMS dispatch adapters

### Phase 4: Analytics and Optimization

- post-campaign KPI loop
- lifecycle scoring updates
- archive/recycle automation

## 16) Success Criteria

- 100k+ record imports complete with deterministic QA reports.
- Duplicate and near-match logic reduces identity collisions without unsafe merges.
- Zero campaign execution occurs without payment+compliance gate pass.
- Client dashboard remains insight-only with no raw contact leakage.
- Campaign performance feedback updates contact lifecycle state and future match quality.

## 17) Risks and Mitigations

- Data inconsistency across sources -> canonical mapping + validation + quarantine.
- False merges in identity resolution -> high-threshold merge + strict hold-for-review policy.
- Payment provider changes -> adapter abstraction and provider-agnostic states.
- Compliance drift -> explicit consent/suppression audit fields and operational checks.
