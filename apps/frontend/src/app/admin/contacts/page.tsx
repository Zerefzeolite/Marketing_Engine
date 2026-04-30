"use client"

import Link from "next/link"
import ContactTable from "./ContactTable"
import ContactFilters from "./ContactFilters"
import AudiencePreview from "./AudiencePreview"
import { useContacts } from "./useContacts"

export default function ContactListPage() {
  const { contacts, loading, error, params, totalPages, goToPage, updateFilters } = useContacts()

  return (
    <main className="contacts-page">
      <div className="header-row">
        <div>
          <h1>Contact Management</h1>
          <p className="subtitle">View and filter contacts</p>
        </div>
        <div className="header-actions">
          <Link href="/admin/contacts/new" className="add-btn">
            Add Contact
          </Link>
          <Link href="/admin/contacts/import" className="import-btn">
            Import CSV
          </Link>
        </div>
      </div>

      <AudiencePreview />

      {error ? (
        <p className="error">{error}</p>
      ) : (
        <>
          <ContactFilters params={params} onFilterChange={updateFilters} />

          <ContactTable contacts={contacts} loading={loading} />

          {/* Pagination */}
          {!loading && contacts.length > 0 && (
            <div className="pagination">
              <button
                disabled={params.page === 1}
                onClick={() => goToPage((params.page || 1) - 1)}
              >
                Previous
              </button>
              <span className="page-info">
                Page {params.page || 1} {totalPages > 0 && `of ${totalPages}`}
              </span>
              <button
                disabled={contacts.length < (params.limit || 20)}
                onClick={() => goToPage((params.page || 1) + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      <style>{`
        .contacts-page {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
        }
        .header-row {
          display: flex;
          justify-content: space-between;
          align-items: start;
          margin-bottom: 1.5rem;
        }
        .header-row h1 {
          margin: 0 0 0.25rem;
          color: #1e293b;
        }
        .add-btn {
          padding: 0.75rem 1.5rem;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          text-decoration: none;
          font-size: 14px;
        }
        .import-btn {
          padding: 0.75rem 1.5rem;
          background: #22c55e;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          text-decoration: none;
          font-size: 14px;
          margin-left: 0.5rem;
        }
        .import-btn:hover {
          background: #16a34a;
        }
        .subtitle {
          color: #64748b;
          margin-bottom: 0;
        }
        .error {
          padding: 1rem;
          background: #fef2f2;
          color: #dc2626;
          border-radius: 8px;
          margin-bottom: 1rem;
        }
        .filters {
          display: flex;
          gap: 1rem;
          margin-bottom: 1.5rem;
          padding: 1rem;
          background: #f8fafc;
          border-radius: 8px;
          align-items: end;
        }
        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .filter-group label {
          font-size: 13px;
          font-weight: 600;
          color: #475569;
        }
        .filter-group select,
        .filter-group input {
          padding: 0.5rem;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          font-size: 14px;
        }
        .clear-btn {
          padding: 0.5rem 1rem;
          background: #e2e8f0;
          color: #475569;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
        }
        .clear-btn:hover {
          background: #cbd5e1;
        }
        .table-wrapper {
          overflow-x: auto;
        }
        .contact-table {
          width: 100%;
          border-collapse: collapse;
          background: white;
          border-radius: 8px;
          overflow: hidden;
        }
        .contact-table th,
        .contact-table td {
          padding: 0.75rem 1rem;
          text-align: left;
          border-bottom: 1px solid #e2e8f0;
          font-size: 14px;
        }
        .contact-table th {
          background: #f8fafc;
          font-weight: 600;
          color: #475569;
        }
        .contact-table tr:hover {
          background: #f8fafc;
        }
        .mono {
          font-family: monospace;
          font-size: 13px;
          color: #64748b;
        }
        .tags {
          font-size: 13px;
          color: #64748b;
        }
        .source-badge {
          padding: 0.15rem 0.5rem;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
        }
        .source-badge.manual {
          background: #dbeafe;
          color: #1d4ed8;
        }
        .source-badge.import {
          background: #fef3c7;
          color: #d97706;
        }
        .source-badge.api {
          background: #dcfce7;
          color: #16a34a;
        }
        .opt-out-true {
          color: #dc2626;
          font-weight: 600;
        }
        .opt-out-false {
          color: #16a34a;
        }
        .date {
          color: #64748b;
          font-size: 13px;
        }
        .edit-link {
          color: #3b82f6;
          text-decoration: none;
          font-size: 13px;
          font-weight: 600;
        }
        .edit-link:hover {
          text-decoration: underline;
        }
        .loading,
        .empty {
          text-align: center;
          padding: 3rem;
          color: #64748b;
        }
        .pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 1rem;
          margin-top: 1.5rem;
        }
        .pagination button {
          padding: 0.5rem 1rem;
          border: 1px solid #e2e8f0;
          background: white;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
        }
        .pagination button:hover:not(:disabled) {
          background: #f8fafc;
        }
        .pagination button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .page-info {
          color: #64748b;
          font-size: 14px;
        }
      `}</style>
    </main>
  )
}
