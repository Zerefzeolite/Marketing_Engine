const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export async function fetchConsentStatus(requestId: string) {
  const response = await fetch(`${API_BASE}/consent/status/${requestId}`)
  if (!response.ok) {
    throw new Error("Failed to fetch consent status")
  }
  return response.json()
}

export async function recordConsent(consentData: {
  request_id: string
  consent_to_marketing: boolean
  terms_accepted: boolean
  data_processing_consent: boolean
}) {
  const response = await fetch(`${API_BASE}/consent/record`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ schema_version: "1.0", ...consentData }),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || "Failed to record consent")
  }
  return response.json()
}

export async function submitPayment(paymentData: {
  request_id: string
  amount: number
  method: "LOCAL_BANK_TRANSFER" | "CASH" | "STRIPE" | "PAYPAL"
  auto_approve?: boolean
}) {
  const response = await fetch(`${API_BASE}/payments/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ schema_version: "1.0", ...paymentData }),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || "Failed to submit payment")
  }
  return response.json()
}

export async function getPaymentStatus(paymentId: string) {
  const response = await fetch(`${API_BASE}/payments/status/${paymentId}`)
  if (!response.ok) {
    throw new Error("Failed to fetch payment status")
  }
  return response.json()
}

export async function getPaymentByRequest(requestId: string) {
  const response = await fetch(`${API_BASE}/payments/by-request/${requestId}`)
  if (!response.ok) {
    throw new Error("Failed to fetch payment")
  }
  return response.json()
}

export async function verifyPayment(paymentId: string, accepted: boolean) {
  const action = accepted ? "approve" : "reject"
  const response = await fetch(`${API_BASE}/payments/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      schema_version: "1.0",
      payment_id: paymentId,
      action,
      admin_notes: "Approved via debug button",
    }),
  })
  if (!response.ok) {
    throw new Error("Failed to verify payment")
  }
  return response.json()
}

export async function uploadReceipt(paymentId: string, file: File) {
  const formData = new FormData()
  formData.append("file", file)
  
  const response = await fetch(`${API_BASE}/payments/upload-receipt/${paymentId}`, {
    method: "POST",
    body: formData,
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || "Failed to upload receipt")
  }
  return response.json()
}

export async function executeCampaign(executeData: {
  request_id: string
  campaign_data: Record<string, unknown>
}) {
  const response = await fetch(`${API_BASE}/campaigns/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ schema_version: "1.0", ...executeData }),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || "Failed to execute campaign")
  }
  return response.json()
}

export async function getPendingPayments() {
  const response = await fetch(`${API_BASE}/payments/pending`)
  if (!response.ok) {
    throw new Error("Failed to fetch pending payments")
  }
  return response.json()
}

export async function approvePayment(paymentId: string) {
  const response = await fetch(`${API_BASE}/payments/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      payment_id: paymentId,
      action: "approve",
    }),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || "Failed to approve payment")
  }
  return response.json()
}