# Pack 07: Production Payment Gateway

**Date**: 2026-05-20
**Status**: In Progress
**Branch**: `master`
**Previous**: Pack 06 complete at `3bd888c`

## Goal
Flesh out Stripe scaffold + add PayPal integration. Replace "Coming soon" notices with functional online payment flows while keeping bank transfer/cash as fallback.

## What's Changing

### Backend
- `POST /payments/stripe/create-payment-intent` — create Stripe PaymentIntent
- `GET /payments/stripe/config` — return Stripe publishable key
- `POST /payments/paypal/create-order` — create PayPal order
- `POST /payments/paypal/capture-order` — capture PayPal order
- Enhanced Stripe webhook handling (payment_intent.succeeded, payment_intent.payment_failed)
- Payment service: Stripe/PayPal methods with mock fallback when keys unset
- `stripe` added to requirements.txt

### Frontend
- `StripePaymentForm.tsx` — Stripe Elements card component
- `PayPalButton.tsx` — PayPal button component
- Updated `PaymentStep.tsx` — wire up Stripe/PayPal interactive flows
- `@stripe/stripe-js` and `@stripe/react-stripe-js` added

## Safety
- `STRIPE_SECRET_KEY` unset → mock mode (current behavior preserved)
- `PAYPAL_CLIENT_ID` unset → mock mode
- Bank transfer/cash flow unchanged
- No live SMS enabled
