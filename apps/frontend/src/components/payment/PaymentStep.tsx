"use client"

import { useState } from "react"
import { submitPayment, uploadReceipt } from "../../lib/api/payment"

type PaymentMethod = "LOCAL_BANK_TRANSFER" | "CASH" | "STRIPE" | "PAYPAL"

type Currency = "USD" | "JMD"

type PaymentStepProps = {
  requestId: string
  recommendedPackage: string
  packagePrice: number
  packagePriceJMD: number
  templateUpgradeCost?: number
  templateUpgradeCostJMD?: number
  templateTier?: string
  packageDescription?: string
  duration?: string
  sends?: number
  totalContacts?: number
  channel?: string
  onComplete: (paymentId: string, status: string, instructions: string, waitTime: string) => void
  onBack: () => void
}

const JMD_EXCHANGE_RATE = 155

const METHOD_LABELS: Record<PaymentMethod, { name: string; desc: string }> = {
  LOCAL_BANK_TRANSFER: { name: "Bank Transfer", desc: "Direct transfer to our account" },
  CASH: { name: "Cash Deposit", desc: "Deposit at any branch" },
  STRIPE: { name: "Credit Card", desc: "Pay with Visa/MasterCard" },
  PAYPAL: { name: "PayPal", desc: "Pay via PayPal" },
}

