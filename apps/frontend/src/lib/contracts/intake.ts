import { z } from "zod"

const optionalNonEmptyString = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return value
    }
    const trimmed = value.trim()
    return trimmed === "" ? undefined : trimmed
  },
  z.string().min(1).optional(),
)

export const IntakeSubmitRequestSchema = z.object({
  schema_version: z.literal("1.0").default("1.0"),
  business_name: z.string().min(1, "Enter your business name."),
  contact_email: z.string().email("Enter a valid contact email."),
  campaign_objective: z.string().min(1, "Describe your campaign objective."),
  target_geography: optionalNonEmptyString,
  demographic_preferences: optionalNonEmptyString,
  campaign_timeline: optionalNonEmptyString,
  campaign_duration: z.enum(["weekly", "biweekly", "monthly", "quarterly"]).default("monthly"),
  preferred_channel: z.enum(["email", "sms", "both"]),
  budget_min: z.number().int().nonnegative(),
  budget_max: z.number().int().nonnegative().nullable().optional(),
  is_client_mode: z.boolean().default(false),
  mockup_level: z.enum(["basic", "enhanced", "premium"]).default("basic"),
}).superRefine((payload, ctx) => {
  if (payload.budget_max != null && payload.budget_max < payload.budget_min) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["budget_max"],
      message: "Budget maximum must be greater than or equal to budget minimum.",
    })
  }
})

export const IntakeSubmitResponseSchema = z.object({
  schema_version: z.literal("1.0").default("1.0"),
  request_id: z.string().min(1),
  normalized_summary: z.record(z.string(), z.string()),
})

export type IntakeSubmitRequest = z.infer<typeof IntakeSubmitRequestSchema>
export type IntakeSubmitResponse = z.infer<typeof IntakeSubmitResponseSchema>

export type PackageOption = {
  name: string
  reach: number
  price: number
  price_jmd: number
  cost_per_contact: number
  cost_per_contact_jmd: number
  channel_split: string
  within_budget: boolean
}
