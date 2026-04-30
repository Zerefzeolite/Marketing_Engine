"use client"

import { useState } from "react"
import { RouteHeader } from "../../components/ui/RouteHeader"
import { SectionCard } from "../../components/ui/SectionCard"
import { DateRangePicker } from "../../components/analytics/DateRangePicker"
import { ReachTab } from "../../components/analytics/ReachTab"
import { ChannelsTab } from "../../components/analytics/ChannelsTab"
import { CostsTab } from "../../components/analytics/CostsTab"
import { HealthTab } from "../../components/analytics/HealthTab"

type TabId = "reach" | "channels" | "costs" | "health"

const tabs: { id: TabId; label: string }[] = [
  { id: "reach", label: "Reach" },
  { id: "channels", label: "Channels" },
  { id: "costs", label: "Costs" },
  { id: "health", label: "Health" },
]

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("reach")
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: new Date(),
  })

  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
      <RouteHeader
        title="Analytics Dashboard"
        intent="Monitor campaign performance and health metrics"
      />
      <SectionCard>
        <DateRangePicker
          startDate={dateRange.start}
          endDate={dateRange.end}
          onChange={(start, end) => setDateRange({ start, end })}
        />
      </SectionCard>
      <div style={{ display: "flex", gap: 8, marginBottom: 24, borderBottom: "1px solid #e5e7eb" }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "12px 24px",
              background: "transparent",
              border: "none",
              borderBottom: activeTab === tab.id ? "2px solid #3b82f6" : "2px solid transparent",
              color: activeTab === tab.id ? "#3b82f6" : "#6b7280",
              fontWeight: activeTab === tab.id ? 600 : 400,
              cursor: "pointer",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {activeTab === "reach" && <ReachTab dateRange={dateRange} />}
      {activeTab === "channels" && <ChannelsTab dateRange={dateRange} />}
      {activeTab === "costs" && <CostsTab dateRange={dateRange} />}
      {activeTab === "health" && <HealthTab dateRange={dateRange} />}
    </main>
  )
}
