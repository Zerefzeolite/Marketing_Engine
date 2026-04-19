# Phase 15: Quality Gate Improvements - Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve Quality Gate page with better UI, filtering, and actionable insights.

**Architecture:** Client-side filtering and sorting in React components

**Tech Stack:** React/Next.js, Tailwind CSS

---

### Task 1: Update Page Title

**Files:**
- Modify: `apps/frontend/src/app/quality-gate/page.tsx`

- [ ] **Step 1: Fix title**

Change `<h1>Phase 6 Quality Gate</h1>` to `<h1>Quality Gate</h1>`

- [ ] **Step 2: Commit**

```bash
git add apps/frontend/src/app/quality-gate/page.tsx
git commit -m "fix(phase15): update Quality Gate page title"
```

---

### Task 2: Add Status Badges

**Files:**
- Modify: `apps/frontend/src/components/quality/DomainScorecard.tsx`

- [ ] **Step 1: Add status badge component**

```tsx
function StatusBadge({ critical, closed, total }: { critical: number; closed: number; total: number }) {
  const open = total - closed
  const status = critical > 0 ? "fail" : open > 0 ? "warning" : "pass"
  const colors = {
    pass: { bg: "#dcfce7", text: "#166534" },
    warning: { bg: "#fef3c7", text: "#92400e" },
    fail: { bg: "#fee2e2", text: "#991b1b" },
  }
  return (
    <span style={{
      background: colors[status].bg,
      color: colors[status].text,
      padding: "2px 8px",
      borderRadius: 4,
      fontSize: 12,
      fontWeight: 600,
    }}>
      {status === "pass" ? "PASS" : status === "warning" ? "WARNING" : "FAIL"}
    </span>
  )
}
```

- [ ] **Step 2: Update DomainScorecard to use badge**

```tsx
export function DomainScorecard({
  domainLabel,
  total,
  unresolvedCritical,
  closed,
}: DomainScorecardProps) {
  return (
    <section style={{ ... }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ marginTop: 0 }}>{domainLabel}</h2>
        <StatusBadge critical={unresolvedCritical} closed={closed} total={total} />
      </div>
      <p>Total Findings: {total}</p>
      <p>Critical Open: {unresolvedCritical}</p>
      <p>Closed: {closed}</p>
    </section>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/components/quality/DomainScorecard.tsx
git commit -m "feat(phase15): add status badges to Quality Gate"
```

---

### Task 3: Add Filtering

**Files:**
- Modify: `apps/frontend/src/app/quality-gate/page.tsx`

- [ ] **Step 1: Add filter state**

```tsx
"use client"

import { useState } from "react"
// ... existing imports

export default function QualityGatePage() {
  const [domainFilter, setDomainFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  
  // ... existing data fetching
  
  // Filter logic
  const filtered = grouped.filter(row => {
    if (domainFilter !== "all" && row.domain !== domainFilter) return false
    if (statusFilter === "fail" && row.unresolvedCritical === 0) return false
    if (statusFilter === "warning" && row.unresolvedCritical > 0) return false
    if (statusFilter === "pass" && row.unresolvedCritical === 0 && row.total - row.closed === 0) return false
    return true
  })

  return (
    <>
      {/* Add filter UI */}
      <div style={{ marginBottom: 16, display: "flex", gap: 8 }}>
        <select value={domainFilter} onChange={e => setDomainFilter(e.target.value)}>
          <option value="all">All Domains</option>
          {grouped.map(row => (
            <option key={row.domain} value={row.domain}>{toDomainLabel(row.domain)}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="fail">Fail</option>
          <option value="warning">Warning</option>
          <option value="pass">Pass</option>
        </select>
      </div>
      {filtered.map(row => (/* render */))}
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/frontend/src/app/quality-gate/page.tsx
git commit -m "feat(phase15): add filtering to Quality Gate"
```

---

## Summary

| Task | Description |
|------|-------------|
| 1 | Update page title |
| 2 | Add status badges |
| 3 | Add filtering |