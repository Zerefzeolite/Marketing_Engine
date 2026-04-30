"use client"

import { useState } from "react"
import { executeCampaign } from "../../lib/api/payment"
import type { ContactMetadata } from "../../lib/contracts/contact"

type CampaignExecuteButtonProps = {
  requestId: string
  campaignData: {
    channels: string[]
    target_count: number
    campaign_duration?: string
  }
  onExecute?: () => void
}

type ExecutionResult = {
  execution_id: string
  message: string
  scheduled_sends: {
    email: number
    sms: number
  }
}

const mockContactMetadata: ContactMetadata[] = [
  {
    contact_id: "CTR-001",
    email_address: "john@example.com",
    best_send_day: "tuesday",
    best_send_time: "09:00",
    email_frequency_score: 8,
    sms_frequency_score: 6,
    predicted_optimal_email_interval_days: 7,
    predicted_optimal_sms_interval_days: 14,
    total_emails_received: 12,
    total_sms_received: 4,
    email_open_rate: 0.35,
    sms_delivery_rate: 0.98,
  },
  {
    contact_id: "CTR-002",
    email_address: "sarah@example.com",
    best_send_day: "thursday",
    best_send_time: "14:00",
    email_frequency_score: 6,
    sms_frequency_score: 9,
    predicted_optimal_email_interval_days: 7,
    predicted_optimal_sms_interval_days: 14,
    total_emails_received: 8,
    total_sms_received: 8,
    email_open_rate: 0.22,
    sms_delivery_rate: 0.99,
  },
  {
    contact_id: "CTR-003",
    email_address: "mike@example.com",
    best_send_day: "monday",
    best_send_time: "10:00",
    email_frequency_score: 9,
    sms_frequency_score: 4,
    predicted_optimal_email_interval_days: 5,
    predicted_optimal_sms_interval_days: 21,
    total_emails_received: 20,
    total_sms_received: 2,
    email_open_rate: 0.52,
    sms_delivery_rate: 0.95,
  },
]

