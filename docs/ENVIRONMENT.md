# Environment Variables Reference

This document lists all environment variables required to run Marketing Engine.

## Backend (`apps/backend/.env`)

Copy `.env.example` to `.env` and fill in your values.

### Provider Configuration

| Variable | Required | Default | Description |
|-----------|----------|---------|-------------|
| `BREVO_API_KEY` | ✅ (email) | `your_brevo_api_key_here` | Brevo API key from SMTP > API Key |
| `BREVO_SENDER_EMAIL` | ✅ (email) | `noreply@yourdomain.com` | Verified sender email in Brevo |
| `BREVO_SENDER_NAME` | ❌ | `Marketing Engine` | Display name for sent emails |
| `TWILIO_ACCOUNT_SID` | ✅ (SMS) | `your_twilio_account_sid_here` | Twilio Account SID from Console |
| `TWILIO_AUTH_TOKEN` | ✅ (SMS) | `your_twilio_auth_token_here` | Twilio Auth Token from Console |
| `TWILIO_PHONE_NUMBER` | ✅ (SMS) | `+18761234567` | Purchased Jamaican phone number (+1 876) |

### Payment Configuration

| Variable | Required | Default | Description |
|-----------|----------|---------|-------------|
| `STRIPE_SECRET_KEY` | ❌ | *(none)* | Stripe secret key (`sk_test_...` or `sk_live_...`). If unset, Stripe is disabled. |
| `STRIPE_WEBHOOK_SECRET` | ❌ | *(none)* | Webhook signing secret from Stripe Dashboard > Webhooks |
| `STRIPE_MODE` | ❌ | `test` | `test` or `live`. Controls Stripe API mode. |

### Runtime Modes

| Variable | Required | Default | Description |
|-----------|----------|---------|-------------|
| `SMS_MODE` | ❌ | `mock` | `mock` → simulated SMS; `twilio` → real Twilio; `disabled` → skip SMS entirely |
| `PAYMENT_MODE` | ❌ | `manual` | `manual` → bank transfer/cash with admin approval; `stripe` → Stripe-enabled (future) |

### Database

| Variable | Required | Default | Description |
|-----------|----------|---------|-------------|
| `DATABASE_URL` | ❌ | `sqlite:///./marketing_engine.db` | Database connection string. Currently unused (JSON files). Future PostgreSQL migration. |

---

## Frontend (`apps/frontend/.env.local`)

| Variable | Required | Default | Description |
|-----------|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | ✅ | `http://127.0.0.1:8000` | Backend API base URL |

---

## Mode Summary

### SMS Modes (`SMS_MODE`)

| Mode | Behavior | When to use |
|------|-----------|--------------|
| `mock` | SMS simulated, nothing sent | Development, testing, Pack 04+ |
| `twilio` | Real SMS via Twilio API | Production (once Twilio account resolved) |
| `disabled` | SMS skipped entirely | If SMS not needed |

Current state: **Twilio account suspended. Use `mock` mode.**

### Payment Modes (`PAYMENT_MODE`)

| Mode | Behavior | When to use |
|------|-----------|--------------|
| `manual` | Bank transfer/cash + admin approval | Pilot launch (Pack 04) |
| `stripe` | Stripe PaymentIntent + webhook | Future production (scaffold in Pack 04) |

Current state: **Manual mode. Stripe scaffold disabled by default.**

### Stripe Mode (`STRIPE_MODE`)

| Mode | Behavior |
|------|-----------|
| `test` | Uses Stripe test API (`sk_test_...` keys) |
| `live` | Uses Stripe live API (`sk_live_...` keys) |

---

## Setup Instructions

### Backend

```bash
cd apps/backend
cp .env.example .env
# Edit .env with your actual API keys
```

### Frontend

```bash
cd apps/frontend
echo "NEXT_PUBLIC_API_URL=http://127.0.0.1:8000" > .env.local
```

---

## Safety Notes

- `.env`, `.env.local`, `.env.*.local` are all in `.gitignore`
- `.env.example` contains **only placeholder values** — never real keys
- Stripe is **disabled by default** — set `STRIPE_SECRET_KEY` to enable
- SMS is in **mock mode by default** — set `SMS_MODE=twilio` for real SMS
- No secrets should ever appear in `git log` or committed files
