"use client"

import { useState } from "react"
import { DomainScorecard } from "../../components/quality/DomainScorecard"
import { getFindings } from "../../lib/api/assessment"
import { buildDomainRows } from "../../lib/quality-gate"
import {
  toDomainLabel,
  type AssessmentFinding,
} from "../../lib/contracts/assessment"

export default function QualityGatePage() {
  const [findings] = useState<AssessmentFinding[]>([])
  const [domainFilter, setDomainFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  let grouped: ReturnType<typeof buildDomainRows> = []

  try {
    grouped = buildDomainRows(findings)
  } catch {
    grouped = []
  }

  const filtered = grouped.filter((row) => {
    if (domainFilter !== "all" && row.domain !== domainFilter) return false
    const open = row.total - row.closed
    if (statusFilter === "fail" && row.unresolvedCritical === 0) return false
    if (statusFilter === "warning" && row.unresolvedCritical > 0) return false
    if (statusFilter === "pass" && row.unresolvedCritical === 0 && open === 0)
      return false
    return true
  })

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: 24 }}>
      <h1>Quality Gate</h1>
      <div
        style={{ marginBottom: 16, display: "flex", gap: 8 }}
      >
        <select
          value={domainFilter}
          onChange={(e) => setDomainFilter(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #d0d7de" }}
        >
          <option value="all">All Domains</option>
          {grouped.map((row) => (
            <option key={row.domain} value={row.domain}>
              {toDomainLabel(row.domain)}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #d0d7de" }}
        >
          <option value="all">All Status</option>
          <option value="fail">Fail</option>
          <option value="warning">Warning</option>
          <option value="pass">Pass</option>
        </select>
      </div>
      {filtered.length === 0 ? (
        <p style={{ color: "#6b7280" }}>No findings match the current filters.</p>
      ) : (
        filtered.map((row) => (
          <DomainScorecard
            key={row.domain}
            domainLabel={toDomainLabel(row.domain)}
            total={row.total}
            unresolvedCritical={row.unresolvedCritical}
            closed={row.closed}
          />
        ))
      )}
    </main>
  )
}
