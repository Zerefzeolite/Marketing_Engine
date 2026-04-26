"use client"

import { useState, useEffect } from "react"
import { getPaymentByRequest, approvePayment } from "../../lib/api/payment"
import { CampaignExecuteButton } from "./CampaignExecuteButton"

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
  const [hasLaunched, setHasLaunched] = useState(false)

  const isDevMode = process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_DEBUG === "true"

  useEffect(() => {
    setStatus(paymentStatus)
  }, [paymentStatus])

  async function handleDevApprove() {
    if (!confirm("Dev mode: Approve this payment immediately?")) return
    try {
      setIsRefreshing(true)
      await approvePayment(paymentId)
      setStatus("APPROVED")
      await onRefreshStatus()
    } catch (err) {
      console.error("Dev approve failed:", err)
    } finally {
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    if (hasLaunched || status === "COMPLETED") return
    
    const interval = setInterval(async () => {
      try {
        const result = await getPaymentByRequest(requestId)
        setStatus(result.status)
      } catch {
        // Ignore errors during polling
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [requestId, status, hasLaunched])

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

  function handlePrint() {
    window.print()
  }

  function handleEmailReceipt() {
    const subject = encodeURIComponent(`Payment Receipt - ${paymentId}`)
    const body = encodeURIComponent(
      `Payment Receipt\n\nRequest ID: ${requestId}\nPayment ID: ${paymentId}\nStatus: ${status}\n\nThank you for your payment!`
    )
    window.location.href = `mailto:?subject=${subject}&body=${body}`
  }

  return (
    <section className="status-step">
      <h2>Payment Status</h2>
      <p className="step-desc">Step 6 of 7</p>

      <div className="receipt-actions">
        <button className="btn-print" onClick={handlePrint}>🖨 Print Receipt</button>
        <button className="btn-email" onClick={handleEmailReceipt}>✉️ Email Receipt</button>
      </div>
      
      <div className="status-card">
        <div className="status-row">
          <span className="label">Request ID</span>
          <span className="value">{requestId}</span>
        </div>
        <div className="status-row">
          <span className="label">Payment ID</span>
          <span className="value">{paymentId}</span>
        </div>
        <div className="status-row">
          <span className="label">Status</span>
          <span className={`status-badge ${status.toLowerCase()}`}>{status}</span>
        </div>
      </div>

      {isDevMode && (
        <button
          className="dev-approve-btn"
          onClick={handleDevApprove}
          disabled={isRefreshing}
          style={{ width: "100%", marginBottom: "1rem", padding: "0.75rem", background: "#7c3aed", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 600 }}
        >
          [DEV] Approve Payment Now
        </button>
      )}

      {isVerified && !hasLaunched ? (
        <div className="verified-section">
          <div className="success-icon">✓</div>
          <p className="success-msg">Payment verified! Your campaign is ready.</p>
          <CampaignExecuteButton
            requestId={requestId}
            campaignData={{
              channels: ["email"],
              target_count: 1000,
            }}
            onExecute={() => setHasLaunched(true)}
          />
        </div>
      ) : hasLaunched ? (
        <div className="launched-section">
          <div className="success-icon">🚀</div>
          <p className="success-msg">Campaign Launched!</p>
          <p>Your campaign has been submitted for execution. Messages will be sent to your target audience.</p>
          <div className="next-steps">
            <h4>What's Next?</h4>
            <ul>
              <li>Check analytics for delivery status</li>
              <li>Monitor open and click rates</li>
              <li>Review campaign performance after 24-48 hours</li>
            </ul>
          </div>
          <a href="/analytics" className="btn-analytics">View Analytics →</a>
        </div>
      ) : (
        <div className="pending-section">
          <div className="pending-card">
            <div className="pending-icon">⏳</div>
            <p className="pending-text">
              {status === "PENDING" 
                ? "Awaiting payment verification. We'll notify you once approved." 
                : "Processing your payment..."}
            </p>
            {expectedWaitTime && <p className="wait-note">⏱ {expectedWaitTime}</p>}
          </div>
          
          <button className="btn-refresh" onClick={handleRefresh} disabled={isRefreshing}>
            {isRefreshing ? "Refreshing..." : "Refresh Status"}
          </button>
        </div>
      )}

      <style>{`
        .status-step { max-width: 600px; margin: 0 auto; }
        .status-step h2 { margin: 0 0 0.25rem; font-size: 24px; color: #1e293b; }
        .step-desc { margin: 0 0 1.5rem; color: #64748b; font-size: 14px; }
        
        .receipt-actions { display: flex; gap: 1rem; margin-bottom: 1rem; }
        .receipt-actions button { flex: 1; padding: 0.75rem; border-radius: 8px; font-weight: 600; cursor: pointer; border: none; }
        .btn-print { background: #f1f5f9; color: #475569; }
        .btn-email { background: #f0f9ff; color: #0369a1; border: 1px solid #bae6fd; }
        
        .status-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.25rem; margin-bottom: 1.5rem; }
        .status-row { display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #e2e8f0; }
        .status-row:last-child { border-bottom: none; }
        .status-row .label { color: #64748b; font-size: 14px; }
        .status-row .value { color: #1e293b; font-weight: 500; font-size: 14px; }
        .status-badge { padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
        .status-badge.pending { background: #fef3c7; color: #92400e; }
        .status-badge.completed { background: #dcfce7; color: #166534; }
        .status-badge.failed { background: #fee2e2; color: #dc2626; }
        
        .verified-section { text-align: center; padding: 2rem; background: #f0fdf4; border: 2px solid #86efac; border-radius: 16px; }
        .success-icon { font-size: 48px; margin-bottom: 0.5rem; }
        .success-msg { color: #166534; font-weight: 600; font-size: 20px; margin: 0 0 1.5rem; }
        
        .launched-section { text-align: center; padding: 2rem; background: #dbeafe; border: 2px solid #93c5fd; border-radius: 16px; }
        .success-msg { color: #1e40af; font-weight: 600; font-size: 20px; margin: 0 0 0.5rem; }
        .launched-section > p { color: #1e3a8a; font-size: 14px; margin-bottom: 1.5rem; }
        .next-steps { text-align: left; background: white; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; }
        .next-steps h4 { margin: 0 0 0.5rem; color: #1e293b; font-size: 14px; }
        .next-steps ul { margin: 0; padding-left: 1.25rem; color: #475569; font-size: 13px; }
        .next-steps li { margin-bottom: 0.25rem; }
        .btn-analytics { display: inline-block; padding: 0.75rem 1.5rem; background: #4f46e5; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; }
        
        .pending-section { text-align: center; }
        .pending-card { background: #fef3c7; border: 1px solid #fde68a; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; }
        .pending-icon { font-size: 36px; margin-bottom: 0.5rem; }
        .pending-text { color: #92400e; font-size: 15px; margin: 0; }
        .wait-note { color: #b45309; font-size: 13px; margin-top: 0.5rem; }
        
        .btn-refresh { padding: 0.75rem 1.5rem; background: #4f46e5; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; }
        .btn-refresh:disabled { opacity: 0.7; }
      `}</style>
    </section>
  )
}