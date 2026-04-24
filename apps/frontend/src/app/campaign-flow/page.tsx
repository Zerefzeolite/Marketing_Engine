"use client"

import { useState, useEffect, useMemo, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { IntakeForm } from "../../components/intake/IntakeForm"
import { CampaignSetupStep } from "../../components/campaign/CampaignSetupStep"
import { RecommendationPreview } from "../../components/intake/RecommendationPreview"
import { DraftExpiryNotice } from "../../components/campaign/DraftExpiryNotice"
import { ManualReviewPopup } from "../../components/campaign/ManualReviewPopup"
import { ModerationReview } from "../../components/campaign/ModerationReview"
import { ConsentStep } from "../../components/payment/ConsentStep"
import { PaymentStep } from "../../components/payment/PaymentStep"
import { PaymentStatusDisplay } from "../../components/payment/PaymentStatusDisplay"
import { CampaignExecuteButton } from "../../components/payment/CampaignExecuteButton"
import { requestCampaignManualReview, startCampaignSession } from "../../lib/api/campaign"
import { getPackageDescription, getChannelLabel } from "../../lib/api/intake"
import type { RecommendationPreviewData } from "../../lib/contracts/recommendation"
import { CAMPAIGN_FLOW_EXPLAINER } from "../../lib/experience-routing"
import {
  resolveModerationPhase,
  type FlowStep,
} from "./moderationPhase"

type ModerationPhaseEvent =
  | {
      passed: boolean
      failedChecks: number
    }
  | {
      manualReviewStatus: "UNDER_MANUAL_REVIEW" | "DRAFT_HELD"
    }

export default function CampaignFlowWrapper() {
  return (
    <Suspense fallback={<div className="loading">Loading campaign...</div>}>
      <CampaignFlowWithParams />
    </Suspense>
  )
}

function CampaignFlowWithParams() {
  return <CampaignFlowPage />
}

function CampaignFlowPage() {
  const searchParams = useSearchParams()
  const prefilledPackage = searchParams.get("package")
  const prefilledReach = searchParams.get("reach")
  const prefilledChannel = searchParams.get("channel")
  const prefilledConfidence = searchParams.get("confidence")
  const prefilledBusinessName = searchParams.get("business_name")
  const prefilledTargetAudience = searchParams.get("target_audience")
  const prefilledObjective = searchParams.get("objective")

  const [flowStep, setFlowStep] = useState<FlowStep>("intake")
  const [recommendation, setRecommendation] = useState<RecommendationPreviewData | null>(null)
  const [sessionId, setSessionId] = useState("")
  const [campaignId, setCampaignId] = useState("")
  const [summary, setSummary] = useState<Record<string, string> | null>(null)
  const [showConfirmNewSession, setShowConfirmNewSession] = useState(false)
  const [templateTier, setTemplateTier] = useState<"basic" | "enhanced" | "premium">("basic")
  const [packageLevel, setPackageLevel] = useState(1)
  const [selectedDuration, setSelectedDuration] = useState("weekly")
  const [channelRouting, setChannelRouting] = useState("")

  const channelSplit = summary?.preferred_channel || channelRouting

  const packageDescription = getPackageDescription(recommendation?.selected_package || "starter")
  const channelLabel = getChannelLabel(channelSplit || "email")

  useEffect(() => {
    const reach = parseInt(prefilledReach || "0")
    const packageVal = (prefilledPackage === "starter" || prefilledPackage === "growth" || prefilledPackage === "premium") 
      ? prefilledPackage as "starter" | "growth" | "premium" 
      : "starter"
    const channel = prefilledChannel || "email: 100%"
    const confidenceVal = parseFloat(prefilledConfidence || "0") || 0.85

    const basePricePerContact = channel.includes("sms") ? 0.025 : 0.008
    const sendsCount = 4
    const markup = 2.0

    const starterReach = Math.round(reach * 0.5)
    const growthReach = reach
    const premiumReach = Math.round(reach * 1.5)

    const starterPrice = Math.round(starterReach * basePricePerContact * sendsCount * markup)
    const growthPrice = Math.round(growthReach * basePricePerContact * sendsCount * markup * 0.85)
    const premiumPrice = Math.round(premiumReach * basePricePerContact * sendsCount * markup * 0.75)

    const selectedPrice = packageVal === "growth" ? growthPrice : packageVal === "premium" ? premiumPrice : starterPrice

    if (packageVal || reach > 0) {
      const mockRecommendation: RecommendationPreviewData = {
        estimated_reachable: reach,
        recommended_package: packageVal,
        selected_package: packageVal,
        channel_split: channel,
        rationale_summary: "Imported from intake form",
        confidence: confidenceVal,
        estimated_price: selectedPrice,
        cost_per_contact: basePricePerContact,
        package_options: [
          { name: "starter", reach: starterReach, price: starterPrice, price_jmd: starterPrice * 155, cost_per_contact: basePricePerContact, cost_per_contact_jmd: 1.30, channel_split: channel, within_budget: starterPrice <= 200 },
          { name: "growth", reach: growthReach, price: growthPrice, price_jmd: growthPrice * 155, cost_per_contact: basePricePerContact, cost_per_contact_jmd: 1.60, channel_split: channel, within_budget: growthPrice <= 200 },
          { name: "premium", reach: premiumReach, price: premiumPrice, price_jmd: premiumPrice * 155, cost_per_contact: basePricePerContact, cost_per_contact_jmd: 1.30, channel_split: channel, within_budget: premiumPrice <= 200 },
        ],
      }
      setRecommendation(mockRecommendation)
      const fakeRequestId = `REQ-${Date.now().toString(36).toUpperCase()}`
      setSummary({
        business_name: prefilledBusinessName || "From Intake",
        preferred_channel: channel.includes("sms") ? "both" : "email",
        campaign_objective: prefilledObjective || "",
      })
      setSessionId(fakeRequestId)
      setFlowStep("consent")
    }
  }, [prefilledPackage, prefilledReach, prefilledChannel, prefilledConfidence, prefilledBusinessName])
  const [paymentId, setPaymentId] = useState("")
  const [paymentStatus, setPaymentStatus] = useState<string>("")
  const [paymentInstructions, setPaymentInstructions] = useState<string>("")
  const [expectedWaitTime, setExpectedWaitTime] = useState<string>("")
  const [hasConsent, setHasConsent] = useState(false)
  const [failedModerationChecks, setFailedModerationChecks] = useState(0)
  const [showManualReviewPopup, setShowManualReviewPopup] = useState(false)
  const [isSubmittingManualReview, setIsSubmittingManualReview] = useState(false)
  const [manualReviewError, setManualReviewError] = useState("")

  function handleRequestReady(
    nextRequestId: string | null,
    nextSummary: Record<string, string> | null,
  ) {
    setSummary(nextSummary)
    if (nextRequestId) {
      setFlowStep("consent")
    }
  }

  async function handleConsentComplete() {
    if (summary?.contact_email) {
      try {
        const session = await startCampaignSession({
          client_email: summary.contact_email,
        })
        setSessionId(session.campaign_session_id)
        setCampaignId(session.campaign_session_id.replace("SES-", "CMP-"))
      } catch (err) {
        console.error("Failed to start session:", err)
        const mockId = `SES-${Date.now().toString(36).toUpperCase()}`
        setSessionId(mockId)
        setCampaignId(`CMP-${Date.now().toString(36).toUpperCase()}`)
      }
    } else {
      const mockId = `SES-${Date.now().toString(36).toUpperCase()}`
      setSessionId(mockId)
      setCampaignId(`CMP-${Date.now().toString(36).toUpperCase()}`)
    }
    setHasConsent(true)
    setFlowStep("campaign_setup")
  }

  function handleConsentBack() {
    const hasSession = typeof window !== "undefined" && sessionStorage.getItem("intake_session")
    if (hasSession) {
      setShowConfirmNewSession(true)
    } else {
      setFlowStep("intake")
    }
  }

  function confirmNewSession() {
    sessionStorage.removeItem("intake_session")
    setShowConfirmNewSession(false)
    setFlowStep("intake")
  }

  function cancelNewSession() {
    setShowConfirmNewSession(false)
  }

  function applyModerationEvent(event: ModerationPhaseEvent) {
    const next = resolveModerationPhase(
      {
        flowStep,
        failedModerationChecks,
        showManualReviewPopup,
      },
      event,
    )

    setFlowStep(next.flowStep)
    setFailedModerationChecks(next.failedModerationChecks)
    setShowManualReviewPopup(next.showManualReviewPopup)
  }

  async function handleManualReviewDecision(accepted: boolean) {
    try {
      setIsSubmittingManualReview(true)
      setManualReviewError("")

      const result = await requestCampaignManualReview({
        campaign_session_id: sessionId,
        accepted,
      })

      applyModerationEvent({ manualReviewStatus: result.status })
    } catch (err) {
      setManualReviewError(err instanceof Error ? err.message : "Failed to request manual review")
    } finally {
      setIsSubmittingManualReview(false)
    }
  }

  function handlePaymentComplete(
    nextPaymentId: string,
    nextStatus: string,
    instructions: string,
    waitTime: string,
  ) {
    setPaymentId(nextPaymentId)
    setPaymentStatus(nextStatus)
    setPaymentInstructions(instructions)
    setExpectedWaitTime(waitTime)
    setFlowStep("status")
  }

  const stepLabels: Record<string, string> = {
    intake: "1. Intake",
    consent: "2. Consent",
    campaign_setup: "3. Campaign Setup",
    moderation: "4. Moderation",
    payment: "5. Payment",
    status: "6. Status",
    execute: "7. Execute",
  }

  return (
    <main>
      <header className="flow-header">
        <h1>Campaign Setup Wizard</h1>
        <p className="subtitle">Complete these steps to launch your marketing campaign</p>
      </header>
      
      <nav className="step-progress">
        {Object.entries(stepLabels).map(([step, label]) => (
          <span key={step} className={`step-badge ${flowStep === step ? "active" : ""} ${stepLabels[step].charAt(0) < stepLabels[flowStep].charAt(0) ? "completed" : ""}`}>
            <span className="step-num">{stepLabels[step].charAt(0)}</span>
            <span className="step-label">{label.split(". ")[1]}</span>
          </span>
        ))}
      </nav>

      <style>{`
        .current-step { color: #64748b; margin-bottom: 0.5rem; }
      `}</style>
      
      {flowStep === "intake" && (
        <>
          <IntakeForm
            onRecommendationChange={setRecommendation}
            onRequestReady={handleRequestReady}
          />
          {sessionId && summary && (
            <section>
              <h2>Request Confirmation</h2>
              <p>Session ID: {sessionId}</p>
              <p>Business: {summary.business_name}</p>
              <p>Channel: {summary.preferred_channel}</p>
            </section>
          )}
          <RecommendationPreview recommendation={recommendation} />
        </>
      )}

      {flowStep === "consent" && sessionId && (
        <ConsentStep
          requestId={sessionId}
          onComplete={handleConsentComplete}
          onBack={handleConsentBack}
        />
      )}

      {flowStep === "campaign_setup" && sessionId && (
        <CampaignSetupStep
          recommendation={recommendation}
          sessionId={sessionId}
          summary={summary}
          onComplete={(tier, level) => {
            setTemplateTier(tier)
            setPackageLevel(level)
            setFlowStep("moderation")
          }}
          onBack={() => setFlowStep("consent")}
        />
      )}

      {flowStep === "moderation" && sessionId && (
        <>
          <ModerationReview
            requestId={sessionId}
            failedChecks={failedModerationChecks}
            onPass={(failedChecks) => {
              applyModerationEvent({ passed: true, failedChecks })
            }}
            onFail={(failedChecks) => {
              applyModerationEvent({ passed: false, failedChecks })
            }}
            onManualReviewRequired={(failedChecks) => {
              applyModerationEvent({ passed: false, failedChecks })
            }}
            onBack={() => setFlowStep("campaign_setup")}
          />
          <ManualReviewPopup
            open={showManualReviewPopup}
            isSubmitting={isSubmittingManualReview}
            errorMessage={manualReviewError}
            onAccept={() => handleManualReviewDecision(true)}
            onDecline={() => handleManualReviewDecision(false)}
          />
        </>
      )}

      {flowStep === "under_review" && (
        <section>
          <h2>Manual Review In Progress</h2>
          <p>
            A specialist is reviewing your campaign now. We will notify you once review is
            complete.
          </p>
        </section>
      )}

      {flowStep === "payment" && sessionId && recommendation && (
        <PaymentStep
          requestId={sessionId}
          recommendedPackage={recommendation.recommended_package}
          packagePrice={recommendation.estimated_price}
          packagePriceJMD={recommendation.estimated_price * 155}
          templateUpgradeCost={templateTier === "enhanced" && packageLevel < 2 ? 50 : templateTier === "premium" && packageLevel < 3 ? 150 : 0}
          templateUpgradeCostJMD={templateTier === "enhanced" && packageLevel < 2 ? 8000 : templateTier === "premium" && packageLevel < 3 ? 24000 : 0}
          templateTier={templateTier}
          packageDescription={packageDescription}
          duration={selectedDuration}
          sends={selectedDuration === "weekly" ? 4 : selectedDuration === "biweekly" ? 2 : 1}
          channel={channelSplit || "email"}
          totalContacts={recommendation?.estimated_reachable}
          onComplete={handlePaymentComplete}
          onBack={() => setFlowStep("moderation")}
        />
      )}

      {flowStep === "draft_expired" && <DraftExpiryNotice />}

      {flowStep === "status" && sessionId && paymentId && (
        <PaymentStatusDisplay
          requestId={sessionId}
          paymentId={paymentId}
          paymentStatus={paymentStatus}
          paymentInstructions={paymentInstructions}
          expectedWaitTime={expectedWaitTime}
          hasConsent={hasConsent}
          onRefreshStatus={async () => {
            // Status would refresh here
          }}
        />
      )}

      {flowStep === "execute" && sessionId && (
        <CampaignExecuteButton
          requestId={sessionId}
          campaignData={{
            channels: [summary?.preferred_channel || "email"],
            target_count: recommendation?.estimated_reachable || 0,
            campaign_duration: recommendation?.campaign_duration || "monthly",
          }}
        />
      )}
      <style>{`
        .flow-header { text-align: center; margin-bottom: 2rem; }
        .flow-header h1 { font-size: 28px; color: #1e293b; margin: 0 0 0.5rem; }
        .flow-header .subtitle { color: #64748b; font-size: 14px; margin: 0; }
        .step-progress {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 0.5rem;
          margin: 0 0 2rem;
        }
        .step-badge {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.5rem 0.75rem;
          background: #f1f5f9;
          border-radius: 8px;
          font-size: 12px;
          color: #64748b;
        }
        .step-badge.completed {
          background: #dcfce7;
          color: #166534;
        }
        .step-badge.active {
          background: #4f46e5;
          color: white;
        }
        .step-num {
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0,0,0,0.1);
          border-radius: 50%;
          font-weight: 600;
          font-size: 11px;
        }
        .step-badge.active .step-num { background: rgba(255,255,255,0.2); }
        .step-label { font-weight: 500; }
        .current-step { color: #64748b; margin-bottom: 0.5rem; }
        .nav-hint { font-size: 14px; color: #64748b; }
        .nav-hint a { color: #4f46e5; }

        .confirm-dialog {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .confirm-dialog-content {
          background: white;
          padding: 2rem;
          border-radius: 12px;
          max-width: 400px;
          text-align: center;
        }
        .confirm-dialog h3 {
          margin: 0 0 1rem;
          color: #1e293b;
        }
        .confirm-dialog p {
          color: #64748b;
          margin-bottom: 1.5rem;
        }
        .confirm-dialog-buttons {
          display: flex;
          gap: 1rem;
        }
        .confirm-dialog-buttons button {
          flex: 1;
          padding: 0.75rem 1rem;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          border: none;
        }
        .btn-discard {
          background: #fef2f2;
          color: #dc2626;
        }
        .btn-continue {
          background: #4f46e5;
          color: white;
        }
      `}</style>

      {showConfirmNewSession && (
        <div className="confirm-dialog">
          <div className="confirm-dialog-content">
            <h3>Start a New Campaign?</h3>
            <p>You have an existing session. Going back to intake will clear your progress. Do you want to start fresh?</p>
            <div className="confirm-dialog-buttons">
              <button className="btn-discard" onClick={confirmNewSession}>Discard & Start Over</button>
              <button className="btn-continue" onClick={cancelNewSession}>Continue Current</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
