import { afterEach, describe, expect, it, vi } from "vitest"

import type { AssessmentDomain } from "../lib/contracts/assessment"
import { toDomainLabel } from "../lib/contracts/assessment"
import type { AssessmentFinding } from "../lib/contracts/assessment"
import { buildDomainRows } from "../lib/quality-gate"

const DOMAIN_LABEL_EXPECTATIONS = {
  ui_ux: "UI and UX",
  compliance_security: "Compliance and Security",
  backend_functionality: "Backend Functionality",
  client_contact_simulation: "Client/Contact Simulation",
  efficiency_workflow: "Efficiency and Workflow",
  website_portal: "Website and Portal",
} satisfies Record<AssessmentDomain, string>

const originalEnv = {
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.resetModules()
  process.env.NEXT_PUBLIC_API_BASE_URL = originalEnv.NEXT_PUBLIC_API_BASE_URL
  process.env.NEXT_PUBLIC_API_URL = originalEnv.NEXT_PUBLIC_API_URL
})

describe("phase 6 assessment contracts", () => {
  it("maps all domain keys to readable labels", () => {
    for (const [domain, label] of Object.entries(DOMAIN_LABEL_EXPECTATIONS)) {
      expect(toDomainLabel(domain as AssessmentDomain)).toBe(label)
    }
  })
})

describe("phase 6 assessment api", () => {
  it("uses NEXT_PUBLIC_API_URL when NEXT_PUBLIC_API_BASE_URL is not set", async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = undefined
    process.env.NEXT_PUBLIC_API_URL = "http://fallback-api:9000"

    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [] })
    vi.stubGlobal("fetch", fetchMock)

    const { getFindings } = await import("../lib/api/assessment")
    await getFindings()

    expect(fetchMock).toHaveBeenCalledWith(
      "http://fallback-api:9000/assessment/findings",
      expect.objectContaining({ cache: "no-store" }),
    )
  })

  it("throws when getFindings returns invalid payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => { return { data: [] } } })
    vi.stubGlobal("fetch", fetchMock)

    const { getFindings } = await import("../lib/api/assessment")

    await expect(getFindings()).rejects.toThrow("Invalid assessment findings response")
  })

  it("throws when createFinding returns invalid payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => { return { finding_id: "f_1" } } })
    vi.stubGlobal("fetch", fetchMock)

    const { createFinding } = await import("../lib/api/assessment")

    await expect(
      createFinding({
        domain: "ui_ux",
        title: "Broken contrast",
        severity: "P2",
        owner: "ops",
      }),
    ).rejects.toThrow("Invalid assessment finding response")
  })

  it("retries getFindings once when first request aborts", async () => {
    const abortError = new Error("aborted")
    abortError.name = "AbortError"

    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(abortError)
      .mockResolvedValueOnce({ ok: true, json: async () => [] })

    vi.stubGlobal("fetch", fetchMock)

    const { getFindings } = await import("../lib/api/assessment")
    await expect(getFindings()).resolves.toEqual([])
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})

describe("phase 6 quality gate portal", () => {
  it("buildDomainRows returns zeroed rows for all domains when findings are empty", () => {
    const rows = buildDomainRows([])

    expect(rows).toHaveLength(6)
    for (const row of rows) {
      expect(row.total).toBe(0)
      expect(row.unresolvedCritical).toBe(0)
      expect(row.closed).toBe(0)
    }
  })

  it("buildDomainRows calculates unresolved critical and closed counts from mixed statuses", () => {
    const finding = (
      domain: AssessmentDomain,
      severity: AssessmentFinding["severity"],
      status: AssessmentFinding["status"],
    ): AssessmentFinding => ({
      finding_id: `${domain}-${severity}-${status}`,
      domain,
      title: "Issue",
      severity,
      owner: "ops",
      status,
      notes: "",
      retests: [],
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    })

    const rows = buildDomainRows([
      finding("ui_ux", "P0", "OPEN"),
      finding("ui_ux", "P1", "IN_PROGRESS"),
      finding("ui_ux", "P1", "CLOSED"),
      finding("ui_ux", "P2", "OPEN"),
      finding("ui_ux", "P0", "CLOSED"),
      finding("compliance_security", "P0", "CLOSED"),
      finding("compliance_security", "P3", "CLOSED"),
      finding("compliance_security", "P1", "OPEN"),
    ])

    expect(rows.find((row) => row.domain === "ui_ux")).toEqual({
      domain: "ui_ux",
      total: 5,
      unresolvedCritical: 2,
      closed: 2,
    })

    expect(rows.find((row) => row.domain === "compliance_security")).toEqual({
      domain: "compliance_security",
      total: 3,
      unresolvedCritical: 1,
      closed: 2,
    })

    expect(rows.find((row) => row.domain === "website_portal")).toEqual({
      domain: "website_portal",
      total: 0,
      unresolvedCritical: 0,
      closed: 0,
    })
  })
})
