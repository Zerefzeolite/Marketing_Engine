export type HomeRouteCard = {
  href: string
  title: string
  description: string
  intent: "quick" | "full" | "ops"
}

export const HOME_ROUTE_CARDS: HomeRouteCard[] = [
  {
    href: "/intake",
    title: "Campaign Intake",
    description: "Quick estimate and recommendation preview from intake details.",
    intent: "quick",
  },
  {
    href: "/campaign-flow",
    title: "Campaign Flow",
    description: "Full workflow: intake, consent, moderation, payment, and execution.",
    intent: "full",
  },
  {
    href: "/quality-gate",
    title: "Quality Gate",
    description: "Operational assessment board for findings, retests, and readiness.",
    intent: "ops",
  },
]
