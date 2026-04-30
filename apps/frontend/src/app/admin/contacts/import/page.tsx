"use client"

import ContactImportForm from "../ContactImportForm"

export default function ContactImportPage() {
  return (
    <main className="import-page">
      <h1>Import Contacts</h1>
      <p className="subtitle">Upload a CSV file to bulk import contacts</p>

      <ContactImportForm />

      <style>{`
        .import-page {
          max-width: 800px;
          margin: 0 auto;
          padding: 2rem;
        }
        .import-page h1 {
          margin: 0 0 0.25rem;
          color: #1e293b;
        }
        .subtitle {
          color: #64748b;
          margin-bottom: 2rem;
        }
      `}</style>
    </main>
  )
}
