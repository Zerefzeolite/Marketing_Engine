# SMS Strategy — Marketing Engine

**Date**: 2026-04-29
**Status**: Phase 3A Complete ✅
**Priority**: 🟡 Medium (Production Readiness)

---

## Executive Summary

SMS functionality exists but is **not production-ready**. Twilio account is currently suspended. An abstraction layer has been added to safely switch between modes without code changes.

---

## Current State

### Twilio Account: 🔴 SUSPENDED

- **Provider**: Twilio
- **Status**: Account suspended (reason: unknown)
- **Mode**: `mock` (simulated SMS)
- **Coverage**: Jamaica (Digicel & Flow networks)

### SMS Service Abstraction (Phase 3A ✅)

**Location**: `apps/backend/app/services/sms_service.py`

**Environment-Driven Mode:**

```bash
# Set via environment variable
SMS_MODE="mock"      # Default - no real SMS sent
SMS_MODE="twilio"    # Real Twilio API (requires credentials)
SMS_MODE="disabled"  # Skip SMS entirely
```

**Behavior by Mode:**

| Mode | Behavior | Use Case |
|------|-----------|-----------|
| `mock` | Returns simulated success, logs message | Development, testing |
| `twilio` | Real API calls to Twilio | Production (when account restored) |
| `disabled` | Skips SMS entirely | When SMS not needed |

---

## Why Mock Mode?

1. **Twilio account suspended** — cannot send real SMS
2. **Safe development** — no accidental SMS costs
3. **Testing** — predictable behavior without external API
4. **Future-proof** — easy to switch when account restored

---

## Implementation Details

### SMS Service (`sms_service.py`)

**Key Features:**
- Environment variable `SMS_MODE` controls behavior
- Structured logging for all SMS attempts
- Accepts `contact_id` parameter for event tracking
- Returns consistent dict with `status`, `error`, `contact_id`

**Mode Logic:**
```python
if self.mode == "disabled":
    return {"status": "skipped", "reason": "SMS mode is disabled"}

if self.mode == "mock":
    logger.info(f"[EXECUTION] Contact {contact_id} SMS MOCK SENT")
    return {"status": "mock", "message_sid": "mock-..."}

if self.mode == "twilio":
    # Check credentials
    if not all([account_sid, auth_token, phone_number]):
        return {"status": "failed", "error": "Missing credentials"}
    # Make real API call
    # ... httpx request to Twilio API
```

---

## Future Options (NOT YET IMPLEMENTED)

### Option 1: Restore Twilio Account
- Contact Twilio support
- Resolve suspension reason
- Set `SMS_MODE=twilio`
- Verify credentials in env vars

### Option 2: Switch to Alternative Provider
Potential providers for Jamaica:
- **Digicel** (local carrier)
- **Flow** (local carrier)
- **Vonage** (international)
- **MessageBird** (international)

Requires:
- New service class (e.g., `DigicelSMSService`)
- Update `sms_service.py` to support provider selection
- Update `SMS_MODE` to include provider name

### Option 3: Disable SMS Entirely
- Set `SMS_MODE=disabled`
- Remove SMS from channel options
- Focus on email-only campaigns

---

## Integration Points

### Execution Flow
**Location**: `apps/backend/app/api/campaigns_v2.py`

During execution:
1. Contact selected with `preferred_channel`
2. If `email` or `both` → send via `email_service`
3. If `sms` or `both` → send via `sms_service`
4. Events recorded via `analytics_service.record_event()`

### Event Recording
**Events Recorded:**
- `SENT` — message dispatched successfully
- `FAILED` — message failed (any reason)

**Storage**: `data/campaign_events.json` (via `analytics_service`)

---

## Logging

All SMS attempts logged with structured format:

```
[EXECUTION] Contact CNT-001 SMS MOCK SENT to +18761234567
[EXECUTION] Contact CNT-002 SMS FAILED: invalid number
[EXECUTION] Contact CNT-003 SMS SKIPPED (mode=disabled)
```

---

## Environment Variables

```bash
# SMS Configuration
SMS_MODE=mock                    # mock | twilio | disabled

# Twilio Credentials (only needed for mode=twilio)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxx
TWILIO_PHONE_NUMBER=+1876xxxxxxx
```

---

## Testing

```bash
# Run all tests (SMS in mock mode)
cd apps/backend
python -m pytest tests/ -v

# Verify SMS service modes
python -c "from app.services.sms_service import sms_service; print(sms_service.mode)"
```

---

## Next Steps

1. ✅ **Phase 3A**: SMS abstraction complete
2. ⏳ **Resolve Twilio suspension** (when ready)
3. ⏳ **Test with real SMS** (set `SMS_MODE=twilio`)
4. ⏳ **Consider alternative providers** (if Twilio not recoverable)
5. ⏳ **Add SMS cost tracking** (future)

---

## References

- `apps/backend/app/services/sms_service.py` — SMS abstraction layer
- `apps/backend/app/api/campaigns_v2.py` — execution endpoint (uses SMS)
- `docs/PACK_03_EXECUTION_REVIEW.md` — execution audit results
