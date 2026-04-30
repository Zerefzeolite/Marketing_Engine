import {
  CampaignEventRequestSchema,
  CampaignEventResponseSchema,
  CampaignMetricsResponseSchema,
  type CampaignEventRequest,
  type CampaignEventResponse,
  type CampaignMetricsResponse,
} from "../contracts/analytics"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

async function parseJsonOrThrow(response: Response): Promise<unknown> {
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`)
  }
  return response.json()
}

export async function recordCampaignEvent(
  campaignId: string,
  request: CampaignEventRequest,
): Promise<CampaignEventResponse> {
  const parsed = CampaignEventRequestSchema.parse(request)

  const response = await fetch(`${API_BASE}/campaigns/${campaignId}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(parsed),
  })

  return CampaignEventResponseSchema.parse(await parseJsonOrThrow(response))
}

export async function getCampaignMetrics(
  campaignId: string,
): Promise<CampaignMetricsResponse> {
  const response = await fetch(`${API_BASE}/campaigns/${campaignId}/metrics`)

  return CampaignMetricsResponseSchema.parse(await parseJsonOrThrow(response))
}

export async function getContactInteractions(
  contactId: string,
): Promise<unknown[]> {
  const response = await fetch(`${API_BASE}/campaigns/contacts/${contactId}/interactions`)

  const data = await parseJsonOrThrow(response)
  return Array.isArray(data) ? data : []
}
