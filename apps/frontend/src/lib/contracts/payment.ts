import { z } from "zod"

export const ConsentRequestSchema = z.object({
  schema_version: z.literal("1.0").default("1.0"),
  request_id: z.string().min(1),
  consent_to_marketing: z.boolean(),
  terms_accepted: z.literal(true),
  data_processing_consent: z.literal(true),
})

export const ConsentResponseSchema = z.object({
  schema_version: z.literal("1.0"),
  request_id: z.string(),
  consent_recorded: z.boolean(),
  message: z.string(),
})

export const PaymentSubmitRequestSchema = z.object({
  schema_version: z.literal("1.0").default("1.0"),
  request_id: z.string().min(1),
  amount: z.number().int().positive(),
  method: z.enum(["LOCAL_BANK_TRANSFER", "CASH", "STRIPE", "PAYPAL"]),
})

export const PaymentSubmitResponseSchema = z.object({
  schema_version: z.literal("1.0"),
  payment_id: z.string(),
  request_id: z.string(),
  amount: z.number(),
  method: z.string(),
  status: z.string(),
  payment_instructions: z.string().nullable(),
  expected_wait_time: z.string().nullable(),
})

export const PaymentStatusResponseSchema = z.object({
  schema_version: z.literal("1.0"),
  payment_id: z.string(),
  request_id: z.string(),
  amount: z.number(),
  method: z.string(),
  status: z.string(),
  created_at: z.string(),
  verified_at: z.string().nullable(),
  ocr_extracted: z.record(z.unknown()).nullable(),
  admin_notes: z.string().nullable(),
})

export const CampaignExecuteRequestSchema = z.object({
  schema_version: z.literal("1.0").default("1.0"),
  request_id: z.string().min(1),
  campaign_data: z.record(z.unknown()),
})

export const CampaignExecuteResponseSchema = z.object({
  schema_version: z.literal("1.0"),
  execution_id: z.string(),
  request_id: z.string(),
  status: z.string(),
  message: z.string(),
})

export type ConsentRequest = z.infer<typeof ConsentRequestSchema>
export type ConsentResponse = z.infer<typeof ConsentResponseSchema>
export type PaymentSubmitRequest = z.infer<typeof PaymentSubmitRequestSchema>
export type PaymentSubmitResponse = z.infer<typeof PaymentSubmitResponseSchema>
export type PaymentStatusResponse = z.infer<typeof PaymentStatusResponseSchema>
export type CampaignExecuteRequest = z.infer<typeof CampaignExecuteRequestSchema>
export type CampaignExecuteResponse = z.infer<typeof CampaignExecuteResponseSchema>