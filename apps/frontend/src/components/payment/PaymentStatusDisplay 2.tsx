"use client"

import { useState, useEffect } from "react"
import { getPaymentByRequest } from "../../lib/api/payment"

type PaymentStatusDisplayProps = {
  requestId: string
  paymentId: string
  paymentStatus: string
  paymentInstructions: string
  expectedWaitTime: string
  hasConsent: boolean
  onRefreshStatus: () => Promise<void>
}

export function PaymentStatusDisplay({
  requestId,
  paymentId,
  paymentStatus,
  paymentInstructions,
  expectedWaitTime,
  hasConsent,
  onRefreshStatus,
}: PaymentStatusDisplayProps) {
  const [status, setStatus] = useState(paymentStatus)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const result = await getPaymentByRequest(requestId)
        setStatus(result.status)
      } catch {
        // Ignore errors during polling
      }
    }, 30000) // Check every 30 seconds

    return () => clearInterval(interval)
  }, [requestId])

  async function handleRefresh() {
    setIsRefreshing(true)
    try {
      const result = await getPaymentByRequest(requestId)
      setStatus(result.status)
      await onRefreshStatus()
    } catch {
      // Ignore errors
    } finally {
      setIsRefreshing(false)
    }
  }

  const isVerified = status === "COMPLETED"

  return (
    <section>
      <h2>Payment Status</h2>
      <p>Step 5 of 5</p>

      <div>
        <p>Request ID: {requestId}</p>
        <p>Payment ID: {paymentId}</p>
        <p>Status: <strong>{status}</strong></p>
      </div>

      {expectedWaitTime && (
        <div>
          <p><strong>Note:</strong> {expectedWaitTime}</p>
        </div>
      )}

      {paymentInstructions && !isVerified && (
        <div>
          <h3>Payment Instructions</h3>
          <pre>{paymentInstructions}</pre>
        </div>
      )}

      {isVerified ? (
        <div>
          <p>Your payment has been verified! Your campaign is ready to execute.</p>
          <button onClick={() => window.location.href = `/campaign-execute?requestId=${requestId}`}>
            Launch Campaign
          </button>
        </div>
      ) : (
        <div>
          <p>Awaiting verification. You will be notified once your payment is approved.</p>
          <button onClick={handleRefresh} disabled={isRefreshing}>
            {isRefreshing ? "Checking..." : "Check Status"}
          </button>
        </div>
      )}
    </section>
  )
}