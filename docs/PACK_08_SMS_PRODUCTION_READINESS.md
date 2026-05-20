# Pack 08: SMS Production Readiness

**Date**: 2026-05-20
**Status**: In Progress
**Branch**: `master`
**Previous**: Pack 07 complete at `64f86c2`

## Goal
Wire up actual SMS/email dispatch in campaign execution + fix SMS abstraction + add alternative provider scaffold.

## Findings
- `sms_service.py` exists but `SMS_MODE` env var is **not implemented**
- `campaigns_v2.py` execute endpoint **never calls** email or SMS services — it just creates a record
- `dispatch_service.py` does not dispatch anything
- Email/SMS services are async but execution endpoint is synchronous

## What's Changing

### SMS Mode Abstraction
- Add `SMS_MODE` env var support to `sms_service.py` (`mock` | `twilio` | `disabled` | `generic`)
- Default: `mock` (safe for development)
- `twilio` mode: uses Twilio API (requires credentials)
- `disabled` mode: skips SMS entirely
- `generic` mode: generic HTTP API provider (alternative scaffold)

### Execution Wiring
- Rewrite execute endpoint to actually call `email_service.send_email()` and `sms_service.send_sms()`
- Handle per-contact failures (don't let one failure stop all)
- Track delivery metrics per-contact
- Record events (SENT/FAILED) during execution

### Alternative Provider
- Add generic HTTP SMS provider (easy to configure with any API)
- Add `SMS_PROVIDER` config in provider

### Rate Limiting + Cost Tracking
- Add simple rate limiting (max SMS per minute)
- Track estimated costs per campaign

## Safety
- `SMS_MODE` defaults to `mock` — no real SMS sent without explicit config
- Bank transfer/cash payment flow unchanged
- No live Twilio required for tests
