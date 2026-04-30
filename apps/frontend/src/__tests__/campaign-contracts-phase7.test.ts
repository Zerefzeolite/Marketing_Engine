import { describe, expect, it } from "vitest"

import {
  ManualReviewCompletionResponseSchema,
} from "../lib/contracts/campaign"

describe("campaign contracts", () => {
  it("loads manual review completion schema without duplicate declaration errors", () => {
    const parsed = ManualReviewCompletionResponseSchema.parse({
      schema_version: "1.0",
      campaign_session_id: "SES-123",
      status: "APPROVED",
      payment_link_eligible: true,
    })

    expect(parsed.campaign_session_id).toBe("SES-123")
    expect(parsed.status).toBe("APPROVED")
    expect(parsed.payment_link_eligible).toBe(true)
  })
})
