"use client"

import { useState } from "react"
import { runCampaignModerationCheck } from "../../lib/api/campaign"

type ModerationReviewProps = {
  requestId: string
  failedChecks: number
  onPass: (failedChecks: number) => void
  onFail: (failedChecks: number) => void
  onManualReviewRequired: (failedChecks: number) => void
  onBack: () => void
}

export function ModerationReview({
  requestId,
  failedChecks,
  onPass,
  onFail,
  onManualReviewRequired,
  onBack,
}: ModerationReviewProps) {
  const [isChecking, setIsChecking] = useState(false)
  const [error, setError] = useState("")

  async function handleRunModerationCheck() {
    try {
      setIsChecking(true)
      setError("")

      const result = await runCampaignModerationCheck({
        campaign_session_id: requestId,
        campaign_id: requestId,
        safety_score: 50,
        audience_match_score: 40,
      })

      if (result.decision === "PASS") {
        onPass(failedChecks)
        return
      }

      if (result.decision === "MANUAL_REVIEW_OFFERED") {
        onManualReviewRequired(result.ai_attempt_count)
        return
      }

      onFail(result.ai_attempt_count)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed moderation check")
    } finally {
      setIsChecking(false)
    }
  }

  return (
    <section className="moderation-step">
      <h2>Campaign Moderation</h2>
      <p className="step-desc">Step 4 of 7</p>
      <p className="intro">Your campaign is reviewed for compliance and quality.</p>

      <div className="moderation-card">
        <div className="mod-icon">✓</div>
        <div className="mod-content">
          <h3>Automated Quality Check</h3>
          <p>We verify your campaign meets content guidelines and audience targeting standards.</p>
          {failedChecks > 0 && <p className="failed-count">Failed checks: {failedChecks}</p>}
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="actions">
        <button type="button" className="btn-back" onClick={onBack}>← Back</button>
        <button type="button" className="btn-skip" onClick={() => onPass(failedChecks)}>
          Skip →
        </button>
        <button type="button" className="btn-primary" onClick={handleRunModerationCheck} disabled={isChecking}>
          {isChecking ? "Running..." : "Run Check"}
        </button>
      </div>

      <style>{`
        .moderation-step { max-width: 600px; margin: 0 auto; }
        .moderation-step h2 { margin: 0 0 0.25rem; font-size: 24px; color: #1e293b; }
        .step-desc { margin: 0 0 0.5rem; color: #64748b; font-size: 14px; }
        .intro { color: #475569; margin-bottom: 1.5rem; }
        .moderation-card { display: flex; gap: 1rem; padding: 1.5rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 1.5rem; }
        .mod-icon { width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; background: #dcfce7; color: #16a34a; font-size: 24px; border-radius: 50%; flex-shrink: 0; }
        .mod-content h3 { margin: 0 0 0.25rem; font-size: 16px; color: #1e293b; }
        .mod-content p { margin: 0; color: #64748b; font-size: 14px; }
        .failed-count { color: #dc2626; font-weight: 600; margin-top: 0.5rem !important; }
        .error { color: #dc2626; margin-bottom: 1rem; font-size: 14px; }
        .actions { display: flex; gap: 0.75rem; margin-top: 2rem; }
        .btn-back { padding: 0.75rem 1.25rem; background: #f1f5f9; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; color: #475569; }
        .btn-skip { padding: 0.75rem 1.25rem; background: #f97316; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; }
        .btn-primary { padding: 0.75rem 1.25rem; background: #4f46e5; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; }
        .btn-primary:disabled { opacity: 0.7; }
      `}</style>
    </section>
  )
}