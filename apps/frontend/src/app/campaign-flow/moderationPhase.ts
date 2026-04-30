export type FlowStep =
  | "intake"
  | "consent"
  | "campaign_setup"
  | "moderation"
  | "under_review"
  | "payment"
  | "status"
  | "execute"
  | "draft_expired"

export type ModerationPhaseState = {
  flowStep: FlowStep
  failedModerationChecks: number
  showManualReviewPopup: boolean
}

type ModerationPhaseEvent =
  | {
      passed: boolean
      failedChecks: number
    }
  | {
      manualReviewStatus: "UNDER_MANUAL_REVIEW" | "DRAFT_HELD"
    }

export function getInitialModerationPhaseState(): ModerationPhaseState {
  return {
    flowStep: "moderation",
    failedModerationChecks: 0,
    showManualReviewPopup: false,
  }
}

export function resolveModerationPhase(
  state: ModerationPhaseState,
  event: ModerationPhaseEvent,
): ModerationPhaseState {
  if ("manualReviewStatus" in event) {
    if (event.manualReviewStatus === "UNDER_MANUAL_REVIEW") {
      return {
        ...state,
        flowStep: "under_review",
        showManualReviewPopup: false,
      }
    }

    return {
      ...state,
      flowStep: "draft_expired",
      showManualReviewPopup: false,
    }
  }

  if (event.passed) {
    return {
      ...state,
      flowStep: "payment",
      failedModerationChecks: event.failedChecks,
      showManualReviewPopup: false,
    }
  }

  return {
    ...state,
    flowStep: "moderation",
    failedModerationChecks: event.failedChecks,
    showManualReviewPopup: event.failedChecks >= 3,
  }
}
