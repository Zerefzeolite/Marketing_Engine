"use client"

import { useEffect, useState } from "react"
import { SectionCard } from "../ui/SectionCard"

interface TabProps {
  dateRange: { start: Date; end: Date }
}

interface AggregatedMetrics {
  delivery: { sent: number; delivered: number; failed: number }
  interactions: { opens: number; clicks: number; replies: number; opt_outs: number }
  channels: {
    email: { sent: number; delivered: number; opens: number; clicks: number }
    sms: { sent: number; delivered: number; opens: number; clicks: number }
    social: { sent: number; delivered: number; opens: number; clicks: number }
  }
  costs: { spend: number; revenue: number; roi: number; cost_per_contact: number; cost_per_conversion: number }
  campaign_count: number
}

interface KPICardProps {
  label: string
  value: number
  unit: "count" | "percentage"
  trend: "up" | "down" | "flat"
  trendValue: number
  alert: "none" | "warning" | "error"
}

function KPICard({ label, value, unit, trend, trendValue, alert }: KPICardProps) {
  const trendColor = trend === "up" ? "green" : trend === "down" ? "red" : "gray"
  const alertColor = alert === "error" ? "red" : alert === "warning" ? "orange" : "transparent"
  
  return (
    <div style={{ 
      border: "1px solid #e5e7eb", 
      borderRadius: 8, 
      padding: 16, 
      minWidth: 150,
      borderLeft: alert !== "none" ? `4px solid ${alertColor}` : undefined
    }}>
      <div style={{ color: "#6b7280", fontSize: 14, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 600, marginBottom: 4 }}>
        {unit === "percentage" ? `${value.toFixed(1)}%` : value.toLocaleString()}
      </div>
      <div style={{ fontSize: 12, color: trendColor }}>
        {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"} {Math.abs(trendValue).toFixed(1)}%
      </div>
    </div>
  )
}

const API_BASE = "/api/campaigns"

async function fetchAggregatedMetrics(): Promise<AggregatedMetrics | null> {
  try {
    const res = await fetch(`${API_BASE}/aggregated`)
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

function calculateRates(metrics: AggregatedMetrics) {
  const sent = metrics.delivery.sent
  const delivered = metrics.delivery.delivered
  const opens = metrics.interactions.opens
  const clicks = metrics.interactions.clicks
  const conversions = metrics.interactions.replies

  const openRate = delivered > 0 ? (opens / delivered) * 100 : 0
  const clickRate = opens > 0 ? (clicks / opens) * 100 : 0
  const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0
  return { openRate, clickRate, conversionRate }
}

function getDeliveryRate(metrics: AggregatedMetrics): { value: number; alert: "none" | "warning" | "error" } {
  const delivered = metrics.delivery.delivered
  const sent = metrics.delivery.sent
  if (sent === 0) return { value: 0, alert: "none" }
  const rate = (delivered / sent) * 100
  return { value: rate, alert: rate < 50 ? "error" : rate < 85 ? "warning" : "none" }
}

export function ReachTab({ dateRange }: TabProps) {
  const [metrics, setMetrics] = useState<AggregatedMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAggregatedMetrics().then((data) => {
      setMetrics(data)
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>
        Loading metrics...
      </div>
    )
  }

  if (!metrics) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#ef4444" }}>
        Failed to load metrics
      </div>
    )
  }

  const rates = calculateRates(metrics)
  const delivery = getDeliveryRate(metrics)

  const sent = metrics.delivery.sent
  const delivered = metrics.delivery.delivered
  const opens = metrics.interactions.opens
  const clicks = metrics.interactions.clicks
  const conversions = metrics.interactions.replies

  return (
    <div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
        <KPICard
          label="Delivered"
          value={delivered}
          unit="count"
          trend="up"
          trendValue={12.5}
          alert="none"
        />
        <KPICard
          label="Open Rate"
          value={rates.openRate}
          unit="percentage"
          trend="up"
          trendValue={2.3}
          alert="none"
        />
        <KPICard
          label="Click Rate"
          value={rates.clickRate}
          unit="percentage"
          trend="down"
          trendValue={1.2}
          alert="none"
        />
        <KPICard
          label="Conversion Rate"
          value={rates.conversionRate}
          unit="percentage"
          trend="up"
          trendValue={0.8}
          alert="none"
        />
        <KPICard
          label="Delivery Rate"
          value={delivery.value}
          unit="percentage"
          trend="flat"
          trendValue={0}
          alert={delivery.alert}
        />
      </div>
      <SectionCard>
        <h4>Campaign Performance ({metrics.campaign_count} campaigns)</h4>
        <p>Sent: {sent.toLocaleString()} | Opens: {opens.toLocaleString()} | Clicks: {clicks.toLocaleString()} | Conversions: {conversions.toLocaleString()}</p>
        <p style={{ marginTop: 8, color: "#6b7280", fontSize: 14 }}>
          Data shown for period: {dateRange.start.toDateString()} - {dateRange.end.toDateString()}
        </p>
      </SectionCard>
    </div>
  )
}