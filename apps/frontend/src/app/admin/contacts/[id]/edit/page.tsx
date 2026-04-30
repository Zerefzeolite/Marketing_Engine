"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import ContactForm from "../../ContactForm"
import { getContact, updateContact } from "../../../../../lib/api/contacts"

export default function EditContactPage() {
  const router = useRouter()
  const params = useParams()
  const contactId = params.id as string

  const [loading, setLoading] = useState(false)
  const [fetchLoading, setFetchLoading] = useState(true)
  const [error, setError] = useState("")
  const [initialData, setInitialData] = useState<Parameters<typeof ContactForm>[0]["initialData"]>()

  useEffect(() => {
    async function fetchContact() {
      try {
        const data = await getContact(contactId)
        setInitialData(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load contact")
      } finally {
        setFetchLoading(false)
      }
    }
    if (contactId) fetchContact()
  }, [contactId])

  async function handleSubmit(data: Parameters<typeof updateContact>[1]) {
    setError("")
    setLoading(true)
    try {
      await updateContact(contactId, data)
      router.push("/admin/contacts")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update contact")
    } finally {
      setLoading(false)
    }
  }

  if (fetchLoading) {
    return <p className="loading">Loading contact...</p>
  }

  return (
    <main className="edit-contact-page">
      <h1>Edit Contact</h1>
      <p className="subtitle">Update contact information</p>

      {error && <p className="error">{error}</p>}

      {initialData && (
        <ContactForm
          initialData={initialData}
          onSubmit={handleSubmit}
          loading={loading}
          submitLabel="Update Contact"
          hideSource={true}
        />
      )}

      <style>{`
        .edit-contact-page {
          max-width: 800px;
          margin: 0 auto;
          padding: 2rem;
        }
        .edit-contact-page h1 {
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
        .loading {
          text-align: center;
          padding: 3rem;
          color: #64748b;
        }
      `}</style>
    </main>
  )
}
