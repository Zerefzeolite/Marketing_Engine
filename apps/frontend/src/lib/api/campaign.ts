import {
  CampaignManualReviewRequestSchema,
  CampaignManualReviewResponseSchema,
  CampaignModerationCheckRequestSchema,
  CampaignModerationCheckResponseSchema,
  CampaignSessionStartRequestSchema,
  CampaignSessionStartResponseSchema,
  ManualReviewCompletionResponseSchema,
  ManualReviewDecisionRequestSchema,
  SessionResumeRequestSchema,
  SessionResumeResponseSchema,
  TemplateGenerateRequestSchema,
  TemplateGenerateResponseSchema,
  type CampaignManualReviewRequest,
  type CampaignManualReviewResponse,
  type CampaignModerationCheckRequest,
  type CampaignModerationCheckResponse,
  type CampaignSessionStartRequest,
  type CampaignSessionStartResponse,
  type ManualReviewCompletionResponse,
  type ManualReviewDecisionRequest,
  type SessionResumeRequest,
  type SessionResumeResponse,
  type TemplateGenerateRequest,
  type TemplateGenerateResponse,
} from "../contracts/campaign"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

async function parseJsonOrThrow(response: Response): Promise<unknown> {
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`)
  }
  return response.json()
}

export async function startCampaignSession(
  request: CampaignSessionStartRequest,
): Promise<CampaignSessionStartResponse> {
  const parsed = CampaignSessionStartRequestSchema.parse(request)

  const response = await fetch(`${API_BASE}/campaigns/session/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(parsed),
  })

  return CampaignSessionStartResponseSchema.parse(await parseJsonOrThrow(response))
}

export async function runCampaignModerationCheck(
  request: CampaignModerationCheckRequest,
): Promise<CampaignModerationCheckResponse> {
  const parsed = CampaignModerationCheckRequestSchema.parse(request)

  const response = await fetch(`${API_BASE}/campaigns/moderation/check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(parsed),
  })

  return CampaignModerationCheckResponseSchema.parse(await parseJsonOrThrow(response))
}

export async function requestCampaignManualReview(
  request: CampaignManualReviewRequest,
): Promise<CampaignManualReviewResponse> {
  const parsed = CampaignManualReviewRequestSchema.parse(request)

  const response = await fetch(`${API_BASE}/campaigns/moderation/manual-review/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(parsed),
  })

  return CampaignManualReviewResponseSchema.parse(await parseJsonOrThrow(response))
}

export async function generateCampaignTemplate(
  request: TemplateGenerateRequest,
): Promise<TemplateGenerateResponse> {
  const parsed = TemplateGenerateRequestSchema.parse(request)

  const response = await fetch(`${API_BASE}/campaigns/template/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(parsed),
  })

  return TemplateGenerateResponseSchema.parse(await parseJsonOrThrow(response))
}

export async function resumeCampaignSession(
  request: SessionResumeRequest,
): Promise<SessionResumeResponse> {
  const parsed = SessionResumeRequestSchema.parse(request)

  const response = await fetch(`${API_BASE}/campaigns/session/resume`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(parsed),
  })

  return SessionResumeResponseSchema.parse(await parseJsonOrThrow(response))
}

export async function completeManualReviewDecision(
  request: ManualReviewDecisionRequest,
): Promise<ManualReviewCompletionResponse> {
  const parsed = ManualReviewDecisionRequestSchema.parse(request)

  const response = await fetch(`${API_BASE}/campaigns/moderation/manual-review/decision`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(parsed),
  })

  return ManualReviewCompletionResponseSchema.parse(await parseJsonOrThrow(response))
}
