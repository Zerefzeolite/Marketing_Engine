type DomainScorecardProps = {
  domainLabel: string
  total: number
  unresolvedCritical: number
  closed: number
}

function StatusBadge({ critical, closed, total }: { critical: number; closed: number; total: number }) {
  const open = total - closed
  const status = critical > 0 ? "fail" : open > 0 ? "warning" : "pass"
  const colors = {
    pass: { bg: "#dcfce7", text: "#166534" },
    warning: { bg: "#fef3c7", text: "#92400e" },
    fail: { bg: "#fee2e2", text: "#991b1b" },
  }
  return (
    <span
      style={{
        background: colors[status].bg,
        color: colors[status].text,
        padding: "2px 8px",
        borderRadius: 4,
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {status === "pass" ? "PASS" : status === "warning" ? "WARNING" : "FAIL"}
    </span>
  )
}

export function DomainScorecard({
  domainLabel,
  total,
  unresolvedCritical,
  closed,
}: DomainScorecardProps) {
  return (
    <section
      style={{
        border: "1px solid #d0d7de",
        borderRadius: 8,
        padding: 16,
        marginBottom: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2 style={{ marginTop: 0 }}>{domainLabel}</h2>
        <StatusBadge critical={unresolvedCritical} closed={closed} total={total} />
      </div>
      <p>Total Findings: {total}</p>
      <p>Critical Open: {unresolvedCritical}</p>
      <p>Closed: {closed}</p>
    </section>
  )
}
