import { describe, expect, it } from "vitest"
import { IntakeSubmitRequestSchema } from "../lib/contracts/intake"
import { nextStep, previousStep } from "../lib/intake-step"
import {
  buildValidationMessage,
  getStep1Errors,
} from "../lib/intake-validation"

describe("intake contract", () => {
  it("validates campaign objective as required", () => {
    const result = IntakeSubmitRequestSchema.safeParse({
      schema_version: "1.0",
      business_name: "Example Co",
      contact_email: "owner@example.com",
      preferred_channel: "email",
      budget_min: 100,
      budget_max: null,
    })

    expect(result.success).toBe(false)
  })

  it("rejects budget range where max is lower than min", () => {
    const result = IntakeSubmitRequestSchema.safeParse({
      schema_version: "1.0",
      business_name: "Example Co",
      contact_email: "owner@example.com",
      campaign_objective: "Promote event",
      preferred_channel: "email",
      budget_min: 500,
      budget_max: 100,
    })

    expect(result.success).toBe(false)
  })

  it("supports step transitions for wizard flow", () => {
    expect(nextStep(1)).toBe(2)
    expect(nextStep(2)).toBe(2)
    expect(previousStep(2)).toBe(1)
    expect(previousStep(1)).toBe(1)
  })

  it("returns step-one errors when core fields are missing", () => {
    const errors = getStep1Errors({
      schema_version: "1.0",
      business_name: "",
      contact_email: "not-an-email",
      campaign_objective: "",
      target_geography: "Kingston",
      demographic_preferences: "Women 25-40",
      campaign_timeline: "3 Month",
      preferred_channel: "email",
      budget_min: 10000,
      budget_max: 300000,
    })

    expect(errors.map((item) => item.field)).toEqual([
      "business_name",
      "contact_email",
      "campaign_objective",
    ])
  })

  it("builds explicit missing-fields validation message", () => {
    expect(
      buildValidationMessage(["Business Name", "Contact Email"]),
    ).toBe("Please complete required fields: Business Name, Contact Email.")
  })
})
