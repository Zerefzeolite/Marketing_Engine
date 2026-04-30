import type { IntakeSubmitRequest } from "./contracts/intake"

export type IntakeStep1Error = {
  field: "business_name" | "contact_email" | "campaign_objective"
  message: string
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function getStep1Errors(payload: IntakeSubmitRequest): IntakeStep1Error[] {
  const errors: IntakeStep1Error[] = []

  if (!payload.business_name.trim()) {
    errors.push({ field: "business_name", message: "Enter your business name." })
  }

  if (!payload.contact_email.trim() || !EMAIL_PATTERN.test(payload.contact_email.trim())) {
    errors.push({ field: "contact_email", message: "Enter a valid contact email." })
  }

  if (!payload.campaign_objective.trim()) {
    errors.push({ field: "campaign_objective", message: "Describe your campaign objective." })
  }

  return errors
}

export function buildValidationMessage(missingFields: string[]): string {
  if (missingFields.length === 0) {
    return "Please complete required fields and confirm budget range."
  }

  return `Please complete required fields: ${missingFields.join(", ")}.`
}
