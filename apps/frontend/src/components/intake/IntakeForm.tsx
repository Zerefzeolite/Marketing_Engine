"use client"

import { type FormEvent, useMemo, useState, useRef } from "react"
import { fetchRecommendationFromApi, generateRecommendation } from "../../lib/api/intake"
import type { RecommendationPreviewData } from "../../lib/contracts/recommendation"
import {
  IntakeSubmitRequestSchema,
  type IntakeSubmitRequest,
} from "../../lib/contracts/intake"
import { nextStep, previousStep } from "../../lib/intake-step"
import {
  buildValidationMessage,
  getStep1Errors,
} from "../../lib/intake-validation"

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
  campaign_duration: "monthly",
  preferred_channel: "email",
  budget_min: 0,
  budget_max: null,
  is_client_mode: false,
  mockup_level: "basic",
}

export function IntakeForm({ onRecommendationChange, onRequestReady }: IntakeFormProps) {
  const [formState, setFormState] = useState<IntakeSubmitRequest>(defaultFormState)
  const [step, setStep] = useState(1)
  const [errorMessage, setErrorMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const recommendationRef = useRef<RecommendationPreviewData | null>(null)

  const validation = useMemo(
    () => IntakeSubmitRequestSchema.safeParse(formState),
    [formState],
  )
  const fieldErrors = validation.success ? {} : validation.error.flatten().fieldErrors

  const step1Errors = getStep1Errors(formState)

  async function updateRecommendation(data: IntakeSubmitRequest) {
    try {
      setIsSubmitting(true)
      const response = await fetchRecommendationFromApi(data)
      recommendationRef.current = response.recommendation
      onRecommendationChange(response.recommendation)
    } catch {
      setErrorMessage("Unable to update recommendation. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  function fieldLabel(field: string): string {
    const labels: Record<string, string> = {
      business_name: "Business Name",
      contact_email: "Contact Email",
      campaign_objective: "Campaign Objective",
      budget_max: "Budget Maximum",
      budget_min: "Budget Minimum",
      preferred_channel: "Preferred Channel",
    }
    return labels[field] ?? field
  }

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
    
    // Auto-update recommendation when channel changes (if recommendation exists)
    if (field === "preferred_channel") {
      const currentRecommendation = recommendationRef.current
      if (currentRecommendation) {
        updateRecommendation(nextState)
        return
      }
    }
    
    onRecommendationChange(null)
    onRequestReady(null, null)
  }

  async function handlePreview(event: FormEvent) {
    event.preventDefault()
    if (isSubmitting) {
      return
    }
    if (!validation.success) {
      onRecommendationChange(null)
      const missing = Object.entries(fieldErrors)
        .filter(([, messages]) => Array.isArray(messages) && messages.length > 0)
        .map(([field]) => fieldLabel(field))

      setErrorMessage(buildValidationMessage(missing))
      return
    }

    try {
      setIsSubmitting(true)
      const response = await fetchRecommendationFromApi(validation.data)
      recommendationRef.current = response.recommendation
      onRecommendationChange(response.recommendation)
      onRequestReady(response.requestId, response.summary)
    } catch {
      onRecommendationChange(null)
      onRequestReady(null, null)
      setErrorMessage("Unable to fetch recommendation right now. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const steps = [
    { num: 1, label: "Business Details" },
    { num: 2, label: "Campaign Settings" },
  ]

  return (
    <div className="intake-form">
    <div className="step-indicator">
      {steps.map((s, i) => (
        <div key={s.num} className={`step ${step >= s.num ? "active" : ""}`}>
          <div className="step-number">{s.num}</div>
          <div className="step-label">{s.label}</div>
        </div>
      ))}
    </div>

    <form onSubmit={handlePreview}>
      {step === 1 ? (
        <div className="form-step">
          <div className="form-group">
            <label htmlFor="business_name">Business Name *</label>
            <input
              id="business_name"
              type="text"
              value={formState.business_name}
              onChange={(event) => handleChange("business_name", event.target.value)}
              placeholder="Your company or business name"
              className={fieldErrors.business_name ? "error" : ""}
            />
            {fieldErrors.business_name?.[0] && <span className="field-error">{fieldErrors.business_name[0]}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="contact_email">Contact Email *</label>
            <input
              id="contact_email"
              type="email"
              value={formState.contact_email}
              onChange={(event) => handleChange("contact_email", event.target.value)}
              placeholder="you@company.com"
              className={fieldErrors.contact_email ? "error" : ""}
            />
            {fieldErrors.contact_email?.[0] && <span className="field-error">{fieldErrors.contact_email[0]}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="campaign_objective">Campaign Objective *</label>
            <textarea
              id="campaign_objective"
              value={formState.campaign_objective}
              onChange={(event) =>
                handleChange("campaign_objective", event.target.value)
              }
              placeholder="Describe what you want to achieve with this campaign..."
              rows={4}
              className={fieldErrors.campaign_objective ? "error" : ""}
            />
            {fieldErrors.campaign_objective?.[0] && (
              <span className="field-error">{fieldErrors.campaign_objective[0]}</span>
            )}
            <span className="helper-text">Be specific: &quot;Generate leads for B2B SaaS demo&quot;</span>
          </div>

          <button
            type="button"
            className="btn-next"
            onClick={() => {
              if (step1Errors.length > 0) {
                const missing = step1Errors.map((item) => fieldLabel(item.field))
                setErrorMessage(buildValidationMessage(missing))
                return
              }
              setStep(nextStep(step))
            }}
          >
            Next Step →
          </button>
        </div>
      ) : (
        <div className="form-step">
          <div className="form-group">
            <label htmlFor="target_geography">Target Geography</label>
            <input
              id="target_geography"
              type="text"
              value={formState.target_geography ?? ""}
              onChange={(event) => handleChange("target_geography", event.target.value)}
              placeholder="e.g., United States, New York Metro"
            />
          </div>

          <div className="form-group">
            <label htmlFor="demographic_preferences">Demographic Preferences</label>
            <input
              id="demographic_preferences"
              type="text"
              value={formState.demographic_preferences ?? ""}
              onChange={(event) =>
                handleChange("demographic_preferences", event.target.value)
              }
              placeholder="e.g., Women 25-40, urban, tech-savvy"
            />
            <span className="helper-text">Example: Women 25-40, urban, wellness-focused</span>
          </div>

          <div className="form-group">
            <label htmlFor="campaign_timeline">Campaign Timeline</label>
            <input
              id="campaign_timeline"
              type="text"
              value={formState.campaign_timeline ?? ""}
              onChange={(event) => handleChange("campaign_timeline", event.target.value)}
              placeholder="e.g., 3 months (May-July)"
            />
            <span className="helper-text">Example: 3 months, weekly send cadence</span>
          </div>

          <div className="form-group">
            <label htmlFor="campaign_duration">Campaign Duration</label>
            <select
              id="campaign_duration"
              value={formState.campaign_duration}
              onChange={(event) =>
                handleChange(
                  "campaign_duration",
                  event.target.value as "weekly" | "biweekly" | "monthly" | "quarterly",
                )
              }
            >
              <option value="weekly">Weekly (4 sends)</option>
              <option value="biweekly">Bi-Weekly (2 sends)</option>
              <option value="monthly">Monthly (1 send)</option>
              <option value="quarterly">Quarterly (ongoing)</option>
            </select>
            <span className="helper-text">How often messages will be sent to contacts</span>
          </div>

          <div className="form-group">
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
              <option value="both">Both (Email + SMS)</option>
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="budget_min">Budget Minimum ($) *</label>
              <input
                id="budget_min"
                type="number"
                min={0}
                value={formState.budget_min}
                onChange={(event) => handleChange("budget_min", Number(event.target.value))}
                placeholder="1000"
              />
            </div>

            <div className="form-group">
              <label htmlFor="budget_max">Budget Maximum ($)</label>
              <input
                id="budget_max"
                type="number"
                min={0}
                value={formState.budget_max ?? ""}
                onChange={(event) => {
                  const nextValue = event.target.value.trim()
                  handleChange("budget_max", nextValue ? Number(nextValue) : null)
                }}
                placeholder="Optional"
                className={fieldErrors.budget_max ? "error" : ""}
              />
              {fieldErrors.budget_max?.[0] && <span className="field-error">{fieldErrors.budget_max[0]}</span>}
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-back" onClick={() => setStep(previousStep(step))}>
              ← Back
            </button>
            <button type="submit" className="btn-submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <span className="loading">Generating...</span>
              ) : (
                "Get Recommendation"
              )}
            </button>
          </div>
        </div>
      )}

      {errorMessage && <div className="error-message">{errorMessage}</div>}
    </form>

    <style>{`
      .intake-form {
        max-width: 600px;
        margin: 0 auto;
      }
      .step-indicator {
        display: flex;
        gap: 1rem;
        margin-bottom: 2rem;
      }
      .step {
        flex: 1;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 1rem;
        background: #f1f5f9;
        border-radius: 8px;
        opacity: 0.5;
      }
      .step.active {
        opacity: 1;
        background: #e0e7ff;
      }
      .step-number {
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #94a3b8;
        color: white;
        border-radius: 50%;
        font-weight: 600;
        font-size: 14px;
      }
      .step.active .step-number {
        background: #4f46e5;
      }
      .step-label {
        font-weight: 500;
        color: #475569;
      }
      .form-group {
        margin-bottom: 1.25rem;
      }
      .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
      }
      label {
        display: block;
        margin-bottom: 0.375rem;
        font-weight: 500;
        color: #334155;
      }
      input, select, textarea {
        width: 100%;
        padding: 0.625rem 0.875rem;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        font-size: 15px;
        transition: border-color 0.2s, box-shadow 0.2s;
      }
      input:focus, select:focus, textarea:focus {
        outline: none;
        border-color: #4f46e5;
        box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
      }
      input.error, textarea.error {
        border-color: #ef4444;
      }
      .field-error {
        display: block;
        margin-top: 0.25rem;
        color: #ef4444;
        font-size: 13px;
      }
      .helper-text {
        display: block;
        margin-top: 0.25rem;
        color: #64748b;
        font-size: 13px;
      }
      textarea {
        resize: vertical;
        min-height: 100px;
      }
      .form-actions {
        display: flex;
        gap: 1rem;
        margin-top: 1.5rem;
      }
      button {
        flex: 1;
        padding: 0.875rem 1.5rem;
        border: none;
        border-radius: 8px;
        font-size: 15px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.2s, transform 0.1s;
      }
      .btn-next, .btn-submit {
        background: #4f46e5;
        color: white;
      }
      .btn-next:hover, .btn-submit:hover {
        background: #4338ca;
      }
      .btn-back {
        background: #f1f5f9;
        color: #475569;
      }
      .btn-back:hover {
        background: #e2e8f0;
      }
      .btn-submit:disabled {
        opacity: 0.7;
        cursor: not-allowed;
      }
      .loading {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
      }
      .error-message {
        margin-top: 1rem;
        padding: 0.875rem;
        background: #fef2f2;
        border: 1px solid #fecaca;
        border-radius: 8px;
        color: #dc2626;
        font-size: 14px;
      }
    `}</style>
    </div>
  )
}