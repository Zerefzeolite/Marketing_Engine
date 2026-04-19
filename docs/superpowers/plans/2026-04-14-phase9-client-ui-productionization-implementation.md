# Phase 9 Client UI Productionization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver production-grade client-facing UI across `/`, `/intake`, and `/campaign-flow` with consistent design language, improved usability, and zero behavior regressions.

**Architecture:** Implement a foundation-first UI layer (tokens + shared primitives), then apply it route-by-route in the approved order: Home, Intake, Campaign Flow. Keep logic paths unchanged and validate each stage with focused frontend tests plus route smoke checks.

**Tech Stack:** Next.js 15 app router, React/TypeScript, CSS variables, Vitest.

---

## File Structure

### New Files
- `apps/frontend/src/styles/tokens.css` - Core visual tokens (color, typography, spacing, radius, elevation)
- `apps/frontend/src/components/ui/RouteHeader.tsx` - Standardized route heading + intent copy block
- `apps/frontend/src/components/ui/SectionCard.tsx` - Shared card shell for grouped content
- `apps/frontend/src/components/ui/FieldHint.tsx` - Shared hint text component
- `apps/frontend/src/components/ui/FieldError.tsx` - Shared error text component
- `apps/frontend/src/components/ui/AppButton.tsx` - Primary/secondary button variant component
- `apps/frontend/src/__tests__/ui-foundation-phase9.test.tsx` - Tests for token-backed primitives

### Modified Files
- `apps/frontend/src/app/layout.tsx` - Import global token stylesheet
- `apps/frontend/src/app/page.tsx` - Home route productionized card layout
- `apps/frontend/src/app/intake/page.tsx` - Intake route header and intent clarity
- `apps/frontend/src/components/intake/IntakeForm.tsx` - Form guidance/error polish using shared primitives
- `apps/frontend/src/app/campaign-flow/page.tsx` - Campaign flow header/state readability polish
- `apps/frontend/src/__tests__/home-navigation-phase7.test.ts` - Assert polished route shell still exposes nav intent
- `apps/frontend/src/__tests__/intake-form.test.tsx` - Assert guided UX and error messaging remain intact

---

### Task 1: Add Token Foundation and Shared UI Primitives

**Files:**
- Create: `apps/frontend/src/styles/tokens.css`
- Create: `apps/frontend/src/components/ui/RouteHeader.tsx`
- Create: `apps/frontend/src/components/ui/SectionCard.tsx`
- Create: `apps/frontend/src/components/ui/FieldHint.tsx`
- Create: `apps/frontend/src/components/ui/FieldError.tsx`
- Create: `apps/frontend/src/components/ui/AppButton.tsx`
- Create: `apps/frontend/src/__tests__/ui-foundation-phase9.test.tsx`
- Modify: `apps/frontend/src/app/layout.tsx`

- [ ] **Step 1: Write failing primitive tests**

```tsx
import { describe, expect, it } from "vitest"
import { renderToString } from "react-dom/server"
import { RouteHeader } from "../components/ui/RouteHeader"
import { AppButton } from "../components/ui/AppButton"

describe("phase9 ui foundation", () => {
  it("renders route header title and intent", () => {
    const html = renderToString(
      <RouteHeader title="Campaign Intake" intent="Quick Estimate Only" />,
    )
    expect(html).toContain("Campaign Intake")
    expect(html).toContain("Quick Estimate Only")
  })

  it("renders primary button variant class", () => {
    const html = renderToString(<AppButton variant="primary">Continue</AppButton>)
    expect(html).toContain("btn-primary")
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix apps/frontend exec vitest run src/__tests__/ui-foundation-phase9.test.tsx`
Expected: FAIL with module import errors for missing UI primitive files.

- [ ] **Step 3: Implement tokens and primitives minimally**

```css
:root {
  --ui-bg: #f3f6f8;
  --ui-surface: #ffffff;
  --ui-text: #10212f;
  --ui-muted: #5a6b77;
  --ui-border: #d6dde2;
  --ui-accent: #0d7f88;
  --ui-danger: #b42318;
  --ui-radius: 12px;
  --ui-space-1: 8px;
  --ui-space-2: 12px;
  --ui-space-3: 16px;
  --ui-space-4: 24px;
}
```

