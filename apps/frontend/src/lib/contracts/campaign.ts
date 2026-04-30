import { z } from "zod"

export const CampaignSessionStartRequestSchema = z.object({
  schema_version: z.literal("1.0").default("1.0"),
  client_email: z.string().email(),
})

export const CampaignSessionStartResponseSchema = z.object({
  schema_version: z.literal("1.0").default("1.0"),
  campaign_session_id: z.string(),
  status: z.string(),
  created_at: z.string().datetime(),
})

export const CampaignModerationCheckRequestSchema = z.object({
  schema_version: z.literal("1.0").default("1.0"),
  campaign_session_id: z.string().min(1),
  campaign_id: z.string().min(1),
  safety_score: z.number().int().min(0).max(100),
  audience_match_score: z.number().int().min(0).max(100),
})

export const CampaignModerationCheckResponseSchema = z.object({
  schema_version: z.literal("1.0").default("1.0"),
  campaign_session_id: z.string().min(1),
  campaign_id: z.string().min(1),
  decision: z.enum(["PASS", "REVISION_REQUIRED", "MANUAL_REVIEW_OFFERED"]),
  ai_attempt_count: z.number().int().positive(),
})

export const CampaignManualReviewRequestSchema = z.object({
  schema_version: z.literal("1.0").default("1.0"),
  campaign_session_id: z.string().min(1),
  accepted: z.boolean(),
})

export const CampaignManualReviewResponseSchema = z.object({
  schema_version: z.literal("1.0").default("1.0"),
  campaign_session_id: z.string().min(1),
  status: z.enum(["UNDER_MANUAL_REVIEW", "DRAFT_HELD"]),
  expires_at: z.string().datetime().nullable().optional(),
  reminder_at: z.string().datetime().nullable().optional(),
  reminder_hours_before_expiry: z.number().int().nonnegative(),
  manual_review_ticket_id: z.string().nullable().optional(),
})

export const TemplateGenerateRequestSchema = z.object({
  schema_version: z.literal("1.0").default("1.0"),
  campaign_session_id: z.string().min(1),
  template_type: z.enum(["email", "sms", "social"]),
  style_preference: z.string().default(""),
})

export const TemplateGenerateResponseSchema = z.object({
  schema_version: z.literal("1.0").default("1.0"),
  template_id: z.string(),
  campaign_session_id: z.string(),
  template_type: z.string(),
  content: z.string(),
  generated_at: z.string().datetime(),
})

export const SessionResumeRequestSchema = z.object({
  schema_version: z.literal("1.0").default("1.0"),
  campaign_session_id: z.string().min(1),
  resume_method: z.enum(["url", "email_otp"]),
})

export const SessionResumeResponseSchema = z.object({
  schema_version: z.literal("1.0").default("1.0"),
  campaign_session_id: z.string(),
  status: z.enum(["ACTIVE", "EXPIRED"]),
  resume_token: z.string().nullable().optional(),
  expires_at: z.string().datetime().nullable().optional(),
})

export const ManualReviewDecisionRequestSchema = z.object({
  schema_version: z.literal("1.0").default("1.0"),
  campaign_session_id: z.string().min(1),
  decision: z.enum(["approved", "rejected"]),
  admin_notes: z.string().default(""),
})

export const ManualReviewCompletionResponseSchema = z.object({
  schema_version: z.literal("1.0").default("1.0"),
  campaign_session_id: z.string(),
  status: z.enum(["APPROVED", "REJECTED", "DRAFT_HELD"]),
  payment_link_eligible: z.boolean(),
})

export type CampaignModerationCheckRequest = z.infer<
  typeof CampaignModerationCheckRequestSchema
>
export type CampaignModerationCheckResponse = z.infer<
  typeof CampaignModerationCheckResponseSchema
>

export type CampaignSessionStartRequest = z.infer<
  typeof CampaignSessionStartRequestSchema
>
export type CampaignSessionStartResponse = z.infer<
  typeof CampaignSessionStartResponseSchema
>

export type CampaignManualReviewRequest = z.infer<
  typeof CampaignManualReviewRequestSchema
>

export type CampaignManualReviewResponse = z.infer<
  typeof CampaignManualReviewResponseSchema
>

export type TemplateGenerateRequest = z.infer<
  typeof TemplateGenerateRequestSchema
>
export type TemplateGenerateResponse = z.infer<
  typeof TemplateGenerateResponseSchema
>

export type SessionResumeRequest = z.infer<
  typeof SessionResumeRequestSchema
>
export type SessionResumeResponse = z.infer<
  typeof SessionResumeResponseSchema
>

export type ManualReviewDecisionRequest = z.infer<
  typeof ManualReviewDecisionRequestSchema
>
export type ManualReviewCompletionResponse = z.infer<
  typeof ManualReviewCompletionResponseSchema
>
