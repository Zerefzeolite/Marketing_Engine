"use client"

type ManualReviewPopupProps = {
  open: boolean
  isSubmitting: boolean
  errorMessage?: string
  onAccept: () => void
  onDecline: () => void
}

export function ManualReviewPopup({
  open,
  isSubmitting,
  errorMessage,
  onAccept,
  onDecline,
}: ManualReviewPopupProps) {
  if (!open) {
    return null
  }

  return (
    <section role="dialog" aria-modal="true" aria-label="Manual review required">
      <h2>Manual Review Required</h2>
      <p>
        We were unable to auto-approve this campaign after 3 checks. A specialist can review
        it in 30 minutes to 2 hours.
      </p>
      {errorMessage && <p>{errorMessage}</p>}

      <button type="button" onClick={onAccept} disabled={isSubmitting}>
        {isSubmitting ? "Submitting..." : "Request manual review"}
      </button>
      <button type="button" onClick={onDecline} disabled={isSubmitting}>
        Decline and close draft
      </button>
    </section>
  )
}
