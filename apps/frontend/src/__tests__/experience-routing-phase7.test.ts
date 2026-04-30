import { describe, expect, it } from "vitest"

import {
  CAMPAIGN_FLOW_EXPLAINER,
  CONTINUE_TO_FLOW,
  INTAKE_EXPLAINER,
} from "../lib/experience-routing"

describe("experience routing copy", () => {
  it("defines quick-estimate and full-flow explainers", () => {
    expect(INTAKE_EXPLAINER).toContain("Quick Estimate Only")
    expect(CAMPAIGN_FLOW_EXPLAINER).toContain("Full Campaign Flow")
  })

  it("points intake CTA to full campaign flow route", () => {
    expect(CONTINUE_TO_FLOW.href).toBe("/campaign-flow")
    expect(CONTINUE_TO_FLOW.label).toBe("Continue to Full Campaign Flow")
  })
})
