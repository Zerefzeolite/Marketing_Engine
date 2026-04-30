import type { AssessmentDomain, AssessmentFinding } from "./contracts/assessment"

export const DOMAIN_ORDER: AssessmentDomain[] = [
  "ui_ux",
  "compliance_security",
  "backend_functionality",
  "client_contact_simulation",
  "efficiency_workflow",
  "website_portal",
]

export interface DomainRow {
  domain: AssessmentDomain
  total: number
  unresolvedCritical: number
  closed: number
}

export function buildDomainRows(findings: AssessmentFinding[]): DomainRow[] {
  return DOMAIN_ORDER.map((domain) => {
    const items = findings.filter((item) => item.domain === domain)
    const unresolvedCritical = items.filter(
      (item) => (item.severity === "P0" || item.severity === "P1") && item.status !== "CLOSED",
    ).length
    const closed = items.filter((item) => item.status === "CLOSED").length

    return {
      domain,
      total: items.length,
      unresolvedCritical,
      closed,
    }
  })
}
