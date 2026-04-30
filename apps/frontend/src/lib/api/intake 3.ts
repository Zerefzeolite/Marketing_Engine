import {
  IntakeSubmitResponseSchema,
  type IntakeSubmitRequest,
  IntakeSubmitRequestSchema,
} from "../contracts/intake"
import {
  IntakeEstimateResponseSchema,
  IntakeRecommendResponseSchema,
  RecommendationPreviewSchema,
  type RecommendationPreviewData,
} from "../contracts/recommendation"

const PACKAGE_BY_BUDGET = {
  starter: 1000,
  growth: 5000,
  premium: 12000,
} as const

export function generateRecommendation(
  request: IntakeSubmitRequest,
): RecommendationPreviewData {
  const parsed = IntakeSubmitRequestSchema.parse(request)

  const budgetMax = parsed.budget_max ?? parsed.budget_min
  const averageBudget = Math.round((parsed.budget_min + budgetMax) / 2)

  const recommendedPackage =
    averageBudget >= PACKAGE_BY_BUDGET.premium
      ? "premium"
      : averageBudget >= PACKAGE_BY_BUDGET.growth
        ? "growth"
        : "starter"

  const channelMultiplier = parsed.preferred_channel === "both" ? 1.4 : 1
  const estimatedReachable = Math.round((averageBudget / 10) * channelMultiplier)
  const confidence = parsed.campaign_objective.trim().length >= 12 ? 0.88 : 0.72
  const channelSplit =
    parsed.preferred_channel === "both"
      ? "email: 60%, sms: 40%"
      : parsed.preferred_channel === "email"
        ? "email: 100%"
        : "sms: 100%"
  const rationale = `Based on budget and preferred channel (${parsed.preferred_channel}), this package gives the best projected reach.`

  return RecommendationPreviewSchema.parse({
    estimated_reachable: estimatedReachable,
    recommended_package: recommendedPackage,
    channel_split: channelSplit,
    rationale_summary: rationale,
    confidence,
  })
}

async function parseJsonOrThrow(response: Response): Promise<unknown> {
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`)
  }
  return response.json()
}

export async function fetchRecommendationFromApi(
  request: IntakeSubmitRequest,
  apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000",
): Promise<{ requestId: string; summary: Record<string, string>; recommendation: RecommendationPreviewData }> {
  const parsed = IntakeSubmitRequestSchema.parse(request)

  const submitRes = await fetch(`${apiBaseUrl}/intake/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(parsed),
  })
  const submitPayload = IntakeSubmitResponseSchema.parse(
    await parseJsonOrThrow(submitRes),
  )

  const estimateRes = await fetch(`${apiBaseUrl}/intake/estimate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ schema_version: "1.0", request_id: submitPayload.request_id }),
  })
  const estimatePayload = IntakeEstimateResponseSchema.parse(
    await parseJsonOrThrow(estimateRes),
  )

  const recommendRes = await fetch(`${apiBaseUrl}/intake/recommend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      schema_version: "1.0",
      estimated_reachable: estimatePayload.estimated_reachable,
      budget_min: parsed.budget_min,
    }),
  })
  const recommendPayload = IntakeRecommendResponseSchema.parse(
    await parseJsonOrThrow(recommendRes),
  )

  const confidenceScore =
    estimatePayload.confidence === "high"
      ? 0.9
      : estimatePayload.confidence === "medium"
        ? 0.75
        : 0.6

  const recommendation = RecommendationPreviewSchema.parse({
    estimated_reachable: estimatePayload.estimated_reachable,
    recommended_package: recommendPayload.recommended_package,
    channel_split: estimatePayload.channel_split,
    rationale_summary: recommendPayload.rationale_summary,
    confidence: confidenceScore,
  })

  return {
    requestId: submitPayload.request_id,
    summary: submitPayload.normalized_summary,
    recommendation,
  }
}
