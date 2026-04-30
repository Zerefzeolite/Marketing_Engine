"use client"

import { useEffect, useState } from "react"
import { KPICard } from "./KPICard"
import { SectionCard } from "../ui/SectionCard"

interface TabProps {
  dateRange: { start: Date; end: Date }
}

interface AggregatedCosts {
  delivery: { delivered: number }
  interactions: { replies: number }
  costs: { spend: number; revenue: number; roi: number; cost_per_contact: number; cost_per_conversion: number }
}

const API_BASE = "/api/campaigns"

async function fetchCosts(): Promise<AggregatedCosts | null> {
  try {
    const res = await fetch(`${API_BASE}/aggregated`)
    if (!res.ok) return null
    const data = await res.json()
    return {
      delivery: data.delivery,
      interactions: data.interactions,
      costs: data.costs,
    }
  } catch {
    return null
  }
}

function calculateROI(spend: number, revenue: number): { roi: number; alert: "none" | "warning" | "error" } {
  if (spend === 0) return { roi: 0, alert: "none" }
  const roi = ((revenue - spend) / spend) * 100
  return { roi, alert: roi < 0 ? "error" : roi < 100 ? "warning" : "none" }
}

export function CostsTab({ dateRange }: TabProps) {
  const [data, setData] = useState<AggregatedCosts | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCosts().then((d) => {
      setData(d)
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>
        Loading costs...
      </div>
    )
  }

  if (!data) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#ef4444" }}>
        Failed to load cost data
      </div>
    )
  }

  const totalSpend = data.costs.spend
  const revenue = data.costs.revenue
  const totalContacts = data.delivery.delivered
  const conversions = data.interactions.replies
  const roi = calculateROI(totalSpend, revenue)

  return (
    <div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
        <KPICard
          label="Total Spend"
          value={totalSpend}
          unit="currency"
          trend="up"
          trendValue={5.2}
          alert="none"
        />
        <KPICard
          label="Cost per Contact"
          value={data.costs.cost_per_contact}
          unit="currency"
          trend="down"
          trendValue={0.02}
          alert="none"
        />
        <KPICard
          label="Cost per Conversion"
          value={data.costs.cost_per_conversion}
          unit="currency"
          trend="down"
          trendValue={1.5}
          alert="none"
        />
        <KPICard
          label="ROI"
          value={roi.roi}
          unit="percentage"
          trend="up"
          trendValue={15}
          alert={roi.alert}
        />
      </div>
      <SectionCard>
        <h4>Cost Breakdown</h4>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          <div>
            <div style={{ color: "#6b7280", fontSize: 14 }}>Spend</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>${totalSpend.toLocaleString()}</div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Total ad spend</div>
          </div>
          <div>
            <div style={{ color: "#6b7280", fontSize: 14 }}>Revenue</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>${revenue.toLocaleString()}</div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Campaign revenue</div>
          </div>
          <div>
            <div style={{ color: "#6b7280", fontSize: 14 }}>Profit</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: revenue > 0 ? "#16a34a" : "#dc2626" }}>
              ${(revenue - totalSpend).toLocaleString()}
            </div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Net profit</div>
          </div>
        </div>
      </SectionCard>
    </div>
  )
}
