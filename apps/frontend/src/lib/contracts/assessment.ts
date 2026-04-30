export type AssessmentDomain =
  | "ui_ux"
  | "compliance_security"
  | "backend_functionality"
  | "client_contact_simulation"
  | "efficiency_workflow"
  | "website_portal"

export type FindingSeverity = "P0" | "P1" | "P2" | "P3"
export type FindingStatus = "OPEN" | "IN_PROGRESS" | "CLOSED"
export type RetestResult = "PASS" | "FAIL"

export interface AssessmentRetest {
  result: RetestResult
  evidence: string[]
  recorded_at: string
}

export interface AssessmentFinding {
  finding_id: string
  domain: AssessmentDomain
  title: string
  severity: FindingSeverity
  owner: string
  status: FindingStatus
  notes: string
  retests: AssessmentRetest[]
  created_at: string
  updated_at: string
}

const DOMAIN_LABELS: Record<AssessmentDomain, string> = {
  ui_ux: "UI and UX",
  compliance_security: "Compliance and Security",
  backend_functionality: "Backend Functionality",
  client_contact_simulation: "Client/Contact Simulation",
  efficiency_workflow: "Efficiency and Workflow",
  website_portal: "Website and Portal",
}

export function toDomainLabel(domain: AssessmentDomain): string {
  return DOMAIN_LABELS[domain]
}
