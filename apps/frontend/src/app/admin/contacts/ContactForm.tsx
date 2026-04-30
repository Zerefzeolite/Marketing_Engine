"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { Contact, CreateContactRequest, UpdateContactRequest } from "../../../lib/api/contacts"

type ContactFormProps = {
  initialData?: Contact
  onSubmit: (data: CreateContactRequest | UpdateContactRequest) => void
  loading?: boolean
  submitLabel?: string
  hideSource?: boolean  // Hide source for manual entry (auto-set to "manual")
  hideOptOut?: boolean  // Hide opt-out for new contacts
}

const GENDER_OPTIONS = ["male", "female", "non-binary", "prefer_not_to_say", ""]
const PARISH_OPTIONS = [
  "Kingston",
  "St. Andrew",
  "Portland",
  "St. Thomas",
  "Portland",
  "St. Catherine",
  "Clarendon",
  "Manchester",
  "St. Elizabeth",
  "Westmoreland",
  "Hanover",
  "St. James",
  "Trelawny",
  "St. Ann",
  "St. Mary",
  "St. Ann",
  "",
]

export default function ContactForm({
  initialData,
  onSubmit,
  loading = false,
  submitLabel = "Save",
  hideSource = false,
  hideOptOut = false,
}: ContactFormProps) {
  const router = useRouter()

  const [formData, setFormData] = useState<CreateContactRequest | UpdateContactRequest>({
    email: initialData?.email || "",
    phone: initialData?.phone || "",
    first_name: initialData?.first_name || "",
    last_name: initialData?.last_name || "",
    dob: initialData?.dob || "",
    gender: initialData?.gender || "",
    parish: initialData?.parish || "",
    tags: initialData?.tags || [],
    source: initialData?.source || "manual",
    opt_out: initialData?.opt_out || false,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [tagInput, setTagInput] = useState("")

  function validate(): boolean {
    const newErrors: Record<string, string> = {}

    if (!formData.email && !formData.phone) {
      newErrors.email = "Email or phone is required"
      newErrors.phone = "Email or phone is required"
    }

    if (formData.dob && !/^\d{4}-\d{2}-\d{2}$/.test(formData.dob)) {
      newErrors.dob = "DOB must be YYYY-MM-DD format"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    // Remove empty strings and prepare data
    const data: CreateContactRequest | UpdateContactRequest = { ...formData }
    if (!data.email) delete data.email
    if (!data.phone) delete data.phone
    if (!data.first_name) delete data.first_name
    if (!data.last_name) delete data.last_name
    if (!data.dob) delete data.dob
    if (!data.gender) delete data.gender
    if (!data.parish) delete data.parish
    if (!data.source) delete data.source

    onSubmit(data)
  }

  function addTag() {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...(prev.tags || []), tagInput.trim()],
      }))
      setTagInput("")
    }
  }

  function removeTag(tag: string) {
    setFormData((prev) => ({
      ...prev,
      tags: (prev.tags || []).filter((t) => t !== tag),
    }))
  }

  return (
    <form className="contact-form" onSubmit={handleSubmit}>
      <div className="form-header">
        <button type="button" onClick={() => router.push("/admin/contacts")} className="back-btn">
          ← Back
        </button>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={formData.email || ""}
            onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
            className={errors.email ? "error" : ""}
          />
          {errors.email && <span className="field-error">{errors.email}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="phone">Phone</label>
          <input
            id="phone"
            type="tel"
            value={formData.phone || ""}
            onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
            className={errors.phone ? "error" : ""}
          />
          {errors.phone && <span className="field-error">{errors.phone}</span>}
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="first_name">First Name</label>
          <input
            id="first_name"
            type="text"
            value={formData.first_name || ""}
            onChange={(e) => setFormData((prev) => ({ ...prev, first_name: e.target.value }))}
          />
        </div>

        <div className="form-group">
          <label htmlFor="last_name">Last Name</label>
          <input
            id="last_name"
            type="text"
            value={formData.last_name || ""}
            onChange={(e) => setFormData((prev) => ({ ...prev, last_name: e.target.value }))}
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="dob">Date of Birth (YYYY-MM-DD)</label>
          <input
            id="dob"
            type="text"
            placeholder="YYYY-MM-DD"
            value={formData.dob || ""}
            onChange={(e) => setFormData((prev) => ({ ...prev, dob: e.target.value }))}
            className={errors.dob ? "error" : ""}
          />
          {errors.dob && <span className="field-error">{errors.dob}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="gender">Gender</label>
          <select
            id="gender"
            value={formData.gender || ""}
            onChange={(e) => setFormData((prev) => ({ ...prev, gender: e.target.value || undefined }))}
          >
            {GENDER_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt ? opt.replace("_", " ") : "Select..."}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="parish">Parish</label>
          <select
            id="parish"
            value={formData.parish || ""}
            onChange={(e) => setFormData((prev) => ({ ...prev, parish: e.target.value || undefined }))}
          >
            {PARISH_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt || "Select..."}
              </option>
            ))}
          </select>
        </div>

        {!hideSource && (
          <div className="form-group">
            <label htmlFor="source">Source</label>
            <select
              id="source"
              value={formData.source || "manual"}
              onChange={(e) => setFormData((prev) => ({ ...prev, source: e.target.value as "manual" | "import" | "api" }))}
            >
              <option value="manual">Manual</option>
              <option value="import">Import</option>
              <option value="api">API</option>
            </select>
          </div>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="tags">Tags</label>
        <div className="tag-input-row">
          <input
            id="tags"
            type="text"
            placeholder="Add tag..."
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
          />
          <button type="button" onClick={addTag} className="add-tag-btn">
            Add
          </button>
        </div>
        <div className="tag-list">
          {(formData.tags || []).map((tag) => (
            <span key={tag} className="tag">
              {tag}
              <button type="button" onClick={() => removeTag(tag)} className="remove-tag">
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      {!hideOptOut && (
        <div className="form-group checkbox-group">
          <label>
            <input
              type="checkbox"
              checked={formData.opt_out}
              onChange={(e) => setFormData((prev) => ({ ...prev, opt_out: e.target.checked }))}
            />
            Opt-Out
          </label>
        </div>
      )}

      <button type="submit" className="submit-btn" disabled={loading}>
        {loading ? "Saving..." : submitLabel}
      </button>

      <style>{`
        .contact-form {
          max-width: 800px;
          margin: 0 auto;
        }
        .form-header {
          margin-bottom: 1rem;
        }
        .back-btn {
          background: none;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 0.5rem 1rem;
          cursor: pointer;
          font-size: 14px;
          color: #475569;
        }
        .back-btn:hover {
          background: #f8fafc;
        }
        .form-row {
          display: flex;
          gap: 1rem;
          margin-bottom: 1rem;
        }
        .form-group {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .form-group label {
          font-size: 13px;
          font-weight: 600;
          color: #475569;
        }
        .form-group input,
        .form-group select {
          padding: 0.5rem;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          font-size: 14px;
        }
        .form-group input.error {
          border-color: #dc2626;
        }
        .field-error {
          font-size: 12px;
          color: #dc2626;
        }
        .tag-input-row {
          display: flex;
          gap: 0.5rem;
        }
        .tag-input-row input {
          flex: 1;
          padding: 0.5rem;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          font-size: 14px;
        }
        .add-tag-btn {
          padding: 0.5rem 1rem;
          background: #e2e8f0;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
        }
        .add-tag-btn:hover {
          background: #cbd5e1;
        }
        .tag-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }
        .tag {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.25rem 0.5rem;
          background: #f1f5f9;
          border-radius: 4px;
          font-size: 13px;
        }
        .remove-tag {
          background: none;
          border: none;
          color: #64748b;
          cursor: pointer;
          font-size: 16px;
          padding: 0;
          line-height: 1;
        }
        .checkbox-group {
          flex-direction: row;
          align-items: center;
        }
        .checkbox-group label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
        }
        .checkbox-group input {
          width: auto;
        }
        .submit-btn {
          padding: 0.75rem 2rem;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          font-size: 14px;
        }
        .submit-btn:hover:not(:disabled) {
          background: #2563eb;
        }
        .submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
      `}</style>
    </form>
  )
}
