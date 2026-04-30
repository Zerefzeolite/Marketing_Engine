"use client"

import { useEffect, useState } from "react"
import { KPICard } from "./KPICard"
import { SectionCard } from "../ui/SectionCard"

interface TabProps {
  dateRange: { start: Date; end: Date }
}

interface ChannelsData {
  email: { sent: number; delivered: number; opens: number; clicks: number }
  sms: { sent: number; delivered: number; opens: number; clicks: number }
  social: { sent: number; delivered: number; opens: number; clicks: number }
}

interface CostsData {
  spend: number
  revenue: number
  roi: number
}

interface AggregatedData {
  channels: ChannelsData
  costs: CostsData
}

const API_BASE = "/api/campaigns"

async function fetchAggregated(): Promise<AggregatedData | null> {
  try {
    const res = await fetch(`${API_BASE}/aggregated`)
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

function calculateMetrics(ch: AggregatedData["channels"][keyof AggregatedData["channels"]]) {
  const deliveryRate = ch.sent > 0 ? (ch.delivered / ch.sent) * 100 : 0
  const openRate = ch.delivered > 0 ? (ch.opens / ch.delivered) * 100 : 0
  const clickRate = ch.opens > 0 ? (ch.clicks / ch.opens) * 100 : 0
  return { deliveryRate, openRate, clickRate }
}

const channelLabels: Record<string, string> = {
  email: "Email",
  sms: "SMS",
  social: "Social",
}

export function ChannelsTab({ dateRange }: TabProps) {
  const [data, setData] = useState<AggregatedData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAggregated().then((d) => {
      setData(d)
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>
        Loading channels...
      </div>
    )
  }

  if (!data) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#ef4444" }}>
        Failed to load channel data
      </div>
    )
  }

  const channels = ["email", "sms", "social"] as const
  const totalCost = data.costs.spend

  return (
    <div>
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 24 }}>
        {channels.map((chKey) => {
          const ch = data.channels[chKey]
          const metrics = calculateMetrics(ch)
          const channelCost = ch.sent > 0 ? (ch.sent / (data.channels.email.sent + data.channels.sms.sent + data.channels.social.sent)) * totalCost : 0
          return (
            <SectionCard key={chKey}>
              <h4 style={{ marginTop: 0 }}>{channelLabels[chKey]}</h4>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <KPICard
                  label="Sent"
                  value={ch.sent}
                  unit="count"
                  trend="flat"
                  trendValue={0}
                  alert="none"
                />
                <KPICard
                  label="Open Rate"
                  value={metrics.openRate}
                  unit="percentage"
                  trend="up"
                  trendValue={1.5}
                  alert="none"
                />
                <KPICard
                  label="Click Rate"
                  value={metrics.clickRate}
                  unit="percentage"
                  trend="up"
                  trendValue={2.1}
                  alert="none"
                />
                <KPICard
                  label="Cost"
                  value={channelCost}
                  unit="currency"
                  trend="down"
                  trendValue={0.05}
                  alert="none"
                />
              </div>
            </SectionCard>
          )
        })}
      </div>
      <SectionCard>
        <h4>Channel Comparison</h4>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
              <th style={{ textAlign: "left", padding: 8 }}>Channel</th>
              <th style={{ textAlign: "right", padding: 8 }}>Sent</th>
              <th style={{ textAlign: "right", padding: 8 }}>Delivered</th>
              <th style={{ textAlign: "right", padding: 8 }}>Opened</th>
              <th style={{ textAlign: "right", padding: 8 }}>Clicked</th>
            </tr>
          </thead>
          <tbody>
            {channels.map((chKey) => {
              const ch = data.channels[chKey]
              return (
                <tr key={chKey} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: 8 }}>{channelLabels[chKey]}</td>
                  <td style={{ textAlign: "right", padding: 8 }}>{ch.sent.toLocaleString()}</td>
                  <td style={{ textAlign: "right", padding: 8 }}>{ch.delivered.toLocaleString()}</td>
                  <td style={{ textAlign: "right", padding: 8 }}>{ch.opens.toLocaleString()}</td>
                  <td style={{ textAlign: "right", padding: 8 }}>{ch.clicks.toLocaleString()}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </SectionCard>
    </div>
  )
}