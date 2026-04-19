# Phase 17: Campaign Execution Page - Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create campaign execution page with pre-execution summary and results display.

**Architecture:** Next.js page with client-side execution

**Tech Stack:** React/Next.js, API calls

---

### Task 1: Create Campaign Execute Page

**Files:**
- Create: `apps/frontend/src/app/campaign-execute/page.tsx`

- [ ] **Step 1: Create page component**

```tsx
"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"

export default function CampaignExecutePage() {
  const searchParams = useSearchParams()
  const requestId = searchParams.get("requestId")
  const [status, setStatus] = useState<"loading" | "ready" | "executing" | "success" | "error">("loading")
  const [result, setResult] = useState<any>(null)

  useEffect(() => {
    if (requestId) {
      setStatus("ready")
    }
  }, [requestId])

  const handleExecute = async () => {
    setStatus("executing")
    try {
      const res = await fetch(`/api/campaigns/${requestId}/execute`, { method: "POST" })
      const data = await res.json()
      setResult(data)
      setStatus("success")
    } catch (e) {
      setStatus("error")
    }
  }

  if (status === "loading") return <p>Loading...</p>

  return (
    <main style={{ maxWidth: 600, margin: "0 auto", padding: 24 }}>
      <h1>Campaign Execution</h1>
      {status === "ready" && (
        <>
          <p>Ready to execute campaign: {requestId}</p>
          <button onClick={handleExecute}>Execute Campaign</button>
        </>
      )}
      {status === "executing" && <p>Executing...</p>}
      {status === "success" && <p>Campaign executed! Delivered: {result?.contacts_delivered}</p>}
      {status === "error" && <p>Execution failed.</p>}
    </main>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/frontend/src/app/campaign-execute/page.tsx
git commit -m "feat(phase17): add campaign execution page"
```

---

### Task 2: Improve Execution Page

**Files:**
- Modify: `apps/frontend/src/app/campaign-execute/page.tsx`

- [ ] **Step 1: Add better styling and error handling**

(Add error states, loading indicators, better styling)

- [ ] **Step 2: Commit**

```bash
git add apps/frontend/src/app/campaign-execute/page.tsx
git commit -m "feat(phase17): improve execution page styling"
```

---

## Summary

| Task | Description |
|------|-------------|
| 1 | Create execution page |
| 2 | Improve styling |