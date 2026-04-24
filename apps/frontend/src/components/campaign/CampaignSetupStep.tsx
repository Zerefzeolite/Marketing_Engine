"use client"

import { useState } from "react"
import type { RecommendationPreviewData } from "../../lib/contracts/recommendation"
import { TemplatePreview } from "./TemplatePreview"

type CampaignSetupStepProps = {
  recommendation: RecommendationPreviewData | null
  sessionId: string
  summary?: Record<string, string> | null
  onComplete: (templateTier: "basic" | "enhanced" | "premium", packageLevel: number) => void
  onBack: () => void
  prefillData?: {
    campaignObjective?: string
  }
}

export function CampaignSetupStep({
  recommendation,
  sessionId,
  summary,
  onComplete,
  onBack,
}: CampaignSetupStepProps) {
  const [campaignName, setCampaignName] = useState("")
  const [companyName, setCompanyName] = useState(summary?.business_name || "")
  const [campaignObjective, setCampaignObjective] = useState(summary?.campaign_objective || "")
  const [messageContent, setMessageContent] = useState("")
  const [targetAudience, setTargetAudience] = useState(summary?.preferred_channel || "")
  const [sendSchedule, setSendSchedule] = useState("now")
  const [companyLogo, setCompanyLogo] = useState<File | null>(null)
  const [adImage, setAdImage] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string>("")
  const [adPreview, setAdPreview] = useState<string>("")
  const [isCreating, setIsCreating] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [showTemplatePreview, setShowTemplatePreview] = useState(false)
  const [templateTier, setTemplateTier] = useState<"basic" | "enhanced" | "premium">("basic")

  const reach = recommendation?.estimated_reachable || 0
  const selectedPackage = recommendation?.recommended_package || "starter"
  const channelSplit = recommendation?.channel_split || "email: 100%"
  const estimatedPrice = recommendation?.estimated_price || 0
  const costPerContact = recommendation?.cost_per_contact || 0.008
  const sendsCount = selectedPackage === "starter" ? 2 : selectedPackage === "growth" ? 4 : 6
  const potentialReach = reach
  const packageLevel = selectedPackage === "growth" ? 2 : selectedPackage === "premium" ? 3 : 1
  const templateTierLevel = templateTier === "enhanced" ? 2 : templateTier === "premium" ? 3 : 1
  const needsUpgrade = templateTierLevel > packageLevel
  const upgradeCostUSD = templateTier === "enhanced" ? 50 : templateTier === "premium" ? 150 : 0
  const upgradeCostJMD = templateTier === "enhanced" ? 8000 : templateTier === "premium" ? 24000 : 0

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setCompanyLogo(file)
      setLogoPreview(URL.createObjectURL(file))
    }
  }

  function handleAdImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setAdImage(file)
      setAdPreview(URL.createObjectURL(file))
    }
  }

  function validateAndContinue() {
    setErrors([])
    const newErrors: string[] = []
    
    if (!campaignName.trim()) newErrors.push("Campaign name is required")
    if (!companyName.trim()) newErrors.push("Company name is required")
    
    if (newErrors.length > 0) {
      setErrors(newErrors)
      return
    }
    
    setIsCreating(true)
    setTimeout(() => {
      onComplete(templateTier, packageLevel)
    }, 500)
  }

  if (reach === 0) {
    return (
      <section className="campaign-setup">
        <h2>Campaign Setup</h2>
        <p className="step-desc">Step 3 of 7</p>
        <p className="intro">Finalize your campaign details and branding.</p>
        
        <div className="warning-card">
          <span className="warning-icon">⚠️</span>
          <div className="warning-content">
            <h4>Campaign Has No Reach</h4>
            <p>Your budget may be too low. Please go back and increase your budget in the intake form.</p>
          </div>
          <button className="btn-back" onClick={onBack}>← Adjust Budget</button>
        </div>

        <style>{`
          .campaign-setup { max-width: 700px; margin: 0 auto; }
          .campaign-setup h2 { margin: 0 0 0.25rem; font-size: 24px; color: #1e293b; }
          .step-desc { margin: 0 0 0.5rem; color: #64748b; font-size: 14px; }
          .intro { color: #475569; margin-bottom: 1.5rem; }
          .warning-card { display: flex; flex-wrap: wrap; gap: 1rem; padding: 1.5rem; background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; align-items: center; }
          .warning-icon { font-size: 32px; }
          .warning-content { flex: 1; }
          .warning-content h4 { margin: 0 0 0.25rem; color: #dc2626; }
          .warning-content p { margin: 0; color: #991b1b; font-size: 14px; }
          .btn-back { padding: 0.75rem 1.5rem; background: #f1f5f9; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; color: #475569; }
        `}</style>
      </section>
    )
  }

  return (
    <section className="campaign-setup">
      <h2>Campaign Setup</h2>
      <p className="step-desc">Step 3 of 7</p>
      <p className="intro">Finalize your campaign details and branding.</p>

      <div className="summary-card">
        <div className="summary-header">
          <h3>Campaign Summary</h3>
          <span className="badge">{recommendation?.recommended_package}</span>
        </div>
        <div className="summary-grid">
          <div className="summary-item">
            <span className="label">Potential Reach</span>
            <span className="value">{potentialReach.toLocaleString()}</span>
            <span className="sublabel">contacts max</span>
          </div>
          <div className="summary-item">
            <span className="label">Selected Contacts</span>
            <span className="value">{reach.toLocaleString()}</span>
          </div>
          <div className="summary-item">
            <span className="label">Est. Price</span>
            <span className="value">US${estimatedPrice.toLocaleString()}</span>
          </div>
        </div>
        <div className="summary-details">
          <div className="detail-row">
            <span>Sends per Contact:</span>
            <span>{sendsCount}x</span>
          </div>
          <div className="detail-row">
            <span>Cost per Contact:</span>
            <span>US${costPerContact.toFixed(3)}</span>
          </div>
          <div className="detail-row">
            <span>Channel:</span>
            <span>{channelSplit}</span>
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3>Campaign Details</h3>
        
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="campaign_name">Campaign Name *</label>
            <input
              id="campaign_name"
              type="text"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="e.g., Summer Promotion 2026"
              className={errors.includes("Campaign name is required") ? "error" : ""}
            />
          </div>

          <div className="form-group">
            <label htmlFor="company_name">Company Name *</label>
            <input
              id="company_name"
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Your Company"
              className={errors.includes("Company name is required") ? "error" : ""}
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="campaign_objective">Campaign Objective</label>
          <textarea
            id="campaign_objective"
            value={campaignObjective}
            onChange={(e) => setCampaignObjective(e.target.value)}
            placeholder={summary?.campaign_objective || "Describe your campaign goal..."}
            rows={3}
          />
          <span className="hint">From your intake form</span>
        </div>

        <div className="form-group">
          <label htmlFor="message_content">Marketing Message</label>
          <textarea
            id="message_content"
            value={messageContent}
            onChange={(e) => setMessageContent(e.target.value)}
            placeholder="Write your marketing message here..."
            rows={4}
          />
          <span className="hint">This will be used in your campaign content</span>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="target_audience">Target Audience</label>
            <input
              id="target_audience"
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="e.g., Existing customers"
            />
          </div>

          <div className="form-group">
            <label htmlFor="send_schedule">Send Schedule</label>
            <select
              id="send_schedule"
              value={sendSchedule}
              onChange={(e) => setSendSchedule(e.target.value)}
            >
              <option value="now">Send Immediately</option>
              <option value="tomorrow">Tomorrow</option>
              <option value="next_week">Next Week</option>
              <option value="custom">Custom</option>
            </select>
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3>Brand Assets (Optional)</h3>
        
        <div className="upload-grid">
          <div className="upload-box">
            <label>Company Logo</label>
            {logoPreview ? (
              <div className="preview-box">
                <img src={logoPreview} alt="Logo" />
                <button type="button" onClick={() => { setCompanyLogo(null); setLogoPreview("") }}>Remove</button>
              </div>
            ) : (
              <>
                <input type="file" accept="image/*" onChange={handleLogoChange} />
                <span>Upload PNG or JPG</span>
              </>
            )}
          </div>

          <div className="upload-box">
            <label>Ad / Flyer Image</label>
            {adPreview ? (
              <div className="preview-box">
                <img src={adPreview} alt="Ad" />
                <button type="button" onClick={() => { setAdImage(null); setAdPreview("") }}>Remove</button>
              </div>
            ) : (
              <>
                <input type="file" accept="image/*" onChange={handleAdImageChange} />
                <span>Upload PNG or JPG</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3>Template Quality</h3>
        <p className="section-desc">Select template quality level. Higher tiers include enhanced designs.</p>
        
        <div className="template-tier-selector">
          <label className={`tier-option ${templateTier === "basic" ? "selected" : ""}`}>
            <input
              type="radio"
              name="template-tier"
              value="basic"
              checked={templateTier === "basic"}
              onChange={() => setTemplateTier("basic")}
            />
            <div className="tier-content">
              <span className="tier-name">Basic</span>
              <span className="tier-desc">Included with package</span>
            </div>
          </label>
          
          <label className={`tier-option ${templateTier === "enhanced" ? "selected" : ""}`}>
            <input
              type="radio"
              name="template-tier"
              value="enhanced"
              checked={templateTier === "enhanced"}
              onChange={() => setTemplateTier("enhanced")}
            />
            <div className="tier-content">
              <span className="tier-name">Enhanced</span>
              <span className="tier-desc">Better designs - US$50 / J$8,000</span>
            </div>
          </label>
          
          <label className={`tier-option ${templateTier === "premium" ? "selected" : ""}`}>
            <input
              type="radio"
              name="template-tier"
              value="premium"
              checked={templateTier === "premium"}
              onChange={() => setTemplateTier("premium")}
            />
            <div className="tier-content">
              <span className="tier-name">Premium</span>
              <span className="tier-desc">Best designs - US$150 / J$24,000</span>
            </div>
          </label>
        </div>

        {needsUpgrade && (
          <div className="upgrade-notice">
            <span className="upgrade-icon">💡</span>
            <p>Template upgrade adds US${upgradeCostUSD} (J${upgradeCostJMD}) to your total cost.</p>
          </div>
        )}
      </div>

      <div className="template-section">
        <button 
          type="button"
          className="preview-templates-btn"
          onClick={() => setShowTemplatePreview(!showTemplatePreview)}
        >
          {showTemplatePreview ? "▼ Hide Templates" : "📝 Preview Message Templates"}
        </button>
        
        {showTemplatePreview && (
          <>
            {(!companyLogo && !adImage) && (
              <div className="template-notice">
                <span className="notice-icon">ℹ️</span>
                <p>Your logo or ad image will appear here in the message template. Upload assets above to see your branded preview.</p>
              </div>
            )}
            <TemplatePreview 
              campaignName={campaignName}
              companyName={companyName}
              companyLogo={companyLogo}
              adImage={adImage}
              objective={campaignObjective || summary?.campaign_objective || ""}
              channel={summary?.preferred_channel || "email"}
            />
          </>
        )}
      </div>

      {errors.length > 0 && (
        <div className="error-list">
          {errors.map((err, i) => <p key={i}>{err}</p>)}
        </div>
      )}

      <div className="actions">
        <button className="btn-back" onClick={onBack}>← Back</button>
        <button className="btn-primary" onClick={validateAndContinue} disabled={isCreating}>
          {isCreating ? "Saving..." : "Continue →"}
        </button>
      </div>

      <style>{`
        .campaign-setup { max-width: 700px; margin: 0 auto; }
        .campaign-setup h2 { margin: 0 0 0.25rem; font-size: 24px; color: #1e293b; }
        .step-desc { margin: 0 0 0.5rem; color: #64748b; font-size: 14px; }
        .intro { color: #475569; margin-bottom: 1.5rem; }
        
        .summary-card { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 1.25rem; margin-bottom: 1.5rem; }
        .summary-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
        .summary-header h3 { margin: 0; color: #166534; font-size: 16px; }
        .badge { padding: 0.25rem 0.75rem; background: #22c55e; color: white; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: capitalize; }
        .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
        .summary-item { text-align: center; }
        .summary-item .label { display: block; font-size: 12px; color: #15803d; margin-bottom: 0.25rem; }
        .summary-item .value { font-size: 20px; font-weight: 700; color: #166534; }
        .summary-item .sublabel { font-size: 11px; color: #94a3b8; margin-left: 0.25rem; }
        
        .summary-details { margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #bbf7d0; }
        .detail-row { display: flex; justify-content: space-between; font-size: 13px; color: #64748b; margin-bottom: 0.25rem; }
        
        .form-section { margin-bottom: 1.5rem; }
        .form-section h3 { font-size: 16px; color: #1e293b; margin: 0 0 1rem; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .form-group { margin-bottom: 1rem; }
        .form-group label { display: block; font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 0.5rem; }
        .form-group input, .form-group textarea, .form-group select { width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; }
        .form-group textarea { min-height: 100px; resize: vertical; }
        .form-group input:focus, .form-group textarea:focus, .form-group select:focus { outline: none; border-color: #4f46e5; }
        .form-group .hint { display: block; font-size: 12px; color: #64748b; margin-top: 0.25rem; }
        
        .upload-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
        .upload-box { padding: 1.5rem; border: 2px dashed #d1d5db; border-radius: 12px; text-align: center; }
        .upload-box label { display: block; font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 0.5rem; }
        .upload-box input { margin-bottom: 0.5rem; }
        .upload-box span { display: block; font-size: 12px; color: #64748b; }
        .preview-box img { max-width: 100px; max-height: 100px; border-radius: 8px; }
        .preview-box button { margin-top: 0.5rem; padding: 0.25rem 0.5rem; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; }
        
        .template-section { margin-top: 1.5rem; }
        .preview-templates-btn { width: 100%; padding: 1rem; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500; color: #0369a1; transition: all 0.2s; }
        .preview-templates-btn:hover { background: #e0f2fe; border-color: #7dd3fc; }
        .template-notice { display: flex; gap: 0.75rem; padding: 1rem; background: #fef9c3; border: 1px solid #fde047; border-radius: 8px; margin-bottom: 1rem; }
        .template-notice .notice-icon { font-size: 20px; }
        .template-notice p { margin: 0; font-size: 13px; color: #713f12; line-height: 1.4; }
        
        .section-desc { color: #64748b; font-size: 13px; margin-bottom: 1rem; }
        .template-tier-selector { display: flex; flex-direction: column; gap: 0.75rem; }
        .tier-option { display: flex; align-items: center; gap: 1rem; padding: 1rem; border: 2px solid #e2e8f0; border-radius: 10px; cursor: pointer; transition: all 0.2s; }
        .tier-option:hover { border-color: #cbd5e1; }
        .tier-option.selected { border-color: #4f46e5; background: #f5f3ff; }
        .tier-option input { margin: 0; }
        .tier-content { display: flex; flex-direction: column; }
        .tier-name { font-weight: 600; color: #1e293b; }
        .tier-desc { font-size: 13px; color: #64748b; }
        .upgrade-notice { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 1rem; background: #fef3c7; border: 1px solid #fde047; border-radius: 8px; margin-top: 1rem; }
        .upgrade-icon { font-size: 18px; }
        .upgrade-notice p { margin: 0; font-size: 13px; color: #92400e; }
        
        .error-list { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; }
        .error-list p { color: #dc2626; font-size: 14px; margin: 0.25rem 0; }
        
        .actions { display: flex; gap: 1rem; margin-top: 1.5rem; }
        .btn-back { padding: 0.75rem 1.5rem; background: #f1f5f9; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; color: #475569; }
        .btn-primary { flex: 1; padding: 0.75rem 1.5rem; background: #4f46e5; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; }
        .btn-primary:disabled { opacity: 0.7; }
      `}</style>
    </section>
  )
}