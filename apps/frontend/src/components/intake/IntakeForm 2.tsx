"use client"

import { type FormEvent, useMemo, useState } from "react"
import { fetchRecommendationFromApi } from "../../lib/api/intake"
import type { RecommendationPreviewData } from "../../lib/contracts/recommendation"
import {
  IntakeSubmitRequestSchema,
  type IntakeSubmitRequest,
} from "../../lib/contracts/intake"
import { nextStep, previousStep } from "../../lib/intake-step"

type IntakeFormProps = {
  onRecommendationChange: (recommendation: RecommendationPreviewData | null) => void
  onRequestReady: (requestId: string | null, summary: Record<string, string> | null) => void
}

const defaultFormState: IntakeSubmitRequest = {
  schema_version: "1.0",
  business_name: "",
  contact_email: "",
  campaign_objective: "",
  target_geography: "",
  demographic_preferences: "",
  campaign_timeline: "",
  preferred_channel: "email",
  budget_min: 0,
  budget_max: null,
}

export function IntakeForm({ onRecommendationChange, onRequestReady }: IntakeFormProps) {
  const [formState, setFormState] = useState<IntakeSubmitRequest>(defaultFormState)
  const [step, setStep] = useState(1)
  const [errorMessage, setErrorMessage] = useState("")

  const validation = useMemo(
    () => IntakeSubmitRequestSchema.safeParse(formState),
    [formState],
  )
  const fieldErrors = validation.success ? {} : validation.error.flatten().fieldErrors

  function handleChange<K extends keyof IntakeSubmitRequest>(
    field: K,
    value: IntakeSubmitRequest[K],
  ) {
    const nextState = {
      ...formState,
      [field]: value,
    }

    setFormState(nextState)
    setErrorMessage("")
    onRecommendationChange(null)
    onRequestReady(null, null)
  }

  async function handlePreview(event: FormEvent) {
    event.preventDefault()
    if (!validation.success) {
      onRecommendationChange(null)
      setErrorMessage("Please complete required fields and confirm budget range.")
      return
    }

    try {
      const response = await fetchRecommendationFromApi(validation.data)
      onRecommendationChange(response.recommendation)
      onRequestReady(response.requestId, response.summary)
    } catch {
      onRecommendationChange(null)
      onRequestReady(null, null)
      setErrorMessage("Unable to fetch recommendation right now. Please try again.")
    }
  }

  return (
    <form onSubmit={handlePreview}>
      <h2>Business Details</h2>
      <p>Step {step} of 2</p>

      {step === 1 ? (
        <>
          <label htmlFor="business_name">Business Name</label>
          <input
            id="business_name"
            value={formState.business_name}
            onChange={(event) => handleChange("business_name", event.target.value)}
          />
          {fieldErrors.business_name?.[0] && <p>{fieldErrors.business_name[0]}</p>}

          <label htmlFor="contact_email">Contact Email</label>
          <input
            id="contact_email"
            type="email"
            value={formState.contact_email}
            onChange={(event) => handleChange("contact_email", event.target.value)}
          />
          {fieldErrors.contact_email?.[0] && <p>{fieldErrors.contact_email[0]}</p>}

          <label htmlFor="campaign_objective">Campaign Objective</label>
          <textarea
            id="campaign_objective"
            value={formState.campaign_objective}
            onChange={(event) =>
              handleChange("campaign_objective", event.target.value)
            }
          />
          {fieldErrors.campaign_objective?.[0] && (
            <p>{fieldErrors.campaign_objective[0]}</p>
          )}

          <button type="button" onClick={() => setStep(nextStep(step))}>
            Next
          </button>
        </>
      ) : (
        <>
          <label htmlFor="target_geography">Target Geography</label>
          <input
            id="target_geography"
            value={formState.target_geography ?? ""}
            onChange={(event) => handleChange("target_geography", event.target.value)}
          />

          <label htmlFor="demographic_preferences">Demographic Preferences</label>
          <input
            id="demographic_preferences"
            value={formState.demographic_preferences ?? ""}
            onChange={(event) =>
              handleChange("demographic_preferences", event.target.value)
            }
          />

          <label htmlFor="campaign_timeline">Campaign Timeline</label>
          <input
            id="campaign_timeline"
            value={formState.campaign_timeline ?? ""}
            onChange={(event) => handleChange("campaign_timeline", event.target.value)}
          />

          <label htmlFor="preferred_channel">Preferred Channel</label>
          <select
            id="preferred_channel"
            value={formState.preferred_channel}
            onChange={(event) =>
              handleChange(
                "preferred_channel",
                event.target.value as IntakeSubmitRequest["preferred_channel"],
              )
            }
          >
            <option value="email">Email</option>
            <option value="sms">SMS</option>
            <option value="both">Both</option>
          </select>

          <label htmlFor="budget_min">Budget Minimum</label>
          <input
            id="budget_min"
            type="number"
            min={0}
            value={formState.budget_min}
            onChange={(event) => handleChange("budget_min", Number(event.target.value))}
          />

          <label htmlFor="budget_max">Budget Maximum</label>
          <input
            id="budget_max"
            type="number"
            min={0}
            value={formState.budget_max ?? ""}
            onChange={(event) => {
              const nextValue = event.target.value.trim()
              handleChange("budget_max", nextValue ? Number(nextValue) : null)
            }}
          />
          {fieldErrors.budget_max?.[0] && <p>{fieldErrors.budget_max[0]}</p>}

          <button type="button" onClick={() => setStep(previousStep(step))}>
            Back
          </button>
          <button type="submit">Preview Recommendation</button>
        </>
      )}

      {errorMessage && <p>{errorMessage}</p>}
    </form>
  )
}
