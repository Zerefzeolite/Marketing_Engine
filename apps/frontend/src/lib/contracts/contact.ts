import { z } from "zod"

export const ContactMetadataSchema = z.object({
  contact_id: z.string().min(1),
  email_address: z.string().email().optional(),
  phone_number: z.string().optional(),
  best_send_day: z.enum(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]).optional(),
  best_send_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "HH:MM format").optional(),
  email_frequency_score: z.number().min(1).max(10).optional(),
  sms_frequency_score: z.number().min(1).max(10).optional(),
  last_email_sent_at: z.string().datetime().optional(),
  last_sms_sent_at: z.string().datetime().optional(),
  predicted_optimal_email_interval_days: z.number().int().positive().default(7),
  predicted_optimal_sms_interval_days: z.number().int().positive().default(14),
  total_emails_received: z.number().int().nonnegative().default(0),
  total_sms_received: z.number().int().nonnegative().default(0),
  email_open_rate: z.number().min(0).max(1).optional(),
  sms_delivery_rate: z.number().min(0).max(1).optional(),
  created_at: z.string().datetime().default(() => new Date().toISOString()),
  updated_at: z.string().datetime().default(() => new Date().toISOString()),
})

export type ContactMetadata = z.infer<typeof ContactMetadataSchema>

export const ContactListSchema = z.object({
  contacts: z.array(ContactMetadataSchema),
  total_count: z.number().int().nonnegative(),
  page: z.number().int().positive().default(1),
  page_size: z.number().int().positive().default(100),
})

export type ContactList = z.infer<typeof ContactListSchema>

export const SendScheduleSchema = z.object({
  contact_id: z.string().min(1),
  channel: z.enum(["email", "sms"]),
  scheduled_date: z.string().datetime(),
  scheduled_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  send_day_of_week: z.enum(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]).optional(),
  is_sent: z.boolean().default(false),
  sent_at: z.string().datetime().optional(),
})

export type SendSchedule = z.infer<typeof SendScheduleSchema>