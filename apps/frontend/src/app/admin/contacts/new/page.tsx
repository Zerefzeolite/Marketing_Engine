"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import ContactForm from "../ContactForm"
import { createContact } from "../../../../lib/api/contacts"

export default function NewContactPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(data: Parameters<typeof createContact>[0]) {
    setError("")
    setLoading(true)
    try {
      await createContact(data)
      router.push("/admin/contacts")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create contact")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="new-contact-page">
      <h1>Add New Contact</h1>
      <p className="subtitle">Create a new contact record</p>

      {error && <p className="error">{error}</p>}

      <ContactForm
        onSubmit={handleSubmit}
        loading={loading}
        submitLabel="Create Contact"
        hideSource={true}
        hideOptOut={true}
      />

      <style>{`
        .new-contact-page {
          max-width: 800px;
          margin: 0 auto;
          padding: 2rem;
        }
        .new-contact-page h1 {
          margin: 0 0 0.25rem;
          color: #1e293b;
        }
        .subtitle {
          color: #64748b;
          margin-bottom: 2rem;
        }
        .error {
          padding: 1rem;
          background: #fef2f2;
          color: #dc2626;
          border-radius: 8px;
          margin-bottom: 1rem;
        }
      `}</style>
    </main>
  )
}
