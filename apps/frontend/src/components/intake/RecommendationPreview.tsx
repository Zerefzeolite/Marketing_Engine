import { useRouter } from "next/navigation"
import { useState, useEffect, useMemo } from "react"
import type { RecommendationPreviewData } from "../../lib/contracts/recommendation"
import { calculatePackagePricing } from "../../lib/api/intake"

type RecommendationPreviewProps = {
  recommendation: RecommendationPreviewData | null
  summary?: Record<string, string> | null
  onPackageSelect?: (packageName: string) => void
}

const packageColors: Record<string, { bg: string; text: string; label: string }> = {
  starter: { bg: "#dcfce7", text: "#166534", label: "Starter" },
  growth: { bg: "#dbeafe", text: "#1e40af", label: "Growth" },
  premium: { bg: "#fef3c7", text: "#92400e", label: "Premium" },
}

export function RecommendationPreview({
  recommendation,
  summary,
  onPackageSelect,
}: RecommendationPreviewProps) {
  const router = useRouter()
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null)
  const [sliderValue, setSliderValue] = useState(recommendation?.estimated_reachable || 500)

  // Recalculate package options when slider changes
  const dynamicPackageOptions = useMemo(() => {
    if (!recommendation) return []
    const channel = recommendation.channel_split?.includes("sms") ? "sms" : "email"
    return calculatePackagePricing(sliderValue, channel, recommendation.campaign_duration || "monthly")
  }, [sliderValue, recommendation])

  const packageOptions = dynamicPackageOptions.length > 0 ? dynamicPackageOptions : (recommendation?.package_options || [])

  // Sync slider with recommendation when it changes
  useEffect(() => {
    if (recommendation?.estimated_reachable) {
      setSliderValue(recommendation.estimated_reachable)
    }
  }, [recommendation?.estimated_reachable])

  function handleProceed() {
    const pkg = selectedPackage || recommendation?.recommended_package || "starter"
    const params = new URLSearchParams({
      package: pkg,
      reach: String(sliderValue),
      channel: recommendation?.channel_split || "email: 100%",
      confidence: String(recommendation?.confidence || 0.85),
      business_name: summary?.business_name || "My Business",
      target_audience: summary?.preferred_channel || "",
      objective: summary?.campaign_objective || "",
    })
    sessionStorage.setItem("intake_session", JSON.stringify({
      recommendation,
      summary,
      selectedPackage: pkg,
      timestamp: Date.now(),
    }))
    window.location.href = `/campaign-flow?${params.toString()}`
  }

  function handleSelectPackage(pkgName: string) {
    setSelectedPackage(pkgName)
    onPackageSelect?.(pkgName)
  }

  if (!recommendation) {
    return (
      <section className="recommendation-empty">
        <div className="empty-icon">📋</div>
        <p>Fill out the form to get your personalized campaign recommendation</p>
        <style>{`.recommendation-empty { text-align: center; padding: 3rem 1rem; color: #64748b; } .empty-icon { font-size: 48px; margin-bottom: 1rem; }`}</style>
      </section>
    )
  }

  const pkg = packageColors[recommendation.recommended_package] || packageColors.starter
  const confidencePct = Math.round(recommendation.confidence * 100)

  return (
    <section className="recommendation-card">
      <div className="rec-header">
        <h3>Your Recommendation</h3>
        <span className="package-badge" style={{ background: pkg.bg, color: pkg.text }}>
          {pkg.label} Package
        </span>
      </div>

      <div className="rec-grid">
        <div className="rec-stat">
          <div className="stat-value">{recommendation.estimated_reachable.toLocaleString()}</div>
          <div className="stat-label">Estimated Reach</div>
        </div>
        <div className="rec-stat">
          <div className="stat-value">{recommendation.channel_split}</div>
          <div className="stat-label">Channel Mix</div>
        </div>
        <div className="rec-stat">
          <div className="stat-value" style={{ color: confidencePct >= 80 ? "#16a34a" : confidencePct >= 70 ? "#ca8a04" : "#dc2626" }}>
            {confidencePct}%
          </div>
          <div className="stat-label">Confidence</div>
        </div>
      </div>

      <div className="reach-slider">
        <label>Contact Range: <strong>{sliderValue.toLocaleString()} contacts</strong></label>
        <input
          type="range"
          min={100}
          max={Math.max(recommendation?.estimated_reachable || 1000, sliderValue) * 2}
          value={sliderValue}
          onChange={(e) => setSliderValue(parseInt(e.target.value))}
        />
        <div className="slider-labels">
          <span>100</span>
          <span>{Math.round((Math.max(recommendation?.estimated_reachable || 1000, sliderValue) * 2) / 2).toLocaleString()}</span>
        </div>
      </div>

      {packageOptions.length > 0 && (
        <div className="package-options">
          <h4>Select Your Package</h4>
          {packageOptions.map((opt, i) => {
            const isSelected = selectedPackage === opt.name || (!selectedPackage && opt.name === recommendation.recommended_package)
            const markup = opt.price / (opt.reach * opt.cost_per_contact)
            const marginPct = Math.round((markup - 1) * 100)
            return (
              <div 
                key={opt.name} 
                className={`package-option ${opt.name === recommendation.recommended_package ? "recommended" : ""} ${isSelected ? "selected" : ""}`}
                onClick={() => handleSelectPackage(opt.name)}
              >
                <div className="option-header">
                  <span className="option-name">{opt.name}</span>
                  {isSelected && <span className="selected-badge">Selected</span>}
                  {opt.name === recommendation.recommended_package && !isSelected && <span className="recommended-badge">Recommended</span>}
                </div>
<div className="option-details">
                    <div className="detail-row">
                      <span>Reach:</span>
                      <span>{opt.reach.toLocaleString()} contacts</span>
                    </div>
                    {recommendation.is_client_mode ? (
                      <>
                        <div className="detail-row">
                          <span>Price:</span>
                          <span className="price">US${opt.price.toLocaleString()}</span>
                        </div>
                        <div className="detail-row">
                          <span>JMD Equivalent:</span>
                          <span className="price">J$${opt.price_jmd.toLocaleString()}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="detail-row">
                          <span>Your Price:</span>
                          <span className="price">US${opt.price.toLocaleString()}</span>
                        </div>
                        <div className="detail-row">
                          <span>Your Cost/Contact:</span>
                          <span className="cost">US${opt.cost_per_contact.toFixed(3)}</span>
                        </div>
                        <div className="detail-row profit">
                          <span>Your Profit Margin:</span>
                          <span className={marginPct > 0 ? "profit-positive" : "profit-negative"}>{marginPct > 0 ? `+${marginPct}%` : `${marginPct}%`}</span>
                        </div>
                      </>
                    )}
                    <div className="detail-row">
                      <span>Channels:</span>
                      <span>{opt.channel_split}</span>
                    </div>
                  </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="rec-rationale">
        <h4>Why this recommendation?</h4>
        <p>{recommendation.rationale_summary}</p>
      </div>

      <div className="rec-actions">
        <button className="btn-primary" onClick={handleProceed}>Proceed with this package</button>
        <button className="btn-secondary" onClick={handleProceed}>View Full Campaign Flow</button>
      </div>

      <style>{`
        .recommendation-card {
          margin-top: 2rem;
          padding: 1.5rem;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .rec-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }
        .rec-header h3 {
          margin: 0;
          font-size: 18px;
          color: #1e293b;
        }
        .package-badge {
          padding: 0.375rem 0.75rem;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 600;
        }
        .rec-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        .reach-slider { padding: 1rem; background: #f8fafc; border-radius: 8px; margin-bottom: 1rem; }
        .reach-slider label { font-size: 14px; font-weight: 600; color: #1e293b; display: block; }
        .reach-slider input { width: 100%; margin: 0.5rem 0; cursor: pointer; }
        .slider-labels { display: flex; justify-content: space-between; font-size: 11px; color: #94a3b8; }
        .slider-note { font-size: 12px; color: #64748b; margin: 0; }
        .rec-stat {
          text-align: center;
          padding: 1rem;
          background: #f8fafc;
          border-radius: 8px;
        }
        .stat-value {
          font-size: 20px;
          font-weight: 700;
          color: #1e293b;
        }
        .stat-label {
          font-size: 12px;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .rec-rationale {
          padding: 1rem;
          background: #f1f5f9;
          border-radius: 8px;
          margin-bottom: 1.5rem;
        }
        .rec-rationale h4 {
          margin: 0 0 0.5rem;
          font-size: 14px;
          color: #475569;
        }
        .rec-rationale p {
          margin: 0;
          color: #334155;
          line-height: 1.5;
        }
        .package-options { margin-bottom: 1.5rem; }
        .package-options h4 { margin: 0 0 0.75rem; font-size: 14px; color: #1e293b; }
        .package-option { border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem; margin-bottom: 0.75rem; cursor: pointer; transition: all 0.2s; }
        .package-option:hover { border-color: #4f46e5; box-shadow: 0 2px 8px rgba(79, 70, 229, 0.15); }
        .package-option.recommended { border-color: #4f46e5; background: #f5f3ff; }
        .package-option.selected { border-color: #4f46e5; background: #eef2ff; box-shadow: 0 0 0 2px #4f46e5; }
        .option-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
        .option-name { font-weight: 600; text-transform: capitalize; color: #1e293b; }
        .recommended-badge { font-size: 11px; background: #4f46e5; color: white; padding: 0.125rem 0.5rem; border-radius: 10px; }
        .selected-badge { font-size: 11px; background: #16a34a; color: white; padding: 0.125rem 0.5rem; border-radius: 10px; }
        .option-details .detail-row { display: flex; justify-content: space-between; font-size: 13px; color: #64748b; margin-bottom: 0.25rem; }
        .option-details .detail-row.profit { margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px dashed #e2e8f0; }
        .option-details .price { font-weight: 600; color: #16a34a; font-size: 14px; }
        .option-details .cost { font-weight: 500; color: #dc2626; }
        .profit-positive { color: #16a34a; font-weight: 600; }
        .profit-negative { color: #dc2626; font-weight: 600; }
        .rec-actions {
          display: flex;
          gap: 1rem;
        }
        .rec-actions button {
          flex: 1;
          padding: 0.75rem 1rem;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }
        .btn-primary {
          background: #4f46e5;
          color: white;
        }
        .btn-primary:hover {
          background: #4338ca;
        }
        .btn-secondary {
          background: #f1f5f9;
          color: #475569;
        }
        .btn-secondary:hover {
          background: #e2e8f0;
        }
      `}</style>
    </section>
  )
}