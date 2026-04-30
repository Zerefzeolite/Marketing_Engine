const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export type Contact = {
  contact_id: string
  email: string
  phone: string | null
  first_name: string | null
  last_name: string | null
  tags: string[]
  source: string
  opt_out: boolean
  dob: string | null
  age_group: string | null
  gender: string | null
  parish: string | null
  preferred_channel: string | null
  engagement_score: number | null
  created_at: string
  updated_at: string | null
}

export type GetContactsParams = {
  page?: number
  limit?: number
  opt_out?: boolean
  tags?: string
  source?: string
}

export type GetContactsResponse = Contact[]

export type CreateContactRequest = {
  email?: string
  phone?: string
  first_name?: string
  last_name?: string
  dob?: string
  gender?: string
  parish?: string
  tags?: string[]
  source?: string
  opt_out?: boolean
}

export type UpdateContactRequest = {
  email?: string
  phone?: string
  first_name?: string
  last_name?: string
  dob?: string
  gender?: string
  parish?: string
  tags?: string[]
  source?: string
  opt_out?: boolean
}

async function parseJsonOrThrow(response: Response): Promise<unknown> {
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`)
  }
  return response.json()
}

export async function getContacts(params: GetContactsParams = {}): Promise<GetContactsResponse> {
  const query = new URLSearchParams()
  
  if (params.page && params.page > 1) {
    const offset = (params.page - 1) * (params.limit || 20)
    query.set("offset", offset.toString())
  }
  if (params.limit) query.set("limit", params.limit.toString())
  if (params.opt_out !== undefined) query.set("opt_out", params.opt_out.toString())
  if (params.tags) query.set("tags", params.tags)
  if (params.source) query.set("source", params.source)

  const response = await fetch(`${API_BASE}/contacts?${query.toString()}`)
  return parseJsonOrThrow(response) as Promise<GetContactsResponse>
}

export async function getContact(contactId: string): Promise<Contact> {
  const response = await fetch(`${API_BASE}/contacts/${contactId}`)
  return parseJsonOrThrow(response) as Promise<Contact>
}

export async function createContact(data: CreateContactRequest): Promise<Contact> {
  const response = await fetch(`${API_BASE}/contacts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  return parseJsonOrThrow(response) as Promise<Contact>
}

export async function updateContact(contactId: string, data: UpdateContactRequest): Promise<Contact> {
  const response = await fetch(`${API_BASE}/contacts/${contactId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  return parseJsonOrThrow(response) as Promise<Contact>
}

export type AudiencePreviewResponse = {
  total_contacts: number
  channel_breakdown: Record<string, number>
  parish_breakdown: Record<string, number>
  age_group_breakdown: Record<string, number>
  gender_breakdown: Record<string, number>
  avg_engagement_score: number | null
  filters_applied: {
    parish: string | null
    age_group: string | null
    gender: string | null
    preferred_channel: string | null
    engagement_min: number | null
    include_opt_out: boolean
  }
}

export async function getAudiencePreview(params: {
  parish?: string
  age_group?: string
  gender?: string
  preferred_channel?: string
  engagement_min?: number
  include_opt_out?: boolean
} = {}): Promise<AudiencePreviewResponse> {
  const query = new URLSearchParams()
  if (params.parish) query.set("parish", params.parish)
  if (params.age_group) query.set("age_group", params.age_group)
  if (params.gender) query.set("gender", params.gender)
  if (params.preferred_channel) query.set("preferred_channel", params.preferred_channel)
  if (params.engagement_min !== undefined) query.set("engagement_min", params.engagement_min.toString())
  if (params.include_opt_out) query.set("include_opt_out", "true")

  const response = await fetch(`${API_BASE}/contacts/audience-preview?${query.toString()}`)
  return parseJsonOrThrow(response) as Promise<AudiencePreviewResponse>
}

export type ImportContactRow = {
  email?: string
  phone?: string
  first_name?: string
  last_name?: string
  dob?: string
  gender?: string
  parish?: string
  tags?: string
  source?: string
}

export type ImportContactsResponse = {
  imported: number
  updated: number
  duplicates_skipped: number
  invalid: number
  total_processed: number
  errors: string[]
}

export async function importContacts(rows: ImportContactRow[]): Promise<ImportContactsResponse> {
  const response = await fetch(`${API_BASE}/contacts/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contacts: rows }),
  })
  return parseJsonOrThrow(response) as Promise<ImportContactsResponse>
}