export function PaymentStep({ 
  requestId, 
  recommendedPackage, 
  packagePrice, 
  packagePriceJMD,
  templateUpgradeCost = 0,
  templateUpgradeCostJMD = 0,
  templateTier,
  packageDescription,
  duration,
  sends,
  totalContacts,
  channel,
  onComplete, 
  onBack 
}: PaymentStepProps) {
  const [method, setMethod] = useState<PaymentMethod>("LOCAL_BANK_TRANSFER")
  const [step, setStep] = useState<"select" | "instructions" | "receipt" | "submit">("select")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [paymentId, setPaymentId] = useState("")
  const [instructions, setInstructions] = useState("")
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>("USD")

  const totalUSD = packagePrice + templateUpgradeCost
  const totalJMD = packagePriceJMD + templateUpgradeCostJMD
  const amount = selectedCurrency === "USD" ? totalUSD : totalJMD

  const currencySymbol = selectedCurrency === "USD" ? "US$" : "J$"

  async function handleProceedToInstructions() {
    setStep("instructions")
  }

  async function handleSubmitPayment() {
    try {
      setIsSubmitting(true)
      setError("")
      const result = await submitPayment({
        request_id: requestId,
        amount,
        method,
      })
      setPaymentId(result.payment_id)
      setInstructions(result.payment_instructions || "")
      
      // For bank transfer/cash, require receipt upload
      if (method === "LOCAL_BANK_TRANSFER" || method === "CASH") {
        setStep("receipt")
      } else {
        // For online payments, submit directly
        setStep("submit")
        onComplete(result.payment_id, result.status, result.payment_instructions || "", result.expected_wait_time || "")
      }
    } catch (err) {
      console.warn("Payment API unavailable, continuing with mock:", err)
      const mockPaymentId = `PAY-${Date.now().toString(36).toUpperCase()}`
      setPaymentId(mockPaymentId)
      setInstructions("Mock payment instructions - Bank: Demo Bank, Account: 123456789")
      
      if (method === "LOCAL_BANK_TRANSFER" || method === "CASH") {
        setStep("receipt")
      } else {
        setStep("submit")
        onComplete(mockPaymentId, "PENDING", "Mock payment - continue anyway", "Demo mode")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleUploadAndSubmit() {
    if (!receiptFile) return
    
    try {
      setIsUploading(true)
      setError("")
      await uploadReceipt(paymentId, receiptFile)
      onComplete(paymentId, "PENDING", instructions, "24-48 hours verification required")
    } catch (err) {
      console.warn("Upload API unavailable, continuing anyway:", err)
      onComplete(paymentId, "PENDING", instructions, "24-48 hours (demo mode)")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <section className="payment-step">
      <h2>Payment</h2>
      <p className="step-desc">Step 5 of 7</p>
      <p className="intro">Complete payment to launch your campaign.</p>

      {/* Step 1: Select Payment Method */}
      {step === "select" && (
        <>
          <div className="currency-selector">
            <label>Select Payment Currency:</label>
            <div className="currency-options">
              <button 
                className={`currency-btn ${selectedCurrency === "USD" ? "active" : ""}`}
                onClick={() => setSelectedCurrency("USD")}
              >
                US$ USD
              </button>
              <button 
                className={`currency-btn ${selectedCurrency === "JMD" ? "active" : ""}`}
                onClick={() => setSelectedCurrency("JMD")}
              >
                J$ JMD
              </button>
            </div>
          </div>

          <div className="campaign-details-card">
            <h4>Campaign Details</h4>
            <div className="detail-row">
              <span>Package:</span>
              <span>{recommendedPackage} ({packageDescription || "Basic"})</span>
            </div>
            <div className="detail-row">
              <span>Duration:</span>
              <span>{duration || "Weekly"} ({sends || 4} sends)</span>
            </div>
            <div className="detail-row">
              <span>Total Contacts:</span>
              <span>{totalContacts?.toLocaleString() || "N/A"}</span>
            </div>
            <div className="detail-row">
              <span>Channel:</span>
              <span>{channel || "Email"}</span>
            </div>
          </div>

          <div className="order-summary">
            <h4>Cost Breakdown</h4>
            <div className="summary-row">
              <span>Package ({recommendedPackage})</span>
              <span>{currencySymbol}{selectedCurrency === "USD" ? packagePrice.toLocaleString() : packagePriceJMD.toLocaleString()}</span>
            </div>
            {templateTier && templateTier !== "basic" && (
              <div className="summary-row">
                <span>Template Upgrade ({templateTier})</span>
                <span>{currencySymbol}{selectedCurrency === "USD" ? templateUpgradeCost?.toLocaleString() : templateUpgradeCostJMD?.toLocaleString()}</span>
              </div>
            )}
            <div className="summary-row total">
              <span>Total</span>
              <span className="amount">{currencySymbol}{amount.toLocaleString()}</span>
            </div>
            <div className="currency-note">
              {selectedCurrency === "USD" ? (
                <>Equivalent: J${totalJMD.toLocaleString()} JMD</>
              ) : (
                <>Equivalent: US${totalUSD.toLocaleString()} USD</>
              )}
            </div>
          </div>

          <div className="payment-methods">
            <label className="method-label">Select Payment Method</label>
            {Object.entries(METHOD_LABELS).map(([key, { name, desc }]) => (
              <label key={key} className={`method-option ${method === key ? "selected" : ""}`}>
                <input
                  type="radio"
                  name="payment-method"
                  value={key}
                  checked={method === key}
                  onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                />
                <div className="method-content">
                  <strong>{name}</strong>
                  <span>{desc}</span>
                </div>
              </label>
            ))}
          </div>

          <div className="actions">
            <button className="btn-back" onClick={onBack}>← Back</button>
            <button className="btn-primary" onClick={handleProceedToInstructions}>
              Continue →
            </button>
          </div>
        </>
      )}

      {/* Step 2: Payment Instructions */}
      {step === "instructions" && (
        <div className="instructions-card">
          <h3>Payment Instructions</h3>
          
          {method === "LOCAL_BANK_TRANSFER" && (
            <div className="bank-details">
              <p><strong>Bank:</strong> National Commercial Bank (NCB)</p>
              <p><strong>Account Name:</strong> Jamaica Marketing Services Ltd</p>
              <p><strong>Account Number:</strong> 1234567890</p>
              <p><strong>Reference:</strong> Use your email as reference</p>
            </div>
          )}
          
          {method === "CASH" && (
            <div className="cash-details">
              <p>Visit any NCB branch and deposit to:</p>
              <p><strong>Account Number:</strong> 1234567890</p>
              <p><strong>Reference:</strong> Your email address</p>
            </div>
          )}

          {method === "STRIPE" && (
            <div className="stripe-notice">
              <p>Stripe integration coming soon. Please use bank transfer for now.</p>
            </div>
          )}

          {method === "PAYPAL" && (
            <div className="paypal-notice">
              <p>PayPal integration coming soon. Please use bank transfer for now.</p>
            </div>
          )}

          <div className="amount-display">
            <span>Amount to Pay:</span>
            <span className="pay-amount">{currencySymbol}{amount.toLocaleString()}</span>
          </div>

          <p className="instruction-note">
            {method === "LOCAL_BANK_TRANSFER" || method === "CASH"
              ? "After making your payment, you'll be able to upload your receipt."
              : "Please complete your payment and click Submit."}
          </p>

          {error && <p className="error">{error}</p>}

          <div className="actions">
            <button className="btn-back" onClick={() => setStep("select")}>← Back</button>
            <button className="btn-primary" onClick={handleSubmitPayment} disabled={isSubmitting}>
              {isSubmitting ? "Processing..." : "I've Made Payment →"}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Upload Receipt */}
      {step === "receipt" && (
        <div className="receipt-card">
          <div className="success-icon">✓</div>
          <h3>Payment Submitted</h3>
          <p className="payment-id">Payment ID: {paymentId}</p>
          
          <div className="receipt-upload">
            <label>Upload Payment Receipt *</label>
            <p className="receipt-hint">Upload a photo or scan of your payment receipt</p>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
            />
            {receiptFile && <p className="file-selected">Selected: {receiptFile.name}</p>}
          </div>

          {error && <p className="error">{error}</p>}

          <div className="actions">
            <button className="btn-back" onClick={() => setStep("instructions")}>← Back</button>
            <button 
              className="btn-primary" 
              onClick={handleUploadAndSubmit} 
              disabled={!receiptFile || isUploading}
            >
              {isUploading ? "Submitting..." : "Submit for Review"}
            </button>
          </div>
        </div>
      )}

      <style>{`
        .payment-step { max-width: 600px; margin: 0 auto; }
        .payment-step h2 { margin: 0 0 0.25rem; font-size: 24px; color: #1e293b; }
        .step-desc { margin: 0 0 0.5rem; color: #64748b; font-size: 14px; }
        .intro { color: #475569; margin-bottom: 1.5rem; }
        
        .currency-selector { margin-bottom: 1.5rem; }
        .currency-selector label { display: block; font-weight: 600; margin-bottom: 0.75rem; color: #1e293b; }
        .currency-options { display: flex; gap: 1rem; }
        .currency-btn { flex: 1; padding: 0.75rem 1rem; border: 2px solid #e2e8f0; border-radius: 8px; background: white; cursor: pointer; font-weight: 600; color: #475569; transition: all 0.2s; }
        .currency-btn:hover { border-color: #cbd5e1; }
        .currency-btn.active { border-color: #4f46e5; background: #4f46e5; color: white; }
        
        .order-summary { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.25rem; margin-bottom: 1.5rem; }
        .order-summary h4 { margin: 0 0 1rem; color: #1e293b; font-size: 16px; }
        .summary-row { display: flex; justify-content: space-between; padding: 0.5rem 0; color: #475569; }
        .summary-row.total { border-top: 1px solid #e2e8f0; margin-top: 0.5rem; padding-top: 1rem; font-size: 18px; font-weight: 600; color: #1e293b; }
        .package-name { text-transform: capitalize; }
        .amount { color: #4f46e5; }
        .currency-note { font-size: 12px; color: #64748b; text-align: right; margin-top: 0.5rem; font-style: italic; }
        
        .campaign-details-card { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 1.25rem; margin-bottom: 1.5rem; }
        .campaign-details-card h4 { margin: 0 0 1rem; color: #166534; font-size: 16px; }
        .detail-row { display: flex; justify-content: space-between; padding: 0.4rem 0; color: #475569; font-size: 14px; }
        .detail-row span:first-child { color: #64748b; font-weight: 500; }
        .detail-row span:last-child { color: #1e293b; font-weight: 600; }
        
        .method-label { display: block; font-weight: 600; margin-bottom: 0.75rem; color: #1e293b; }
        .payment-methods { display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1.5rem; }
        .method-option { display: flex; align-items: flex-start; gap: 0.75rem; padding: 1rem; border: 2px solid #e2e8f0; border-radius: 10px; cursor: pointer; }
        .method-option:hover { border-color: #cbd5e1; }
        .method-option.selected { border-color: #4f46e5; background: #f5f3ff; }
        .method-option input { margin-top: 0.25rem; }
        .method-content { display: flex; flex-direction: column; }
        .method-content strong { color: #1e293b; font-size: 15px; }
        .method-content span { color: #64748b; font-size: 13px; }
        
        .instructions-card, .receipt-card { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.5rem; }
        .instructions-card h3, .receipt-card h3 { margin: 0 0 1rem; color: #1e293b; }
        
        .bank-details, .cash-details { background: #f8fafc; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; }
        .bank-details p, .cash-details p { margin: 0.5rem 0; color: #475569; font-size: 14px; }
        
        .stripe-notice, .paypal-notice { background: #fef3c7; padding: 1rem; border-radius: 8px; color: #92400e; margin-bottom: 1rem; }
        
        .amount-display { display: flex; justify-content: space-between; padding: 1rem; background: #f0fdf4; border-radius: 8px; margin: 1rem 0; }
        .pay-amount { font-size: 24px; font-weight: 700; color: #16a34a; }
        
        .instruction-note { color: #64748b; font-size: 14px; margin-bottom: 1.5rem; }
        
        .receipt-card { text-align: center; }
        .receipt-card .success-icon { width: 48px; height: 48px; margin: 0 auto 1rem; display: flex; align-items: center; justify-content: center; background: #22c55e; color: white; font-size: 24px; border-radius: 50%; }
        .payment-id { color: #64748b; font-size: 14px; margin-bottom: 1.5rem; }
        
        .receipt-upload { text-align: left; margin-bottom: 1.5rem; }
        .receipt-upload label { display: block; font-weight: 600; margin-bottom: 0.5rem; }
        .receipt-hint { font-size: 13px; color: #64748b; margin-bottom: 0.75rem; }
        .file-selected { color: #16a34a; font-size: 13px; margin-top: 0.5rem; }
        
        .error { color: #dc2626; margin-bottom: 1rem; font-size: 14px; }
        
        .actions { display: flex; gap: 1rem; margin-top: 2rem; }
        .btn-back { padding: 0.75rem 1.5rem; background: #f1f5f9; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; color: #475569; }
        .btn-primary { flex: 1; padding: 0.75rem 1.5rem; background: #4f46e5; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; }
        .btn-primary:disabled { opacity: 0.7; }

        @media print {
          .payment-step { max-width: 100%; }
          .btn-back, .btn-primary, .currency-selector { display: none; }
          .order-summary, .campaign-details-card { border: 1px solid #000; page-break-inside: avoid; }
        }
      `}</style>
    </section>
  )
}