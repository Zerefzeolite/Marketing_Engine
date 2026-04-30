"use client"

import { useState } from "react"
import { executeCampaign } from "../../lib/api/payment"

type CampaignExecuteButtonProps = {
  requestId: string
  campaignData: {
    channels: string[]
    target_count: number
  }
}

export function CampaignExecuteButton({ requestId, campaignData }: CampaignExecuteButtonProps) {
  const [isExecuting, setIsExecuting] = useState(false)
  const [result, setResult] = useState<{ execution_id: string; message: string } | null>(null)
  const [error, setError] = useState("")

  async function handleExecute() {
    try {
      setIsExecuting(true)
      setError("")
      const res = await executeCampaign({
        request_id: requestId,
        campaign_data: campaignData,
      })
      setResult({
        execution_id: res.execution_id,
        message: res.message,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to execute campaign")
    } finally {
      setIsExecuting(false)
    }
  }

  if (result) {
    return (
      <section>
        <h2>Campaign Launched</h2>
        <p>Execution ID: {result.execution_id}</p>
        <p>{result.message}</p>
        <p>Your campaign has been scheduled for execution.</p>
      </section>
    )
  }

  return (
    <section>
      <h2>Launch Campaign</h2>
      
      <div>
        <p>Channels: {campaignData.channels.join(", ")}</p>
        <p>Target Count: {campaignData.target_count}</p>
      </div>

      {error && <p>{error}</p>}

      <button onClick={handleExecute} disabled={isExecuting}>
        {isExecuting ? "Launching..." : "Launch Campaign"}
      </button>
    </section>
  )
}