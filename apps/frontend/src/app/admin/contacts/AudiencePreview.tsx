"use client"

import { useState, useEffect } from "react"
import type { AudiencePreviewResponse } from "../../../lib/api/contacts"
import { getAudiencePreview } from "../../../lib/api/contacts"

const AGE_GROUPS = ["18-25", "26-35", "36-50", "51+", ""]
const GENDERS = ["male", "female", "non-binary", "prefer_not_to_say", ""]
const CHANNELS = ["email", "sms", "both", ""]
const PARISHES = [
  "Kingston",
  "St. Andrew",
  "Portland",
  "St. Thomas",
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
  "",
]

export default function AudiencePreview() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [data, setData] = useState<AudiencePreviewResponse | null>(null)
  const [filters, setFilters] = useState({
    parish: "",
    age_group: "",
    gender: "",
    preferred_channel: "",
    engagement_min: "",
  })

  async function fetchPreview() {
    setLoading(true)
    setError("")
    try {
      const params: Parameters<typeof getAudiencePreview>[0] = {}
      if (filters.parish) params.parish = filters.parish
      if (filters.age_group) params.age_group = filters.age_group
      if (filters.gender) params.gender = filters.gender
      if (filters.preferred_channel) params.preferred_channel = filters.preferred_channel
      if (filters.engagement_min) params.engagement_min = parseFloat(filters.engagement_min)

      const result = await getAudiencePreview(params)
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load preview")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPreview()
  }, [])

  function handleFilterChange(key: string, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  function clearFilters() {
    setFilters({
      parish: "",
      age_group: "",
      gender: "",
      preferred_channel: "",
      engagement_min: "",
    })
  }

  return (
    <div className="audience-preview">
      <h2>Audience Preview</h2>
      <p className="subtitle">See how many contacts match your criteria</p>

      <div className="filters">
        <div className="filter-group">
          <label>Parish</label>
          <select
            value={filters.parish}
            onChange={(e) => handleFilterChange("parish", e.target.value)}
          >
            {PARISHES.map((p) => (
              <option key={p} value={p}>{p || "All"}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Age Group</label>
          <select
            value={filters.age_group}
            onChange={(e) => handleFilterChange("age_group", e.target.value)}
          >
            {AGE_GROUPS.map((ag) => (
              <option key={ag} value={ag}>{ag || "All"}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Gender</label>
          <select
            value={filters.gender}
            onChange={(e) => handleFilterChange("gender", e.target.value)}
          >
            {GENDERS.map((g) => (
              <option key={g} value={g}>{g?.replace("_", " ") || "All"}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Channel</label>
          <select
            value={filters.preferred_channel}
            onChange={(e) => handleFilterChange("preferred_channel", e.target.value)}
          >
            {CHANNELS.map((c) => (
              <option key={c} value={c}>{c || "All"}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Min Engagement (0-1)</label>
          <input
            type="number"
            min="0"
            max="1"
            step="0.1"
            placeholder="0.0"
            value={filters.engagement_min}
            onChange={(e) => handleFilterChange("engagement_min", e.target.value)}
          />
        </div>

        <div className="filter-actions">
          <button onClick={fetchPreview} className="preview-btn">
            Update Preview
          </button>
          <button onClick={clearFilters} className="clear-btn">
            Clear
          </button>
        </div>
      </div>

      {loading && <p className="loading">Loading preview...</p>}
      {error && <p className="error">{error}</p>}

      {data && !loading && (
        <div className="metrics">
          <div className="metric-card main">
            <span className="metric-value">{data.total_contacts}</span>
            <span className="metric-label">Total Available</span>
          </div>

          <div className="breakdown-section">
            <h3>Channel Breakdown</h3>
            <div className="breakdown">
              {Object.entries(data.channel_breakdown).map(([key, value]) => (
                <div key={key} className="breakdown-item">
                  <span className="breakdown-label">{key}</span>
                  <span className="breakdown-value">{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="breakdown-section">
            <h3>Parish Breakdown</h3>
            <div className="breakdown">
              {Object.entries(data.parish_breakdown).map(([key, value]) => (
                <div key={key} className="breakdown-item">
                  <span className="breakdown-label">{key}</span>
                  <span className="breakdown-value">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {Object.keys(data.age_group_breakdown).length > 0 && (
            <div className="breakdown-section">
              <h3>Age Group Breakdown</h3>
              <div className="breakdown">
                {Object.entries(data.age_group_breakdown).map(([key, value]) => (
                  <div key={key} className="breakdown-item">
                    <span className="breakdown-label">{key}</span>
                    <span className="breakdown-value">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {Object.keys(data.gender_breakdown).length > 0 && (
            <div className="breakdown-section">
              <h3>Gender Breakdown</h3>
              <div className="breakdown">
                {Object.entries(data.gender_breakdown).map(([key, value]) => (
                  <div key={key} className="breakdown-item">
                    <span className="breakdown-label">{key}</span>
                    <span className="breakdown-value">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.avg_engagement_score !== null && (
            <div className="metric-card">
              <span className="metric-value">{(data.avg_engagement_score * 100).toFixed(1)}%</span>
              <span className="metric-label">Avg Engagement</span>
            </div>
          )}
        </div>
      )}
      {!data && !loading && !error && (
        <p className="empty">Click "Update Preview" to see audience metrics</p>
      )}

      <style>{`
        .audience-preview {
          margin-bottom: 2rem;
          padding: 1.5rem;
          background: #f8fafc;
          border-radius: 12px;
        }
        .audience-preview h2 {
          margin: 0 0 0.25rem;
          color: #1e293b;
          font-size: 18px;
        }
        .subtitle {
          color: #64748b;
          font-size: 14px;
          margin-bottom: 1rem;
        }
        .filters {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          margin-bottom: 1.5rem;
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
        .filter-actions {
          display: flex;
          gap: 0.5rem;
          align-items: end;
        }
        .preview-btn {
          padding: 0.5rem 1rem;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          font-size: 14px;
        }
        .preview-btn:hover {
          background: #2563eb;
        }
        .clear-btn {
          padding: 0.5rem 1rem;
          background: #e2e8f0;
          color: #475569;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          font-size: 14px;
        }
        .clear-btn:hover {
          background: #cbd5e1;
        }
        .loading,
        .error,
        .empty {
          text-align: center;
          padding: 1rem;
          font-size: 14px;
        }
        .error {
          background: #fef2f2;
          color: #dc2626;
          border-radius: 6px;
        }
        .metrics {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }
        .metric-card {
          background: white;
          padding: 1rem;
          border-radius: 8px;
          text-align: center;
        }
        .metric-card.main {
          background: #3b82f6;
          color: white;
        }
        .metric-value {
          display: block;
          font-size: 24px;
          font-weight: 700;
        }
        .metric-label {
          font-size: 13px;
          opacity: 0.9;
        }
        .breakdown-section {
          grid-column: 1 / -1;
          background: white;
          padding: 1rem;
          border-radius: 8px;
        }
        .breakdown-section h3 {
          margin: 0 0 0.75rem;
          font-size: 14px;
          color: #475569;
        }
        .breakdown {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 0.5rem;
        }
        .breakdown-item {
          display: flex;
          justify-content: space-between;
          padding: 0.25rem 0;
          font-size: 14px;
        }
        .breakdown-label {
          color: #64748b;
        }
        .breakdown-value {
          font-weight: 600;
          color: #1e293b;
        }
      `}</style>
    </div>
  )
}
