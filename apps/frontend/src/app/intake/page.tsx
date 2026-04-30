"use client"

import { useState } from "react"
import { IntakeForm } from "../../components/intake/IntakeForm"
import { RecommendationPreview } from "../../components/intake/RecommendationPreview"
import type { RecommendationPreviewData } from "../../lib/contracts/recommendation"
import { CONTINUE_TO_FLOW, INTAKE_EXPLAINER } from "../../lib/experience-routing"

export default function IntakePage() {
  const [recommendation, setRecommendation] =
    useState<RecommendationPreviewData | null>(null)
  const [requestId, setRequestId] = useState("")
  const [summary, setSummary] = useState<Record<string, string> | null>(null)

  function handleRequestReady(
    nextRequestId: string | null,
    nextSummary: Record<string, string> | null,
  ) {
    setRequestId(nextRequestId ?? "")
    setSummary(nextSummary)
  }

  return (
    <main className="intake-page">
      <header className="intake-header">
        <h1>Campaign Intake</h1>
        <p className="intro">{INTAKE_EXPLAINER}</p>
      </header>

      <div className="intake-content">
        <div className="form-section">
          <IntakeForm
            onRecommendationChange={setRecommendation}
            onRequestReady={handleRequestReady}
          />
        </div>

        <div className="preview-section">
          <RecommendationPreview recommendation={recommendation} summary={summary} />
        </div>
      </div>

      <div className="continue-link">
        <p>
          Want the full setup workflow?{" "}
          <a href={CONTINUE_TO_FLOW.href}>{CONTINUE_TO_FLOW.label} →</a>
        </p>
      </div>

      <style>{`
        .intake-page {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
        }
        .intake-header {
          text-align: center;
          margin-bottom: 2.5rem;
        }
        .intake-header h1 {
          font-size: 32px;
          color: #1e293b;
          margin: 0 0 0.5rem;
        }
        .intro {
          font-size: 16px;
          color: #64748b;
          max-width: 600px;
          margin: 0 auto;
          line-height: 1.6;
        }
        .intake-content {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
          align-items: start;
        }
        @media (max-width: 900px) {
          .intake-content {
            grid-template-columns: 1fr;
          }
        }
        .form-section {
          background: white;
          padding: 2rem;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
        }
        .request-confirmation {
          margin-top: 1.5rem;
          padding: 1rem;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 8px;
        }
        .request-confirmation h3 {
          margin: 0 0 0.5rem;
          color: #166534;
          font-size: 14px;
        }
        .request-confirmation p {
          margin: 0.25rem 0;
          font-size: 13px;
          color: #15803d;
        }
        .continue-link {
          text-align: center;
          margin-top: 2rem;
          padding-top: 1.5rem;
          border-top: 1px solid #e2e8f0;
        }
        .continue-link p {
          color: #64748b;
          font-size: 14px;
        }
        .continue-link a {
          color: #4f46e5;
          text-decoration: none;
          font-weight: 600;
        }
        .continue-link a:hover {
          text-decoration: underline;
        }
      `}</style>
    </main>
  )
}