```tsx
type RouteHeaderProps = { title: string; intent: string }
export function RouteHeader({ title, intent }: RouteHeaderProps) {
  return (
    <header style={{ marginBottom: "var(--ui-space-3)" }}>
      <h1>{title}</h1>
      <p>{intent}</p>
    </header>
  )
}
```

```tsx
type AppButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant: "primary" | "secondary"
}
export function AppButton({ variant, ...props }: AppButtonProps) {
  return <button className={variant === "primary" ? "btn-primary" : "btn-secondary"} {...props} />
}
```

- [ ] **Step 4: Import token file in root layout**

```tsx
import "../styles/tokens.css"
```

- [ ] **Step 5: Re-run foundation tests**

Run: `npm --prefix apps/frontend exec vitest run src/__tests__/ui-foundation-phase9.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src/styles/tokens.css apps/frontend/src/components/ui apps/frontend/src/__tests__/ui-foundation-phase9.test.tsx apps/frontend/src/app/layout.tsx
git commit -m "feat(ui): add phase9 token foundation and shared primitives"
```

---

### Task 2: Productionize Home Route (`/`)

**Files:**
- Modify: `apps/frontend/src/app/page.tsx`
- Modify: `apps/frontend/src/__tests__/home-navigation-phase7.test.ts`

- [ ] **Step 1: Add failing home-shell test**

```tsx
import { describe, expect, it } from "vitest"
import { renderToString } from "react-dom/server"
import HomePage from "../app/page"

describe("phase9 home route", () => {
  it("renders client route cards with descriptions", () => {
    const html = renderToString(<HomePage />)
    expect(html).toContain("Campaign Intake")
    expect(html).toContain("Campaign Flow")
    expect(html).toContain("Quality Gate")
    expect(html).toContain("Choose where you want to work")
  })
})
```

- [ ] **Step 2: Run test to verify red state**

Run: `npm --prefix apps/frontend exec vitest run src/__tests__/home-navigation-phase7.test.ts`
Expected: FAIL if assertions for production shell copy are missing.

- [ ] **Step 3: Apply Home route polish using SectionCard/RouteHeader**

```tsx
<main className="home-shell">
  <RouteHeader title="AI Marketing Engine" intent="Choose where you want to work." />
  {HOME_ROUTE_CARDS.map((card) => (
    <SectionCard key={card.href}>
      <a href={card.href}><h2>{card.title}</h2><p>{card.description}</p></a>
    </SectionCard>
  ))}
</main>
```

- [ ] **Step 4: Re-run home tests**

Run: `npm --prefix apps/frontend exec vitest run src/__tests__/home-navigation-phase7.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/app/page.tsx apps/frontend/src/__tests__/home-navigation-phase7.test.ts
git commit -m "feat(ui): productionize home route card shell"
```

---

### Task 3: Productionize Intake Route and Form UX

**Files:**
- Modify: `apps/frontend/src/app/intake/page.tsx`
- Modify: `apps/frontend/src/components/intake/IntakeForm.tsx`
- Modify: `apps/frontend/src/__tests__/intake-form.test.tsx`

- [ ] **Step 1: Add failing intake UX structure test**

```tsx
import { describe, expect, it } from "vitest"
import { renderToString } from "react-dom/server"
import IntakePage from "../app/intake/page"

describe("phase9 intake route", () => {
  it("keeps quick-estimate intent and full-flow CTA visible", () => {
    const html = renderToString(<IntakePage />)
    expect(html).toContain("Quick Estimate Only")
    expect(html).toContain("Continue to Full Campaign Flow")
  })
})
```

- [ ] **Step 2: Run failing test**

Run: `npm --prefix apps/frontend exec vitest run src/__tests__/intake-form.test.tsx`
Expected: FAIL if new route-shell assertions not yet satisfied.

- [ ] **Step 3: Apply form-level production polish**

