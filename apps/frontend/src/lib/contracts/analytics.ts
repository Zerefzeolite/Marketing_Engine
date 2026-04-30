import { z } from "zod"

export const CampaignEventRequestSchema = z.object({
  schema_version: z.literal("1.0").default("1.0"),
  campaign_id: z.string().min(1),
  contact_id: z.string().min(1),
  event_type: z.enum(["SENT", "DELIVERED", "FAILED", "OPENED", "CLICKED", "REPLIED", "OPT_OUT"]),
})

export const CampaignEventResponseSchema = z.object({
  schema_version: z.literal("1.0").default("1.0"),
  campaign_id: z.string(),
  delivery: z.record(z.number()),
  interactions: z.record(z.number()),
})

export const CampaignMetricsResponseSchema = z.object({
  schema_version: z.literal("1.0").default("1.0"),
  campaign_id: z.string(),
  delivery: z.record(z.number()),
  interactions: z.record(z.number()),
  consent_summary: z.record(z.number()),
})

export type CampaignEventRequest = z.infer<typeof CampaignEventRequestSchema>
export type CampaignEventResponse = z.infer<typeof CampaignEventResponseSchema>
export type CampaignMetricsResponse = z.infer<typeof CampaignMetricsResponseSchema>
