type AdivsoryEventName =
  | "recommendation_presented"
  | "recommendation_accepted"
  | "advisory_viewed"
  | "advisory_suggestion_applied"

const VALID_EVENTS: AdivsoryEventName[] = [
  "recommendation_presented",
  "recommendation_accepted",
  "advisory_viewed",
  "advisory_suggestion_applied",
]

type DataLayerEntry = {
  event: AdivsoryEventName
} & Record<string, unknown>

declare global {
  interface Window {
    dataLayer: DataLayerEntry[]
  }
}

export function trackAdvisoryEvent(
  name: AdivsoryEventName,
  payload: Record<string, unknown>,
): void {
  if (!VALID_EVENTS.includes(name)) {
    throw new Error(`Invalid event name: ${name}`)
  }

  if (typeof window === "undefined" || !window.dataLayer) {
    window.dataLayer = []
  }

  window.dataLayer.push({
    event: name,
    ...payload,
  })
}