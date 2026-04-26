"use client"

import { useState, useEffect } from "react"

type PendingReview = {
  campaign_session_id: string
  ticket_id: string | null
  client_email: string
  created_at: string | null
  campaign_name: string
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export default function AdminReviewsPage() {
  const [pendingReviews, setPendingReviews] = useState<PendingReview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [processing, setProcessing] = useState<string | null>(null)

  async function fetchPendingReviews() {
    try {
      const response = await fetch(`${API_BASE}/campaigns/moderation/pending-reviews`)
      if (!response.ok) throw new Error("Failed to fetch")
      const data = await response.json()
      setPendingReviews(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reviews")
    } finally {
      setLoading(false)
    }
  }

  async function handleDecision(sessionId: string, decision: "approved" | "rejected") {
    if (!confirm(`${decision === "approved" ? "Approve" : "Reject"} session ${sessionId}?`)) return
    setProcessing(sessionId)
    try {
      const response = await fetch(`${API_BASE}/campaigns/moderation/manual-review/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign_session_id: sessionId,
          decision,
          admin_notes: "Admin review completed",
        }),
      })
      if (!response.ok) throw new Error("Failed to submit decision")
      await fetchPendingReviews()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Decision failed")
    } finally {
      setProcessing(null)
    }
  }

  useEffect(() => {
    fetchPendingReviews()
  }, [])

  return (
    <main className="admin-reviews">
      <h1>Manual Review Queue</h1>
      <p className="subtitle">{pendingReviews.length} pending review(s)</p>

      {loading ? (
        <p className="loading">Loading...</p>
      ) : error ? (
        <p className="error">{error}</p>
      ) : pendingReviews.length === 0 ? (
        <div className="empty-state">
          <p>No campaigns pending manual review.</p>
        </div>
      ) : (
        <div className="review-list">
          {pendingReviews.map((review) => (
            <div key={review.campaign_session_id} className="review-card">
              <div className="review-header">
                <span className="ticket-id">{review.ticket_id || "N/A"}</span>
                <span className="session-id">{review.campaign_session_id}</span>
              </div>
              <div className="review-body">
                <p className="campaign-name">{review.campaign_name}</p>
                <p className="client-email">{review.client_email}</p>
                {review.created_at && (
                  <p className="created-at">
                    Created: {new Date(review.created_at).toLocaleString()}
                  </p>
                )}
              </div>
              <div className="review-actions">
                <button
                  className="btn-approve"
                  onClick={() => handleDecision(review.campaign_session_id, "approved")}
                  disabled={processing === review.campaign_session_id}
                >
                  {processing === review.campaign_session_id ? "Processing..." : "Approve"}
                </button>
                <button
                  className="btn-reject"
                  onClick={() => handleDecision(review.campaign_session_id, "rejected")}
                  disabled={processing === review.campaign_session_id}
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .admin-reviews { max-width: 800px; margin: 0 auto; padding: 2rem; }
        .admin-reviews h1 { margin: 0 0 0.25rem; color: #1e293b; }
        .subtitle { color: #64748b; margin-bottom: 2rem; }
        .loading, .error { padding: 2rem; text-align: center; }
        .error { color: #dc2626; }
        .empty-state { text-align: center; padding: 3rem; background: #f8fafc; border-radius: 12px; color: #64748b; }
        .review-list { display: flex; flex-direction: column; gap: 1rem; }
        .review-card { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.25rem; }
        .review-header { display: flex; gap: 1rem; margin-bottom: 0.75rem; }
        .ticket-id { background: #7c3aed; color: white; padding: 0.25rem 0.75rem; border-radius: 6px; font-size: 13px; font-weight: 600; }
        .session-id { color: #64748b; font-size: 13px; }
        .review-body { margin-bottom: 1rem; }
        .campaign-name { margin: 0 0 0.25rem; font-size: 16px; font-weight: 600; color: #1e293b; }
        .client-email { margin: 0 0 0.25rem; color: #475569; }
        .created-at { margin: 0; font-size: 13px; color: #94a3b8; }
        .review-actions { display: flex; gap: 0.75rem; }
        .btn-approve, .btn-reject { flex: 1; padding: 0.75rem; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; }
        .btn-approve { background: #22c55e; color: white; }
        .btn-approve:hover { background: #16a34a; }
        .btn-reject { background: #ef4444; color: white; }
        .btn-reject:hover { background: #dc2626; }
        .btn-approve:disabled, .btn-reject:disabled { opacity: 0.7; cursor: not-allowed; }
      `}</style>
    </main>
  )
}