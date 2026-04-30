"use client"

import { useState } from "react"
import { recordConsent } from "../../lib/api/payment"

type ConsentStepProps = {
  requestId: string
  onComplete: () => void
  onBack: () => void
}

export function ConsentStep({ requestId, onComplete, onBack }: ConsentStepProps) {
  const [consentToMarketing, setConsentToMarketing] = useState(true)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [dataProcessingConsent, setDataProcessingConsent] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  function handleAcceptAll() {
    setConsentToMarketing(true)
    setTermsAccepted(true)
    setDataProcessingConsent(true)
  }

  async function handleSubmit() {
    if (!termsAccepted || !dataProcessingConsent) {
      setError("Please accept the required terms to proceed.")
      return
    }

    try {
      setIsSubmitting(true)
      setError("")
      await recordConsent({
        request_id: requestId,
        consent_to_marketing: consentToMarketing,
        terms_accepted: true,
        data_processing_consent: true,
      })
      onComplete()
    } catch (err) {
      console.warn("Consent API unavailable, continuing anyway:", err)
      onComplete()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="consent-step">
      <h2>Consent & Terms</h2>
      <p className="step-desc">Step 2 of 7</p>
      <p className="intro">Please review and accept the following to continue.</p>
      <p className="intro">Please review and accept the following to continue.</p>

      <div className="consent-options">
        <label className={`consent-item ${termsAccepted && dataProcessingConsent ? "all-accepted" : ""}`}>
          <input
            type="checkbox"
            checked={termsAccepted && dataProcessingConsent}
            onChange={() => {
              if (termsAccepted && dataProcessingConsent) {
                setTermsAccepted(false)
                setDataProcessingConsent(false)
              } else {
                handleAcceptAll()
              }
            }}
          />
          <div className="consent-content">
            <strong>Accept All Required Terms</strong>
            <span>Terms of Service + Data Processing Consent (required)</span>
          </div>
        </label>

        <label className="consent-item optional">
          <input
            type="checkbox"
            checked={consentToMarketing}
            onChange={(e) => setConsentToMarketing(e.target.checked)}
          />
          <div className="consent-content">
            <strong>Marketing Communications</strong>
            <span>Receive updates about our services (optional)</span>
          </div>
        </label>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="actions">
        <button className="btn-back" onClick={onBack}>← Back</button>
        <button className="btn-primary" onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? "Recording..." : "Continue →"}
        </button>
      </div>

      <style>{`
        .consent-step { max-width: 600px; margin: 0 auto; }
        .consent-step h2 { margin: 0 0 0.25rem; font-size: 24px; color: #1e293b; }
        .step-desc { margin: 0 0 0.5rem; color: #64748b; font-size: 14px; }
        .intro { color: #475569; margin-bottom: 1.5rem; }
        .consent-options { display: flex; flex-direction: column; gap: 1rem; margin-bottom: 1.5rem; }
        .consent-item {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          padding: 1rem;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          cursor: pointer;
          transition: border-color 0.2s;
        }
        .consent-item:hover { border-color: #cbd5e1; }
        .consent-item.all-accepted { border-color: #22c55e; background: #f0fdf4; }
        .consent-item input[type="checkbox"] { margin-top: 0.25rem; width: 20px; height: 20px; }
        .consent-content { display: flex; flex-direction: column; }
        .consent-content strong { color: #1e293b; font-size: 15px; }
        .consent-content span { color: #64748b; font-size: 13px; }
        .error { color: #dc2626; margin-bottom: 1rem; font-size: 14px; }
        .actions { display: flex; gap: 1rem; margin-top: 2rem; }
        .btn-back { padding: 0.75rem 1.5rem; background: #f1f5f9; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; color: #475569; }
        .btn-primary { flex: 1; padding: 0.75rem 1.5rem; background: #4f46e5; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; }
        .btn-primary:disabled { opacity: 0.7; }
      `}</style>
    </section>
  )
}