```tsx
<SectionCard>
  <label htmlFor="demographic_preferences">Demographic Preferences</label>
  <input ... />
  <FieldHint>Example: Women 25-40, urban, wellness-focused, mid-high income.</FieldHint>
</SectionCard>
```

```tsx
{errorMessage && <FieldError>{errorMessage}</FieldError>}
```

- [ ] **Step 4: Re-run intake tests**

Run: `npm --prefix apps/frontend exec vitest run src/__tests__/intake-form.test.tsx src/__tests__/experience-routing-phase7.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/app/intake/page.tsx apps/frontend/src/components/intake/IntakeForm.tsx apps/frontend/src/__tests__/intake-form.test.tsx
git commit -m "feat(ui): productionize intake route and guided form UX"
```

---

### Task 4: Productionize Campaign Flow Readability

**Files:**
- Modify: `apps/frontend/src/app/campaign-flow/page.tsx`
- Test: `apps/frontend/src/__tests__/campaign-flow-phase4.test.tsx`

- [ ] **Step 1: Add failing readability assertion test**

```tsx
import { describe, expect, it } from "vitest"
import { renderToString } from "react-dom/server"
import CampaignFlowPage from "../app/campaign-flow/page"

describe("phase9 campaign flow shell", () => {
  it("shows full-flow intent and intake fallback link", () => {
    const html = renderToString(<CampaignFlowPage />)
    expect(html).toContain("Full Campaign Flow")
    expect(html).toContain("Go to Intake")
  })
})
```

- [ ] **Step 2: Run failing test**

Run: `npm --prefix apps/frontend exec vitest run src/__tests__/campaign-flow-phase4.test.tsx`
Expected: FAIL if route-intent shell assertions not present.

- [ ] **Step 3: Apply stage readability styling wrappers**

```tsx
<RouteHeader title="Campaign Setup" intent={CAMPAIGN_FLOW_EXPLAINER} />
<SectionCard>...current step content...</SectionCard>
```

- [ ] **Step 4: Re-run campaign flow tests**

Run: `npm --prefix apps/frontend exec vitest run src/__tests__/campaign-flow-phase4.test.tsx src/__tests__/experience-routing-phase7.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/app/campaign-flow/page.tsx apps/frontend/src/__tests__/campaign-flow-phase4.test.tsx
git commit -m "feat(ui): productionize campaign flow readability shell"
```

---

### Task 5: Final Responsive and Route Smoke Verification

**Files:**
- Modify if needed: `docs/phase-8-readiness-checkpoints.md`

- [ ] **Step 1: Run full frontend regression pack**

Run:
`npm --prefix apps/frontend exec vitest run src/__tests__/ui-foundation-phase9.test.tsx src/__tests__/intake-form.test.tsx src/__tests__/experience-routing-phase7.test.ts src/__tests__/home-navigation-phase7.test.ts src/__tests__/campaign-flow-phase4.test.tsx src/__tests__/quality-gate-phase6.test.tsx`

Expected: PASS all tests.

- [ ] **Step 2: Route smoke checks in running app**

Manual/command checks:
- `/` 200 + route cards visible
- `/intake` 200 + guidance visible + preview still works
- `/campaign-flow` 200 + step transitions available
- `/quality-gate` 200 + cards readable

- [ ] **Step 3: Commit verification notes**

```bash
git add docs/phase-8-readiness-checkpoints.md
git commit -m "docs(ui): record phase9 client route verification"
```

---

## Final Verification Checklist

- [ ] `npm --prefix apps/frontend exec vitest run src/__tests__/ui-foundation-phase9.test.tsx`
- [ ] `npm --prefix apps/frontend exec vitest run src/__tests__/intake-form.test.tsx src/__tests__/experience-routing-phase7.test.ts`
- [ ] `npm --prefix apps/frontend exec vitest run src/__tests__/home-navigation-phase7.test.ts src/__tests__/campaign-flow-phase4.test.tsx`
- [ ] `npm --prefix apps/frontend exec vitest run src/__tests__/quality-gate-phase6.test.tsx`
- [ ] Manual smoke pass on `/`, `/intake`, `/campaign-flow`, `/quality-gate` (desktop + mobile)
