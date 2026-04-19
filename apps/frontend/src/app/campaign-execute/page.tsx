"use client"

import { useSearchParams } from "next/navigation"
import { Suspense, useEffect, useState } from "react"

interface ExecutionResult {
  status: string
  campaign_id: string
  execution_id: string
  contacts_delivered: number
}

function CampaignExecuteContent() {
  const searchParams = useSearchParams()
  const requestId = searchParams.get("requestId")
  const [status, setStatus] = useState<"loading" | "ready" | "executing" | "success" | "error">("loading")
  const [result, setResult] = useState<ExecutionResult | null>(null)
  const [error, setError] = useState<string>("")

  useEffect(() => {
    if (requestId) {
      setStatus("ready")
    } else {
      setError("No campaign ID provided")
      setStatus("error")
    }
  }, [requestId])

  const handleExecute = async () => {
    if (!requestId) return

    setStatus("executing")
    setError("")

    try {
      const res = await fetch(`/api/campaigns/${requestId}/execute`, {
        method: "POST",
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || "Execution failed")
      }
      const data = await res.json()
      setResult(data)
      setStatus("success")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to execute campaign")
      setStatus("error")
    }
  }

  if (status === "loading") {
    return (
      <main style={{ maxWidth: 600, margin: "0 auto", padding: 24 }}>
        <h1>Campaign Execution</h1>
        <p style={{ color: "#6b7280" }}>Loading campaign details...</p>
      </main>
    )
  }

  return (
    <main style={{ maxWidth: 600, margin: "0 auto", padding: 24 }}>
      <h1>Campaign Execution</h1>

      {status === "ready" && (
        <section
          style={{
            border: "1px solid #d0d7de",
            borderRadius: 8,
            padding: 24,
            marginTop: 16,
          }}
        >
          <h2 style={{ marginTop: 0 }}>{requestId}</h2>
          <p style={{ color: "#6b7280" }}>
            This campaign is ready for execution. Click the button below to
            start sending messages to your contact list.
          </p>
          <div style={{ marginTop: 24 }}>
            <button
              onClick={handleExecute}
              style={{
                background: "#2563eb",
                color: "white",
                border: "none",
                padding: "12px 24px",
                borderRadius: 6,
                fontSize: 16,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Execute Campaign
            </button>
          </div>
        </section>
      )}

      {status === "executing" && (
        <div style={{ textAlign: "center", padding: 40 }}>
          <div
            style={{
              width: 40,
              height: 40,
              border: "3px solid #e5e7eb",
              borderTopColor: "#2563eb",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 16px",
            }}
          />
          <p>Executing campaign...</p>
          <style>{`
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}

      {status === "success" && result && (
        <section
          style={{
            border: "1px solid #86efac",
            background: "#dcfce7",
            borderRadius: 8,
            padding: 24,
            marginTop: 16,
          }}
        >
          <h2 style={{ marginTop: 0, color: "#166534" }}>
            Campaign Executed Successfully
          </h2>
          <div style={{ marginTop: 16 }}>
            <p>
              <strong>Campaign ID:</strong> {result.campaign_id}
            </p>
            <p>
              <strong>Execution ID:</strong> {result.execution_id}
            </p>
            <p>
              <strong>Contacts Delivered:</strong> {result.contacts_delivered}
            </p>
          </div>
          <div style={{ marginTop: 24 }}>
            <button
              onClick={() => (window.location.href = "/analytics")}
              style={{
                background: "#2563eb",
                color: "white",
                border: "none",
                padding: "12px 24px",
                borderRadius: 6,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              View Analytics
            </button>
          </div>
        </section>
      )}

      {status === "error" && (
        <section
          style={{
            border: "1px solid #fca5a5",
            background: "#fee2e2",
            borderRadius: 8,
            padding: 24,
            marginTop: 16,
          }}
        >
          <h2 style={{ marginTop: 0, color: "#991b1b" }}>Execution Failed</h2>
          <p style={{ color: "#dc2626" }}>{error}</p>
          <div style={{ marginTop: 16 }}>
            <button
              onClick={() => setStatus("ready")}
              style={{
                background: "#6b7280",
                color: "white",
                border: "none",
                padding: "12px 24px",
                borderRadius: 6,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Try Again
            </button>
          </div>
        </section>
      )}
    </main>
  )
}

export default function CampaignExecutePage() {
  return (
    <Suspense fallback={<main style={{ maxWidth: 600, margin: "0 auto", padding: 24 }}><p>Loading...</p></main>}>
      <CampaignExecuteContent />
    </Suspense>
  )
}