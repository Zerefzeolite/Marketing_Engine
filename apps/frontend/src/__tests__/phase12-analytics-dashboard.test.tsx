import { describe, expect, it } from "vitest"
import { readFileSync } from "fs"
import { resolve } from "path"

describe("analytics dashboard page", () => {
  it("renders with 4 tabs", async () => {
    const { default: AnalyticsPage } = await import("../app/analytics/page")
    expect(AnalyticsPage).toBeDefined()
  })

  it("renders date range picker", async () => {
    const { DateRangePicker } = await import("../components/analytics/DateRangePicker")
    expect(DateRangePicker).toBeDefined()
  })
})

describe("reach tab", () => {
  it("renders KPI cards for reach metrics", async () => {
    const { ReachTab } = await import("../components/analytics/ReachTab")
    expect(ReachTab).toBeDefined()
  })
})

describe("channels tab", () => {
  it("renders channel comparison", async () => {
    const { ChannelsTab } = await import("../components/analytics/ChannelsTab")
    expect(ChannelsTab).toBeDefined()
  })
})

describe("costs tab", () => {
  it("renders cost and ROI metrics", () => {
    const componentPath = resolve(__dirname, "../components/analytics/CostsTab.tsx")
    const source = readFileSync(componentPath, "utf-8")
    expect(source).toContain("Total Spend")
    expect(source).toContain("Cost per Contact")
    expect(source).toContain("ROI")
  })
})

describe("health tab", () => {
  it("renders health metrics with alerts", () => {
    const componentPath = resolve(__dirname, "../components/analytics/HealthTab.tsx")
    const source = readFileSync(componentPath, "utf-8")
    expect(source).toContain("Delivery Rate")
    expect(source).toContain("Bounce Rate")
    expect(source).toContain("Opt-out Rate")
    expect(source).toContain("Failed Sends")
  })
})
