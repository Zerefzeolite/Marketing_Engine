import { describe, expect, it } from "vitest"
import {
  getInitialModerationPhaseState,
  resolveModerationPhase,
} from "../app/campaign-flow/moderationPhase"

describe("campaign flow phase 4 moderation", () => {
  it("opens manual review popup on third failed moderation check", () => {
    const initial = getInitialModerationPhaseState()

    const afterFirstFail = resolveModerationPhase(initial, {
      passed: false,
      failedChecks: 1,
    })
    const afterSecondFail = resolveModerationPhase(afterFirstFail, {
      passed: false,
      failedChecks: 2,
    })
    const afterThirdFail = resolveModerationPhase(afterSecondFail, {
      passed: false,
      failedChecks: 3,
    })

    expect(afterThirdFail.showManualReviewPopup).toBe(true)
    expect(afterThirdFail.flowStep).toBe("moderation")
  })

  it("moves to draft expiry notice when manual review returns DRAFT_HELD", () => {
    const afterThirdFail = resolveModerationPhase(getInitialModerationPhaseState(), {
      passed: false,
      failedChecks: 3,
    })

    const declined = resolveModerationPhase(afterThirdFail, {
      manualReviewStatus: "DRAFT_HELD",
    })

    expect(declined.flowStep).toBe("draft_expired")
    expect(declined.showManualReviewPopup).toBe(false)
  })

  it("moves to under-review state when manual review is accepted", () => {
    const afterThirdFail = resolveModerationPhase(getInitialModerationPhaseState(), {
      passed: false,
      failedChecks: 3,
    })

    const accepted = resolveModerationPhase(afterThirdFail, {
      manualReviewStatus: "UNDER_MANUAL_REVIEW",
    })

    expect(accepted.flowStep).toBe("under_review")
    expect(accepted.showManualReviewPopup).toBe(false)
  })
})
