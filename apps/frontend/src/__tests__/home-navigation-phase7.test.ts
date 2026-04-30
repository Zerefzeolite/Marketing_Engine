import { describe, expect, it } from "vitest"

import { HOME_ROUTE_CARDS } from "../lib/home-navigation"

describe("home navigation", () => {
  it("exposes all primary application routes", () => {
    const hrefs = HOME_ROUTE_CARDS.map((card) => card.href)
    expect(hrefs).toEqual(["/intake", "/campaign-flow", "/quality-gate"])
  })

  it("includes labels that separate quick estimate from full flow", () => {
    const byHref = Object.fromEntries(
      HOME_ROUTE_CARDS.map((card) => [card.href, card.title]),
    ) as Record<string, string>

    expect(byHref["/intake"]).toContain("Intake")
    expect(byHref["/campaign-flow"]).toContain("Flow")
  })
})
