"use client"

import Link from "next/link"
import type { Contact } from "../../../lib/api/contacts"

export default function ContactTable({ contacts, loading }: { contacts: Contact[]; loading: boolean }) {
  if (loading) {
    return <p className="loading">Loading contacts...</p>
  }

  if (contacts.length === 0) {
    return <p className="empty">No contacts found.</p>
  }

  return (
    <div className="table-wrapper">
      <table className="contact-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Name</th>
            <th>Gender</th>
            <th>Parish</th>
            <th>Tags</th>
            <th>Source</th>
            <th>Opt-Out</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {contacts.map((contact) => (
            <tr key={contact.contact_id}>
              <td className="mono">{contact.contact_id}</td>
              <td>{contact.email}</td>
              <td>{contact.phone || "-"}</td>
              <td>
                {[contact.first_name, contact.last_name].filter(Boolean).join(" ") || "-"}
              </td>
              <td>{contact.gender || "-"}</td>
              <td>{contact.parish || "-"}</td>
              <td>
                {contact.tags.length > 0 ? (
                  <span className="tags">{contact.tags.join(", ")}</span>
                ) : (
                  "-"
                )}
              </td>
              <td>
                <span className={`source-badge ${contact.source}`}>{contact.source}</span>
              </td>
              <td>
                <span className={contact.opt_out ? "opt-out-true" : "opt-out-false"}>
                  {contact.opt_out ? "Yes" : "No"}
                </span>
              </td>
              <td className="date">
                {new Date(contact.created_at).toLocaleDateString()}
              </td>
              <td>
                <Link href={`/admin/contacts/${contact.contact_id}/edit`} className="edit-link">
                  Edit
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
