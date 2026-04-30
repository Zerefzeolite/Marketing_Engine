"use client"

import { useEffect, useState } from "react"
import { KPICard } from "./KPICard"
import { SectionCard } from "../ui/SectionCard"

interface TabProps {
  dateRange: { start: Date; end: Date }
}

interface HealthData {
  delivery: { sent: number; delivered: number; failed: number }
  interactions: { opt_outs: number }
}

const API_BASE = "/api/campaigns"

async function fetchHealth(): Promise<HealthData | null> {
  try {
    const res = await fetch(`${API_BASE}/aggregated`)
    if (!res.ok) return null
    const data = await res.json()
    return {
      delivery: data.delivery,
      interactions: data.interactions,
    }
  } catch {
    return null
  }
}

function getDeliveryAlert(rate: number): "none" | "warning" | "error" {
  if (rate < 50) return "error"
  if (rate < 85) return "warning"
  return "none"
}

function getBounceAlert(bounced: number, sent: number): "none" | "warning" | "error" {
  if (sent === 0) return "none"
  const bounceRate = (bounced / sent) * 100
  if (bounceRate > 25) return "error"
  if (bounceRate > 10) return "warning"
  return "none"
}

function getOptOutAlert(rate: number): "none" | "warning" | "error" {
  if (rate > 15) return "error"
  if (rate > 5) return "warning"
  return "none"
}

export function HealthTab({ dateRange }: TabProps) {
  const [data, setData] = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchHealth().then((d) => {
      setData(d)
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>
        Loading health...
      </div>
    )
  }

  if (!data) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#ef4444" }}>
        Failed to load health data
      </div>
    )
  }

  const sent = data.delivery.sent
  const delivered = data.delivery.delivered
  const failed = data.delivery.failed
  const optedOut = data.interactions.opt_outs
  const bounced = sent - delivered - failed

  const deliveryRate = sent > 0 ? (delivered / sent) * 100 : 0
  const bounceRate = sent > 0 ? (bounced / sent) * 100 : 0
  const optOutRate = sent > 0 ? (optedOut / sent) * 100 : 0

  return (
    <div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
        <KPICard
          label="Delivery Rate"
          value={deliveryRate}
          unit="percentage"
          trend="up"
          trendValue={1.2}
          alert={getDeliveryAlert(deliveryRate)}
        />
        <KPICard
          label="Bounce Rate"
          value={bounceRate}
          unit="percentage"
          trend="down"
          trendValue={0.5}
          alert={getBounceAlert(bounced, sent)}
        />
        <KPICard
          label="Opt-out Rate"
          value={optOutRate}
          unit="percentage"
          trend="up"
          trendValue={0.8}
          alert={getOptOutAlert(optOutRate)}
        />
        <KPICard
          label="Failed Sends"
          value={failed}
          unit="count"
          trend="down"
          trendValue={2.1}
          alert={failed > 500 ? "error" : "none"}
        />
      </div>
      <SectionCard>
        <h4>Health Status</h4>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 24 }}>
          <div>
            <div style={{ color: "#6b7280", fontSize: 14, marginBottom: 4 }}>Total Sent</div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>{sent.toLocaleString()}</div>
          </div>
          <div>
            <div style={{ color: "#6b7280", fontSize: 14, marginBottom: 4 }}>Successfully Delivered</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: "#22c55e" }}>{delivered.toLocaleString()}</div>
          </div>
          <div>
            <div style={{ color: "#6b7280", fontSize: 14, marginBottom: 4 }}>Bounced</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: "#f59e0b" }}>{bounced.toLocaleString()}</div>
          </div>
          <div>
            <div style={{ color: "#6b7280", fontSize: 14, marginBottom: 4 }}>Opted Out</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: "#ef4444" }}>{optedOut.toLocaleString()}</div>
          </div>
        </div>
      </SectionCard>
    </div>
  )
}
