import type {
  AssessmentDomain,
  AssessmentFinding,
  FindingStatus,
  FindingSeverity,
  RetestResult,
} from "../contracts/assessment"

const ASSESSMENT_DOMAINS = new Set<AssessmentDomain>([
  "ui_ux",
  "compliance_security",
  "backend_functionality",
  "client_contact_simulation",
  "efficiency_workflow",
  "website_portal",
])

const FINDING_SEVERITIES = new Set<FindingSeverity>(["P0", "P1", "P2", "P3"])
const FINDING_STATUSES = new Set<FindingStatus>(["OPEN", "IN_PROGRESS", "CLOSED"])
const RETEST_RESULTS = new Set<RetestResult>(["PASS", "FAIL"])

function normalizeEnvValue(value: string | undefined): string | undefined {
  if (!value) return undefined
  if (value === "undefined") return undefined
  return value
}

const BASE_URL =
  normalizeEnvValue(process.env.NEXT_PUBLIC_API_BASE_URL) ||
  normalizeEnvValue(process.env.NEXT_PUBLIC_API_URL) ||
  "http://localhost:8001"

const FINDINGS_TIMEOUT_MS = 4000
const FINDINGS_RETRY_COUNT = 1

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isAssessmentFinding(value: unknown): value is AssessmentFinding {
  if (!isRecord(value)) return false

  if (typeof value.finding_id !== "string") return false
  if (typeof value.title !== "string") return false
  if (typeof value.owner !== "string") return false
  if (typeof value.notes !== "string") return false
  if (typeof value.created_at !== "string") return false
  if (typeof value.updated_at !== "string") return false
  if (!ASSESSMENT_DOMAINS.has(value.domain as AssessmentDomain)) return false
  if (!FINDING_SEVERITIES.has(value.severity as FindingSeverity)) return false
  if (!FINDING_STATUSES.has(value.status as FindingStatus)) return false
  if (!Array.isArray(value.retests)) return false

  return value.retests.every((retest) => {
    if (!isRecord(retest)) return false
    if (!RETEST_RESULTS.has(retest.result as RetestResult)) return false
    if (typeof retest.recorded_at !== "string") return false
    if (!Array.isArray(retest.evidence)) return false
    return retest.evidence.every((entry) => typeof entry === "string")
  })
}

export async function getFindings(): Promise<AssessmentFinding[]> {
  let response: Response | null = null
  let lastError: unknown = null

  for (let attempt = 0; attempt <= FINDINGS_RETRY_COUNT; attempt += 1) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), FINDINGS_TIMEOUT_MS)

    try {
      response = await fetch(`${BASE_URL}/assessment/findings`, {
        cache: "no-store",
        signal: controller.signal,
      })
      break
    } catch (error) {
      lastError = error
      if (attempt === FINDINGS_RETRY_COUNT) {
        throw new Error("Failed to load assessment findings")
      }
    } finally {
      clearTimeout(timeoutId)
    }
  }

  if (!response) {
    throw new Error(lastError instanceof Error ? lastError.message : "Failed to load assessment findings")
  }

  if (!response.ok) {
    throw new Error("Failed to load assessment findings")
  }

  const payload: unknown = await response.json()

  if (!Array.isArray(payload) || !payload.every(isAssessmentFinding)) {
    throw new Error("Invalid assessment findings response")
  }

  return payload
}

export async function createFinding(input: {
  domain: AssessmentDomain
  title: string
  severity: FindingSeverity
  owner: string
}): Promise<AssessmentFinding> {
  const response = await fetch(`${BASE_URL}/assessment/findings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    throw new Error("Failed to create finding")
  }

  const payload: unknown = await response.json()

  if (!isAssessmentFinding(payload)) {
    throw new Error("Invalid assessment finding response")
  }

  return payload
}
