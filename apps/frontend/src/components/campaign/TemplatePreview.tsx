"use client"

import { useState } from "react"

type TemplatePreviewProps = {
  campaignName: string
  companyName: string
  companyLogo?: File | null
  adImage?: File | null
  objective: string
  channel: string
}

const emailTemplates = {
  starter: {
    subject: "Special Offer Just For You!",
    preheader: "Don't miss out on this exclusive deal...",
  },
  growth: {
    subject: "Your Personalized Experience Awaits",
    preheader: "We've curated something special based on your preferences...",
  },
  premium: {
    subject: "Exclusive VIP Access - Limited Time",
    preheader: "As a valued member, you get early access to...",
  },
}

const smsTemplates = {
  starter: "Hi! Special offer just for you. Click: {{short_url}} - {{company_name}}",
  growth: "Your personalized deal is ready! {{personalized_offer}} - {{company_name}}",
  premium: "VIP Alert: Exclusive access granted. Claim your perks now: {{vip_link}} - {{company_name}}",
}

export function TemplatePreview({ campaignName, companyName, companyLogo, adImage, objective, channel }: TemplatePreviewProps) {
  const [selectedPackage, setSelectedPackage] = useState<"starter" | "growth" | "premium">("growth")
  const [previewMode, setPreviewMode] = useState<"email" | "sms">("email")

  const emailTemplate = emailTemplates[selectedPackage]
  const smsTemplate = smsTemplates[selectedPackage as keyof typeof smsTemplates]

  const hasLogo = !!companyLogo
  const hasBanner = !!adImage
  const hasAnyAsset = hasLogo || hasBanner

  const sampleContact = {
    first_name: "John",
    last_name: "Smith",
    company: companyName || "Your Company",
    offer_code: "SAVE20",
    expiry_date: "7 days",
    personalized_link: "https://example.com/offer/SAVE20",
  }

  const logoUrl = hasLogo ? URL.createObjectURL(companyLogo) : null
  const bannerUrl = hasBanner ? URL.createObjectURL(adImage) : null

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${emailTemplate.subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #f8f9fa;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          ${hasLogo ? `
          <!-- Logo Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 20px 30px; text-align: center;">
              <img src="${logoUrl}" alt="${sampleContact.company}" style="max-height: 60px; max-width: 200px;" />
            </td>
          </tr>
          ` : `
          <!-- Text Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">${sampleContact.company}</h1>
            </td>
          </tr>
          `}
          
          ${bannerUrl ? `
          <!-- Banner Image -->
          <tr>
            <td style="height: 200px; padding: 0;">
              <img src="${bannerUrl}" alt="Campaign Banner" style="width: 100%; height: 200px; object-fit: cover;" />
            </td>
          </tr>
          ` : `
          <!-- Hero Placeholder -->
          <tr>
            <td style="background-color: #e0e7ff; height: 200px; display: flex; align-items: center; justify-content: center;">
              <span style="color: #6366f1; font-size: 48px;">${hasLogo ? "📧" : "🎉"}</span>
            </td>
          </tr>
          `}
          
          <!-- Content -->
          <tr>
            <td style="padding: 30px;">
              <h2 style="color: #1e293b; margin: 0 0 15px; font-size: 22px;">${emailTemplate.subject}</h2>
              <p style="color: #64748b; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                ${objective || "We've got something special waiting for you!"}
              </p>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${sampleContact.personalized_link}" style="display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      Claim Your Offer →
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Offer Code -->
              <div style="background: #f0fdf4; border: 2px dashed #22c55e; border-radius: 8px; padding: 15px; text-align: center; margin: 25px 0;">
                <span style="color: #166534; font-size: 14px;">Use code: </span>
                <span style="color: #16a34a; font-size: 20px; font-weight: 700; letter-spacing: 2px;">${sampleContact.offer_code}</span>
                <span style="color: #15803d; font-size: 12px; display: block; margin-top: 5px;">Expires in ${sampleContact.expiry_date}</span>
              </div>
              
              <p style="color: #94a3b8; font-size: 13px; margin: 0;">
                You're receiving this because you opted in to receive marketing emails from ${sampleContact.company}.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f1f5f9; padding: 20px; text-align: center;">
              <p style="color: #64748b; font-size: 12px; margin: 0 0 10px;">
                ${sampleContact.company} © 2026 All rights reserved
              </p>
              <p style="margin: 0;">
                <a href="{{unsubscribe}}" style="color: #64748b; font-size: 12px; text-decoration: underline;">Unsubscribe</a>
                <span style="color: #cbd5e1; margin: 0 8px;">|</span>
                <a href="{{privacy}}" style="color: #64748b; font-size: 12px; text-decoration: underline;">Privacy Policy</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  return (
    <section className="template-preview">
      <div className="preview-header">
        <h3>Message Templates</h3>
        <p>Preview how your messages will appear to contacts</p>
      </div>

      <div className="preview-tabs">
        <button 
          className={`tab ${previewMode === "email" ? "active" : ""}`}
          onClick={() => setPreviewMode("email")}
        >
          📧 Email Template
        </button>
        <button 
          className={`tab ${previewMode === "sms" ? "active" : ""}`}
          onClick={() => setPreviewMode("sms")}
        >
          💬 SMS Template
        </button>
      </div>

      <div className="preview-controls">
        <div className="package-selector">
          <label>Package Style:</label>
          <div className="package-buttons">
            {(["starter", "growth", "premium"] as const).map((pkg) => (
              <button
                key={pkg}
                className={`pkg-btn ${pkg} ${selectedPackage === pkg ? "active" : ""}`}
                onClick={() => setSelectedPackage(pkg)}
              >
                {pkg.charAt(0).toUpperCase() + pkg.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!hasAnyAsset ? (
        <div className="no-assets-preview">
          <div className="preview-placeholder">
            <span className="placeholder-icon">🎨</span>
            <h4>Upload Your Assets to See Templates</h4>
            <p>Add your logo and/or ad image in the Brand Assets section above to preview your custom email and SMS templates.</p>
          </div>
        </div>
      ) : previewMode === "email" ? (
        <div className="email-preview">
          <div className="preview-device">
            <div className="device-header">
              <div className="device-notch" />
              <span className="device-time">9:41</span>
            </div>
            <div className="email-client">
              {/* Email Header */}
              <div className="email-header">
                <div className="sender-avatar">{companyName?.charAt(0) || "C"}</div>
                <div className="sender-info">
                  <span className="sender-name">{companyName || "Your Company"}</span>
                  <span className="email-subject">{emailTemplate.subject}</span>
                  <span className="email-preheader">{emailTemplate.preheader}</span>
                </div>
              </div>
              
              {/* Email Content Preview */}
              <div className="email-content">
                {hasLogo ? (
                  <div className="email-logo-preview">
                    <img src={logoUrl} alt="Logo" />
                  </div>
                ) : (
                  <div className="email-header-bg">
                    <span>{companyName?.charAt(0) || "C"}</span>
                  </div>
                )}
                
                {bannerUrl ? (
                  <img src={bannerUrl} alt="Banner" className="banner-preview" />
                ) : (
                  <div className="hero-placeholder">
                    <span>{hasLogo ? "📧" : "🎉"}</span>
                    <span>Campaign Image</span>
                  </div>
                )}
                
                <div className="content-body">
                  <h4>{emailTemplate.subject}</h4>
                  <p>{objective || "We've got something special waiting for you!"}</p>
                  
                  <div className="cta-button">
                    Claim Your Offer →
                  </div>
                  
                  <div className="offer-box">
                    <span className="offer-label">Use code:</span>
                    <span className="offer-code">{sampleContact.offer_code}</span>
                    <span className="offer-expiry">Expires in {sampleContact.expiry_date}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="template-details">
            <h4>Template Details</h4>
            <div className="detail-row">
              <span className="label">Subject Line:</span>
              <span className="value">{emailTemplate.subject}</span>
            </div>
            <div className="detail-row">
              <span className="label">Preheader:</span>
              <span className="value">{emailTemplate.preheader}</span>
            </div>
            <div className="detail-row">
              <span className="label">Design:</span>
              <span className="value">Responsive HTML (600px max-width)</span>
            </div>
            <div className="detail-row">
              <span className="label">Features:</span>
              <span className="value">CTA Button, Offer Code Box, Footer Links</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="sms-preview">
          <div className="preview-device sms">
            <div className="device-header">
              <div className="device-notch" />
              <span className="device-time">9:41</span>
            </div>
            <div className="sms-thread">
              <div className="sms-bubble sent">
                <span className="sms-text">Hi! Special offer just for you.</span>
                <span className="sms-time">9:41 AM</span>
              </div>
              <div className="sms-bubble received">
                <span className="sms-text">{smsTemplate.replace(/\{\{[^}]+\}\}/g, "...")}</span>
                <span className="sms-time">9:42 AM</span>
              </div>
            </div>
          </div>
          
          <div className="template-details">
            <h4>SMS Template Details</h4>
            <div className="detail-row">
              <span className="label">Character Count:</span>
              <span className="value">{smsTemplate.length}/160 (1 segment)</span>
            </div>
            <div className="detail-row">
              <span className="label">Dynamic Fields:</span>
              <span className="value">short_url, company_name, personalized_offer</span>
            </div>
            <div className="detail-row">
              <span className="label">Compliance:</span>
              <span className="value">STOP reply included, opt-out handling</span>
            </div>
            <div className="sms-variables">
              <h5>Available Variables</h5>
              <code>{"{{first_name}}"}</code>
              <code>{"{{company_name}}"}</code>
              <code>{"{{offer_code}}"}</code>
              <code>{"{{personalized_link}}"}</code>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .template-preview { background: white; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; }
        .preview-header { padding: 1.5rem; border-bottom: 1px solid #e2e8f0; }
        .preview-header h3 { margin: 0 0 0.25rem; color: #1e293b; font-size: 18px; }
        .preview-header p { margin: 0; color: #64748b; font-size: 13px; }
        
        .preview-tabs { display: flex; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
        .preview-tabs .tab { flex: 1; padding: 1rem; background: none; border: none; cursor: pointer; font-size: 14px; font-weight: 500; color: #64748b; transition: all 0.2s; }
        .preview-tabs .tab.active { background: white; color: #4f46e5; border-bottom: 2px solid #4f46e5; }
        
        .preview-controls { padding: 1rem 1.5rem; border-bottom: 1px solid #e2e8f0; }
        .package-selector label { display: block; font-size: 12px; color: #64748b; margin-bottom: 0.5rem; }
        .package-buttons { display: flex; gap: 0.5rem; }
        .pkg-btn { padding: 0.5rem 1rem; border: 1px solid #e2e8f0; border-radius: 6px; background: white; cursor: pointer; font-size: 13px; transition: all 0.2s; }
        .pkg-btn.active { border-color: #4f46e5; background: #eef2ff; color: #4f46e5; }
        .pkg-btn.starter { border-left: 3px solid #22c55e; }
        .pkg-btn.growth { border-left: 3px solid #4f46e5; }
        .pkg-btn.premium { border-left: 3px solid #f59e0b; }
        
        .email-preview, .sms-preview { padding: 1.5rem; }
        
        .preview-device { max-width: 320px; margin: 0 auto; border: 8px solid #1e293b; border-radius: 24px; overflow: hidden; background: white; }
        .preview-device.sms { max-width: 280px; }
        .device-header { background: #f8fafc; padding: 8px 12px; display: flex; justify-content: center; position: relative; }
        .device-notch { width: 80px; height: 4px; background: #cbd5e1; border-radius: 2px; position: absolute; top: 10px; }
        .device-time { font-size: 11px; color: #64748b; font-weight: 500; }
        
        .email-client { background: white; min-height: 400px; }
        .email-header { display: flex; gap: 10px; padding: 12px; border-bottom: 1px solid #f1f5f9; }
        .sender-avatar { width: 40px; height: 40px; background: linear-gradient(135deg, #4f46e5, #7c3aed); border-radius: 20px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 16px; }
        .sender-info { display: flex; flex-direction: column; }
        .sender-name { font-size: 14px; font-weight: 600; color: #1e293b; }
        .email-subject { font-size: 13px; color: #1e293b; font-weight: 500; }
        .email-preheader { font-size: 12px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        
        .email-content { padding: 0; }
        .hero-placeholder { background: #e0e7ff; height: 120px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #6366f1; font-size: 12px; gap: 4px; }
        .content-body { padding: 16px; }
        .content-body h4 { margin: 0 0 8px; font-size: 15px; color: #1e293b; }
        .content-body p { margin: 0 0 12px; font-size: 13px; color: #64748b; line-height: 1.4; }
        .cta-button { display: inline-block; background: linear-gradient(135deg, #4f46e5, #7c3aed); color: white; padding: 10px 20px; border-radius: 6px; font-size: 13px; font-weight: 600; }
        .offer-box { background: #f0fdf4; border: 1px dashed #22c55e; border-radius: 6px; padding: 10px; text-align: center; margin-top: 12px; }
        .offer-label { font-size: 11px; color: #166534; }
        .offer-code { display: block; font-size: 16px; font-weight: 700; color: #16a34a; letter-spacing: 1px; }
        .offer-expiry { font-size: 10px; color: #15803d; }
        
        .sms-thread { padding: 16px; }
        .sms-bubble { max-width: 85%; padding: 10px 14px; border-radius: 18px; font-size: 14px; line-height: 1.4; margin-bottom: 8px; }
        .sms-bubble.sent { background: #4f46e5; color: white; margin-left: auto; border-bottom-right-radius: 4px; }
        .sms-bubble.received { background: #f1f5f9; color: #1e293b; border-bottom-left-radius: 4px; }
        .sms-time { display: block; font-size: 10px; opacity: 0.7; text-align: right; margin-top: 4px; }
        
        .template-details { margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid #e2e8f0; }
        .template-details h4 { margin: 0 0 1rem; font-size: 14px; color: #1e293b; }
        .no-assets-preview { padding: 2rem; text-align: center; }
        .preview-placeholder { background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 2rem; }
        .placeholder-icon { font-size: 48px; display: block; margin-bottom: 1rem; }
        .preview-placeholder h4 { margin: 0 0 0.5rem; color: #475569; font-size: 16px; }
        .preview-placeholder p { margin: 0; color: #64748b; font-size: 14px; line-height: 1.5; }
        .detail-row { display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #f1f5f9; }
        .detail-row .label { font-size: 13px; color: #64748b; }
        .detail-row .value { font-size: 13px; color: #1e293b; font-weight: 500; }
        
        .sms-variables { margin-top: 1rem; }
        .sms-variables h5 { margin: 0 0 0.5rem; font-size: 12px; color: #64748b; }
        .sms-variables code { display: inline-block; background: #f1f5f9; padding: 2px 8px; border-radius: 4px; font-size: 11px; color: #4f46e5; margin: 2px; }
      `}</style>
    </section>
  )
}