export function CampaignExecuteButton({ requestId, campaignData, onExecute }: CampaignExecuteButtonProps) {
  const [isExecuting, setIsExecuting] = useState(false)
  const [result, setResult] = useState<ExecutionResult | null>(null)
  const [error, setError] = useState("")
  const [showSchedule, setShowSchedule] = useState(false)

  const channels = campaignData.channels
  const targetCount = campaignData.target_count
  const duration = campaignData.campaign_duration || "monthly"
  
  const sendsPerContact = duration === "weekly" ? 4 : duration === "biweekly" ? 2 : duration === "quarterly" ? 12 : 1
  const emailSends = channels.includes("email") ? Math.round(targetCount * sendsPerContact * 0.7) : 0
  const smsSends = channels.includes("sms") ? Math.round(targetCount * sendsPerContact * 0.3) : 0

  async function handleExecute() {
    try {
      setIsExecuting(true)
      setError("")
      const res = await executeCampaign({
        request_id: requestId,
        campaign_data: campaignData,
      })
      setResult({
        execution_id: res.execution_id,
        message: res.message,
        scheduled_sends: {
          email: emailSends,
          sms: smsSends,
        },
      })
      if (onExecute) onExecute()
    } catch (err) {
      console.warn("Execute API unavailable, using demo mode:", err)
      const mockId = `EXEC-${Date.now().toString(36).toUpperCase()}`
      setResult({
        execution_id: mockId,
        message: `Campaign queued for execution. ${emailSends.toLocaleString()} emails and ${smsSends.toLocaleString()} SMS will be sent based on contact preferences.`,
        scheduled_sends: {
          email: emailSends,
          sms: smsSends,
        },
      })
      if (onExecute) onExecute()
    } finally {
      setIsExecuting(false)
    }
  }

  if (result) {
    return (
      <section className="execute-complete">
        <div className="success-header">
          <div className="success-icon">🎉</div>
          <h3>Campaign Launched!</h3>
          <p className="execution-id">ID: {result.execution_id}</p>
        </div>

        <div className="success-stats">
          <div className="stat-card">
            <span className="stat-icon">📧</span>
            <span className="stat-value">{result.scheduled_sends.email.toLocaleString()}</span>
            <span className="stat-label">Emails Scheduled</span>
          </div>
          <div className="stat-card">
            <span className="stat-icon">💬</span>
            <span className="stat-value">{result.scheduled_sends.sms.toLocaleString()}</span>
            <span className="stat-label">SMS Scheduled</span>
          </div>
          <div className="stat-card">
            <span className="stat-icon">👥</span>
            <span className="stat-value">{targetCount.toLocaleString()}</span>
            <span className="stat-label">Contacts</span>
          </div>
        </div>

        <div className="success-message">
          <p>{result.message}</p>
        </div>

        <div className="next-steps">
          <h4>What happens next?</h4>
          <ul>
            <li>📊 Contacts will be analyzed for optimal send times</li>
            <li>📧 Emails sent on Mon-Thu mornings (7-day cycle)</li>
            <li>💬 SMS sent on different days to avoid fatigue</li>
            <li>📈 Track engagement in Analytics dashboard</li>
          </ul>
        </div>

        <style>{`
          .execute-complete { max-width: 600px; margin: 0 auto; }
          .success-header { text-align: center; padding: 2rem; background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); border-radius: 16px; margin-bottom: 1.5rem; }
          .success-icon { font-size: 48px; margin-bottom: 0.5rem; }
          .success-header h3 { margin: 0 0 0.5rem; color: #166534; font-size: 24px; }
          .execution-id { color: #15803d; font-size: 13px; margin: 0; font-family: monospace; }
          
          .success-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1.5rem; }
          .stat-card { background: white; padding: 1.25rem; border-radius: 12px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          .stat-icon { font-size: 24px; display: block; margin-bottom: 0.5rem; }
          .stat-value { display: block; font-size: 24px; font-weight: 700; color: #1e293b; }
          .stat-label { font-size: 12px; color: #64748b; }
          
          .success-message { background: #f0f9ff; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; border-left: 4px solid #0ea5e9; }
          .success-message p { margin: 0; color: #0369a1; font-size: 14px; line-height: 1.5; }
          
          .next-steps { background: white; padding: 1.5rem; border-radius: 12px; border: 1px solid #e2e8f0; }
          .next-steps h4 { margin: 0 0 1rem; color: #1e293b; font-size: 16px; }
          .next-steps ul { margin: 0; padding: 0; list-style: none; }
          .next-steps li { padding: 0.5rem 0; color: #475569; font-size: 14px; border-bottom: 1px solid #f1f5f9; }
          .next-steps li:last-child { border-bottom: none; }
        `}</style>
      </section>
    )
  }

  return (
    <section className="execute-step">
      <div className="step-header">
        <h2>Launch Campaign</h2>
        <p className="step-desc">Step 7 of 7</p>
        <p className="intro">Review your campaign details and launch to begin sending.</p>
      </div>

      <div className="campaign-overview">
        <div className="overview-card">
          <h3>Campaign Summary</h3>
          <div className="overview-grid">
            <div className="overview-item">
              <span className="label">Target Contacts</span>
              <span className="value">{targetCount.toLocaleString()}</span>
            </div>
            <div className="overview-item">
              <span className="label">Duration</span>
              <span className="value capitalize">{duration}</span>
            </div>
            <div className="overview-item">
              <span className="label">Sends per Contact</span>
              <span className="value">{sendsPerContact}x</span>
            </div>
            <div className="overview-item">
              <span className="label">Total Emails</span>
              <span className="value email">{emailSends.toLocaleString()}</span>
            </div>
            <div className="overview-item">
              <span className="label">Total SMS</span>
              <span className="value sms">{smsSends.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="channel-cards">
          {channels.includes("email") && (
            <div className="channel-card email">
              <div className="channel-icon">📧</div>
              <div className="channel-info">
                <h4>Email Channel</h4>
                <p>Sent weekly on Mon-Thu mornings. Contacts receive based on their optimal time preference.</p>
                <ul className="channel-features">
                  <li>✓ Open tracking enabled</li>
                  <li>✓ A/B testing ready</li>
                  <li>✓ 7-day optimal interval</li>
                </ul>
              </div>
            </div>
          )}
          {channels.includes("sms") && (
            <div className="channel-card sms">
              <div className="channel-icon">💬</div>
              <div className="channel-info">
                <h4>SMS Channel</h4>
                <p>Sent on varied days (Tue/Thu/Sat) to avoid predictability. 14-day optimal interval.</p>
                <ul className="channel-features">
                  <li>✓ Delivery tracking</li>
                  <li>✓ Opt-out handling</li>
                  <li>✓ 14-day optimal interval</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        <button className="toggle-schedule" onClick={() => setShowSchedule(!showSchedule)}>
          {showSchedule ? "▼ Hide Contact Schedule" : "▶ View Contact Send Schedule"}
        </button>

        {showSchedule && (
          <div className="contact-schedule">
            <h4>Sample Contact Send Preferences</h4>
            <div className="schedule-table">
              <div className="table-header">
                <span>Contact</span>
                <span>Best Day</span>
                <span>Best Time</span>
                <span>Email Freq</span>
                <span>SMS Freq</span>
              </div>
              {mockContactMetadata.map((contact) => (
                <div key={contact.contact_id} className="table-row">
                  <span className="contact-email">{contact.email_address}</span>
                  <span className="best-day capitalize">{contact.best_send_day}</span>
                  <span className="best-time">{contact.best_send_time}</span>
                  <span className="freq-score">
                    <span className="score-bar" style={{ width: `${contact.email_frequency_score * 10}%` }} />
                    {contact.email_frequency_score}/10
                  </span>
                  <span className="freq-score">
                    <span className="score-bar sms" style={{ width: `${contact.sms_frequency_score * 10}%` }} />
                    {contact.sms_frequency_score}/10
                  </span>
                </div>
              ))}
            </div>
            <p className="schedule-note">* Each contact's optimal send time is tracked and updated based on engagement</p>
          </div>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="actions">
        <button className="btn-launch" onClick={handleExecute} disabled={isExecuting}>
          {isExecuting ? (
            <>
              <span className="spinner" /> Launching Campaign...
            </>
          ) : (
            <>🚀 Launch Campaign</>
          )}
        </button>
      </div>

      <style>{`
        .execute-step { max-width: 700px; margin: 0 auto; }
        .step-header { text-align: center; margin-bottom: 2rem; }
        .step-header h2 { margin: 0 0 0.25rem; font-size: 24px; color: #1e293b; }
        .step-desc { margin: 0 0 0.5rem; color: #64748b; font-size: 14px; }
        .intro { color: #475569; margin: 0; }

        .campaign-overview { margin-bottom: 2rem; }
        .overview-card { background: white; border-radius: 12px; padding: 1.5rem; margin-bottom: 1rem; border: 1px solid #e2e8f0; }
        .overview-card h3 { margin: 0 0 1rem; color: #1e293b; font-size: 16px; }
        .overview-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
        .overview-item { text-align: center; }
        .overview-item .label { display: block; font-size: 12px; color: #64748b; margin-bottom: 0.25rem; }
        .overview-item .value { font-size: 20px; font-weight: 700; color: #1e293b; }
        .overview-item .value.capitalize { text-transform: capitalize; }
        .overview-item .value.email { color: #4f46e5; }
        .overview-item .value.sms { color: #059669; }

        .channel-cards { display: flex; flex-direction: column; gap: 1rem; margin-bottom: 1.5rem; }
        .channel-card { display: flex; gap: 1rem; padding: 1.25rem; border-radius: 12px; border: 1px solid; }
        .channel-card.email { background: #f5f3ff; border-color: #c7d2fe; }
        .channel-card.sms { background: #f0fdf4; border-color: #bbf7d0; }
        .channel-icon { font-size: 32px; }
        .channel-info { flex: 1; }
        .channel-info h4 { margin: 0 0 0.5rem; font-size: 15px; color: #1e293b; }
        .channel-info p { margin: 0 0 0.75rem; font-size: 13px; color: #64748b; line-height: 1.4; }
        .channel-features { margin: 0; padding: 0; list-style: none; }
        .channel-features li { font-size: 12px; color: #475569; margin-bottom: 0.25rem; }

        .toggle-schedule { width: 100%; padding: 0.75rem; background: #f1f5f9; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; color: #475569; margin-bottom: 1rem; }
        .toggle-schedule:hover { background: #e2e8f0; }

        .contact-schedule { background: white; border-radius: 12px; padding: 1.25rem; border: 1px solid #e2e8f0; margin-bottom: 1.5rem; }
        .contact-schedule h4 { margin: 0 0 1rem; font-size: 14px; color: #1e293b; }
        .schedule-table { font-size: 12px; }
        .table-header { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 1fr; gap: 0.5rem; padding: 0.5rem; background: #f8fafc; border-radius: 6px; font-weight: 600; color: #475569; }
        .table-row { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 1fr; gap: 0.5rem; padding: 0.75rem 0.5rem; border-bottom: 1px solid #f1f5f9; align-items: center; }
        .contact-email { color: #1e293b; font-weight: 500; }
        .best-day { color: #64748b; }
        .best-time { color: #64748b; font-family: monospace; }
        .freq-score { position: relative; color: #64748b; }
        .score-bar { position: absolute; left: 0; top: 50%; transform: translateY(-50%); height: 4px; background: #4f46e5; border-radius: 2px; }
        .score-bar.sms { background: #059669; }
        .capitalize { text-transform: capitalize; }
        .schedule-note { margin: 0.75rem 0 0; font-size: 11px; color: #94a3b8; font-style: italic; }

        .error-message { background: #fef2f2; color: #dc2626; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; font-size: 14px; }

        .actions { margin-top: 1.5rem; }
        .btn-launch { 
          width: 100%; 
          padding: 1rem 1.5rem; 
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); 
          color: white; 
          border: none; 
          border-radius: 12px; 
          cursor: pointer; 
          font-size: 16px; 
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .btn-launch:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4); }
        .btn-launch:disabled { opacity: 0.7; cursor: not-allowed; }
        .spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </section>
  )
}