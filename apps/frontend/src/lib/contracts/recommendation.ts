import { z } from "zod"

export const PackageOptionSchema = z.object({
  name: z.string(),
  reach: z.number().int().nonnegative(),
  price: z.number().int(),
  price_jmd: z.number().int(),
  cost_per_contact: z.number(),
  cost_per_contact_jmd: z.number(),
  channel_split: z.string(),
  within_budget: z.boolean(),
})

export const RecommendationPreviewSchema = z.object({
  estimated_reachable: z.number().int().nonnegative(),
  recommended_package: z.enum(["starter", "growth", "premium"]),
  selected_package: z.enum(["starter", "growth", "premium"]).optional(),
  campaign_duration: z.enum(["weekly", "biweekly", "monthly", "quarterly"]).default("monthly"),
  channel_split: z.string().min(1),
  rationale_summary: z.string().min(1),
  confidence: z.number().min(0).max(1),
  estimated_price: z.number().int(),
  cost_per_contact: z.number(),
  package_options: z.array(PackageOptionSchema),
  is_client_mode: z.boolean().optional(),
  mockup_level: z.enum(["basic", "enhanced", "premium"]).optional(),
  mockup_upgrade_cost_usd: z.number().optional(),
  mockup_upgrade_cost_jmd: z.number().optional(),
  total_budget_needed: z.number().optional(),
})

export const IntakeEstimateResponseSchema = z.object({
  schema_version: z.literal("1.0"),
  request_id: z.string().min(1),
  estimated_reachable: z.number().int().nonnegative(),
  channel_split: z.string().min(1),
  confidence: z.string().min(1),
})

export const IntakeRecommendResponseSchema = z.object({
  schema_version: z.literal("1.0"),
  recommended_package: z.enum(["starter", "growth", "premium"]),
  rationale_summary: z.string().min(1),
})

export type RecommendationPreviewData = z.infer<
  typeof RecommendationPreviewSchema
>
