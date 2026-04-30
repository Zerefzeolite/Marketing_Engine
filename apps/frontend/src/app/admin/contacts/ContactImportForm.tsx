"use client"

import { useState } from "react"
import type { ImportContactRow, ImportContactsResponse } from "../../../lib/api/contacts"
import { importContacts } from "../../../lib/api/contacts"

type ImportStatus = "idle" | "parsing" | "preview" | "importing" | "complete" | "error"

const SAMPLE_CSV = `email,phone,first_name,last_name,dob,gender,parish,tags,source
john@example.com,1234567890,John,Doe,1990-05-15,male,Kingston,"tag1,tag2",manual
jane@example.com,0987654321,Jane,Smith,1985-08-22,female,St. Andrew,"tag3",import
`

export default function ContactImportForm() {
  const [status, setStatus] = useState<ImportStatus>("idle")
  const [fileName, setFileName] = useState("")
  const [parsedRows, setParsedRows] = useState<ImportContactRow[]>([])
  const [error, setError] = useState("")
  const [result, setResult] = useState<ImportContactsResponse | null>(null)

  function downloadTemplate() {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "contact_import_template.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  function parseCSV(text: string): ImportContactRow[] {
    const lines = text.split("\n").filter(line => line.trim())
    if (lines.length < 2) return []

    const headers = lines[0].split(",").map(h => h.trim())
    const rows: ImportContactRow[] = []

    for (let i = 1; i < lines.length; i++) {
      const cells = lines[i].split(",")
      const row: ImportContactRow = {}
      
      headers.forEach((header, index) => {
        const value = cells[index]?.trim().replace(/^"|"$/g, "")
        if (!value) return

        switch (header) {
          case "email":
          case "phone":
          case "first_name":
          case "last_name":
          case "dob":
          case "gender":
          case "parish":
          case "source":
            row[header] = value
            break
          case "tags":
            row.tags = value
            break
        }
      })

      if (row.email || row.phone) {
        rows.push(row)
      }
    }

    return rows
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    setStatus("parsing")
    setError("")

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string
        const rows = parseCSV(text)
        if (rows.length === 0) {
          setError("No valid rows found in CSV")
          setStatus("error")
        } else {
          setParsedRows(rows)
          setStatus("preview")
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to parse CSV")
        setStatus("error")
      }
    }
    reader.readAsText(file)
  }

  async function handleImport() {
    setStatus("importing")
    setError("")
    try {
      const res = await importContacts(parsedRows)
      setResult(res)
      setStatus("complete")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed")
      setStatus("error")
    }
  }

  function reset() {
    setStatus("idle")
    setFileName("")
    setParsedRows([])
    setError("")
    setResult(null)
  }

  return (
    <div className="import-form">
      <div className="expected-format">
        <h3>Expected CSV Format</h3>
        <pre>email,phone,first_name,last_name,dob,gender,parish,tags,source</pre>
        <button type="button" onClick={downloadTemplate} className="template-btn">
          Download Template
        </button>
      </div>

      {status === "idle" && (
        <div className="file-upload">
          <label htmlFor="csv-file" className="upload-label">
            Choose CSV File
          </label>
          <input
            id="csv-file"
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="file-input"
          />
        </div>
      )}

      {status === "parsing" && <p className="loading">Parsing CSV...</p>}

      {status === "preview" && (
        <div className="preview">
          <h3>Preview (first 5 rows)</h3>
          <p>Found {parsedRows.length} valid rows</p>
          <div className="table-wrapper">
            <table className="preview-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Name</th>
                  <th>Gender</th>
                  <th>Parish</th>
                </tr>
              </thead>
              <tbody>
                {parsedRows.slice(0, 5).map((row, i) => (
                  <tr key={i}>
                    <td>{row.email || "-"}</td>
                    <td>{row.phone || "-"}</td>
                    <td>{(row.first_name || "") + " " + (row.last_name || "")}</td>
                    <td>{row.gender || "-"}</td>
                    <td>{row.parish || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="actions">
            <button onClick={handleImport} className="import-btn">
              Import {parsedRows.length} Contacts
            </button>
            <button onClick={reset} className="cancel-btn">
              Cancel
            </button>
          </div>
        </div>
      )}

      {status === "importing" && <p className="loading">Importing contacts...</p>}

      {status === "complete" && result && (
        <div className="results">
          <h3>Import Complete</h3>
          <div className="stats">
            <div className="stat">
              <span className="stat-value">{result.imported}</span>
              <span className="stat-label">Imported</span>
            </div>
            <div className="stat">
              <span className="stat-value">{result.updated}</span>
              <span className="stat-label">Updated</span>
            </div>
            <div className="stat">
              <span className="stat-value">{result.duplicates_skipped}</span>
              <span className="stat-label">Duplicates Skipped</span>
            </div>
            <div className="stat">
              <span className="stat-value">{result.invalid}</span>
              <span className="stat-label">Invalid</span>
            </div>
            <div className="stat">
              <span className="stat-value">{result.total_processed}</span>
              <span className="stat-label">Total Processed</span>
            </div>
          </div>
          {result.errors.length > 0 && (
            <div className="errors">
              <h4>Errors</h4>
              <ul>
                {result.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
          <button onClick={reset} className="reset-btn">
            Import Another File
          </button>
        </div>
      )}

      {status === "error" && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={reset} className="reset-btn">
            Try Again
          </button>
        </div>
      )}

      <style>{`
        .import-form {
          max-width: 800px;
          margin: 0 auto;
        }
        .expected-format {
          background: #f8fafc;
          padding: 1.5rem;
          border-radius: 8px;
          margin-bottom: 2rem;
        }
        .expected-format h3 {
          margin: 0 0 0.5rem;
          font-size: 16px;
          color: #1e293b;
        }
        .expected-format pre {
          background: white;
          padding: 1rem;
          border-radius: 6px;
          font-size: 13px;
          color: #475569;
          overflow-x: auto;
          margin-bottom: 1rem;
        }
        .template-btn {
          padding: 0.5rem 1rem;
          background: #e2e8f0;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          font-size: 14px;
        }
        .template-btn:hover {
          background: #cbd5e1;
        }
        .file-upload {
          text-align: center;
          padding: 3rem;
          border: 2px dashed #e2e8f0;
          border-radius: 12px;
        }
        .upload-label {
          display: inline-block;
          padding: 0.75rem 2rem;
          background: #3b82f6;
          color: white;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
        }
        .file-input {
          display: none;
        }
        .loading {
          text-align: center;
          padding: 2rem;
          color: #64748b;
        }
        .preview h3 {
          margin: 0 0 0.5rem;
          color: #1e293b;
        }
        .preview > p {
          color: #64748b;
          margin-bottom: 1rem;
        }
        .table-wrapper {
          overflow-x: auto;
          margin-bottom: 1.5rem;
        }
        .preview-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }
        .preview-table th,
        .preview-table td {
          padding: 0.5rem;
          text-align: left;
          border-bottom: 1px solid #e2e8f0;
        }
        .preview-table th {
          background: #f8fafc;
          font-weight: 600;
          color: #475569;
        }
        .actions {
          display: flex;
          gap: 1rem;
        }
        .import-btn {
          padding: 0.75rem 2rem;
          background: #22c55e;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
        }
        .import-btn:hover {
          background: #16a34a;
        }
        .cancel-btn {
          padding: 0.75rem 2rem;
          background: #e2e8f0;
          color: #475569;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
        }
        .results h3 {
          margin: 0 0 1rem;
          color: #1e293b;
        }
        .stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        .stat {
          background: #f8fafc;
          padding: 1rem;
          border-radius: 8px;
          text-align: center;
        }
        .stat-value {
          display: block;
          font-size: 24px;
          font-weight: 700;
          color: #1e293b;
        }
        .stat-label {
          font-size: 12px;
          color: #64748b;
          margin-top: 0.25rem;
        }
        .errors {
          background: #fef2f2;
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 1rem;
        }
        .errors h4 {
          margin: 0 0 0.5rem;
          color: #dc2626;
        }
        .errors ul {
          margin: 0;
          padding-left: 1.5rem;
        }
        .errors li {
          color: #dc2626;
          font-size: 14px;
        }
        .reset-btn {
          padding: 0.75rem 2rem;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
        }
        .error-message {
          text-align: center;
          padding: 2rem;
        }
        .error-message p {
          background: #fef2f2;
          color: #dc2626;
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 1rem;
        }
      `}</style>
    </div>
  )
}
