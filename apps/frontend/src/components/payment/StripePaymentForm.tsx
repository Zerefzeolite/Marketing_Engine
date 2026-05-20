"use client"

import { useState, useEffect } from "react"
import { loadStripe } from "@stripe/stripe-js"
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

type StripePaymentFormProps = {
  paymentId: string
  amount: number
  requestId: string
  onSuccess: () => void
  onError: (msg: string) => void
}

function StripeCheckoutForm({ paymentId, amount, requestId, onSuccess, onError }: StripePaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [processing, setProcessing] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return

    setProcessing(true)

    try {
      const intentRes = await fetch(`${API_BASE}/payments/stripe/create-payment-intent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_id: paymentId, amount, request_id: requestId }),
      })
      if (!intentRes.ok) {
        const err = await intentRes.json()
        onError(err.detail || "Failed to create payment intent")
        setProcessing(false)
        return
      }
      const intentData = await intentRes.json()
      const clientSecret = intentData.client_secret

      if (intentData.mock) {
        onSuccess()
        setProcessing(false)
        return
      }

      const cardElement = elements.getElement(CardElement)
      if (!cardElement) {
        onError("Card element not found")
        setProcessing(false)
        return
      }

      const { error: confirmError } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card: cardElement },
      })

      if (confirmError) {
        onError(confirmError.message || "Payment failed")
      } else {
        onSuccess()
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : "Payment processing failed")
    } finally {
      setProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="stripe-form">
      <div className="card-element-wrapper">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: "16px",
                color: "#1e293b",
                fontFamily: "system-ui, sans-serif",
                "::placeholder": { color: "#94a3b8" },
              },
              invalid: { color: "#dc2626" },
            },
          }}
        />
      </div>
      <button
        type="submit"
        className="btn-pay"
        disabled={!stripe || processing}
      >
        {processing ? "Processing..." : `Pay $${amount.toLocaleString()}`}
      </button>
    </form>
  )
}

export function StripePaymentForm(props: StripePaymentFormProps) {
  const [stripePromise, setStripePromise] = useState<ReturnType<typeof loadStripe> | null>(null)

  useEffect(() => {
    fetch(`${API_BASE}/payments/stripe/config`)
      .then((res) => res.json())
      .then((config) => {
        if (config.publishable_key) {
          setStripePromise(loadStripe(config.publishable_key))
        } else {
          setStripePromise(null as any)
        }
      })
      .catch(() => {
        setStripePromise(null as any)
      })
  }, [])

  if (!stripePromise) {
    return (
      <div className="stripe-mock">
        <p className="mock-notice">Stripe not configured — using mock mode</p>
        <button
          className="btn-pay"
          onClick={() => props.onSuccess()}
        >
          Simulate Card Payment
        </button>
      </div>
    )
  }

  return (
    <Elements stripe={stripePromise}>
      <StripeCheckoutForm {...props} />
    </Elements>
  )
}
