"use client"

import { useState } from "react"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

type PayPalButtonProps = {
  paymentId: string
  amount: number
  requestId: string
  onSuccess: () => void
  onError: (msg: string) => void
}

export function PayPalButton({ paymentId, amount, requestId, onSuccess, onError }: PayPalButtonProps) {
  const [processing, setProcessing] = useState(false)

  async function handlePayPal() {
    setProcessing(true)

    try {
      const orderRes = await fetch(`${API_BASE}/payments/paypal/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_id: paymentId, amount, request_id: requestId }),
      })

      if (!orderRes.ok) {
        const err = await orderRes.json()
        onError(err.detail || "Failed to create PayPal order")
        setProcessing(false)
        return
      }

      const orderData = await orderRes.json()

      if (orderData.mock) {
        onSuccess()
        setProcessing(false)
        return
      }

      if (orderData.approval_url) {
        const paypalWindow = window.open(orderData.approval_url, "_blank", "width=800,height=600")
        if (!paypalWindow) {
          onError("Popup blocked. Please allow popups for PayPal.")
          setProcessing(false)
          return
        }

        const checkInterval = setInterval(async () => {
          if (paypalWindow.closed) {
            clearInterval(checkInterval)
            try {
              const captureRes = await fetch(`${API_BASE}/payments/paypal/capture-order`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ order_id: orderData.order_id, payment_id: paymentId }),
              })
              const captureData = await captureRes.json()
              if (captureData.status === "COMPLETED" || captureData.mock) {
                onSuccess()
              } else {
                onError("PayPal payment was not completed")
              }
            } catch {
              onError("Failed to verify PayPal payment")
            }
            setProcessing(false)
          }
        }, 1000)

        setTimeout(() => {
          clearInterval(checkInterval)
          setProcessing(false)
        }, 300000)
      } else {
        onError("No approval URL returned from PayPal")
        setProcessing(false)
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : "PayPal processing failed")
      setProcessing(false)
    }
  }

  return (
    <button
      className="btn-paypal"
      onClick={handlePayPal}
      disabled={processing}
    >
      {processing ? "Opening PayPal..." : `Pay with PayPal $${amount.toLocaleString()}`}
    </button>
  )
}
