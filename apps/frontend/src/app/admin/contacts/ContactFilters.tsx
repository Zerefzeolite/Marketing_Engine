"use client"

import type { GetContactsParams } from "../../../lib/api/contacts"

export default function ContactFilters({
  params,
  onFilterChange,
}: {
  params: GetContactsParams
  onFilterChange: (filters: Partial<GetContactsParams>) => void
}) {
  return (
    <div className="filters">
      <div className="filter-group">
        <label htmlFor="opt-out-filter">Opt-Out:</label>
        <select
          id="opt-out-filter"
          value={params.opt_out === undefined ? "" : params.opt_out.toString()}
          onChange={(e) => {
            const value = e.target.value
            onFilterChange({
              opt_out: value === "" ? undefined : value === "true",
            })
          }}
        >
          <option value="">All</option>
          <option value="false">No (Active)</option>
          <option value="true">Yes (Opt-Out)</option>
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="source-filter">Source:</label>
        <input
          id="source-filter"
          type="text"
          placeholder="e.g., manual, import"
          value={params.source || ""}
          onChange={(e) => onFilterChange({ source: e.target.value || undefined })}
        />
      </div>

      <button
        className="clear-btn"
        onClick={() => onFilterChange({ opt_out: undefined, source: undefined, page: 1 })}
      >
        Clear Filters
      </button>
    </div>
  )
}
