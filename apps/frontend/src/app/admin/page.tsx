"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function AdminPage() {
  const router = useRouter()
  const [stats, setStats] = useState<{
    total_contacts: number
    total_campaigns: number
  }>({ total_contacts: 0, total_campaigns: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    async function fetchStats() {
      try {
        const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"

        console.log("Admin page: Fetching from", API_BASE)

        const [contactsRes, campaignsRes] = await Promise.all([
          fetch(`${API_BASE}/contacts?limit=1`),
          fetch(`${API_BASE}/campaigns/scheduled`),
        ])

        console.log("Contacts response:", contactsRes.status)
        console.log("Campaigns response:", campaignsRes.status)

        let total_contacts = 0
        if (contactsRes.ok) {
          const contactsData = await contactsRes.json()
          total_contacts = Array.isArray(contactsData) ? contactsData.length : 0
        }

        let total_campaigns = 0
        if (campaignsRes.ok) {
          const campaignsData = await campaignsRes.json()
          total_campaigns = Array.isArray(campaignsData) ? campaignsData.length : 0
        }

        setStats({ total_contacts, total_campaigns })
        setError("")
      } catch (err) {
        console.error("Failed to load stats:", err)
        setError(err instanceof Error ? err.message : "Failed to load dashboard data")
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  return (
    <main className="admin-dashboard">
      <h1>Admin Dashboard</h1>
      <p className="subtitle">Marketing Engine Management</p>

      {error && (
        <p className="error">{error}</p>
      )}

      {loading ? (
        <p className="loading">Loading...</p>
      ) : (
        <div className="dashboard-grid">
          <Link href="/admin/contacts" className="dashboard-card">
            <h2>Contacts</h2>
            <p className="card-description">Manage your contact database</p>
            <div className="card-stats">
              <span className="stat-number">{stats.total_contacts}</span>
              <span className="stat-label">Total Contacts</span>
            </div>
          </Link>

          <Link href="/campaign-flow" className="dashboard-card">
            <h2>Campaigns</h2>
            <p className="card-description">Create and manage campaigns</p>
            <div className="card-stats">
              <span className="stat-number">{stats.total_campaigns}</span>
              <span className="stat-label">Active Campaigns</span>
            </div>
          </Link>

          <Link href="/intake" className="dashboard-card">
            <h2>Intake</h2>
            <p className="card-description">Submit new campaign requests</p>
          </Link>

          <Link href="/analytics" className="dashboard-card">
            <h2>Analytics</h2>
            <p className="card-description">View campaign performance</p>
          </Link>

          <Link href="/quality-gate" className="dashboard-card">
            <h2>Quality Gate</h2>
            <p className="card-description">Review campaign quality</p>
          </Link>
        </div>
      )}

      <style>{`
        .admin-dashboard {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
        }
        .admin-dashboard h1 {
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
        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1.5rem;
        }
        .dashboard-card {
          display: block;
          padding: 1.5rem;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          text-decoration: none;
          color: inherit;
          transition: all 0.2s;
        }
        .dashboard-card:hover {
          border-color: #3b82f6;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1);
          transform: translateY(-2px);
        }
        .dashboard-card h2 {
          margin: 0 0 0.5rem;
          color: #1e293b;
          font-size: 1.25rem;
        }
        .card-description {
          color: #64748b;
          font-size: 0.875rem;
          margin: 0 0 1rem;
        }
        .card-stats {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          padding-top: 1rem;
          border-top: 1px solid #f1f5f9;
        }
        .stat-number {
          font-size: 1.5rem;
          font-weight: 700;
          color: #3b82f6;
        }
        .stat-label {
          font-size: 0.75rem;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
      `}</style>
    </main>
  )
}
