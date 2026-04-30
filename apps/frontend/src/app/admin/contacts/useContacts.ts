"use client"

import { useState, useEffect, useCallback } from "react"
import { getContacts, type Contact, type GetContactsParams } from "../../../lib/api/contacts"

export function useContacts() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [params, setParams] = useState<GetContactsParams>({ page: 1, limit: 20 })
  const [totalCount, setTotalCount] = useState(0)

  const fetchContacts = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const data = await getContacts(params)

      // Ensure data is an array
      if (!Array.isArray(data)) {
        console.error("API did not return an array:", data)
        setContacts([])
        setError("Invalid response from server")
        return
      }

      setContacts(data)
      setTotalCount(data.length) // Approximate (API doesn't return total yet)
    } catch (err) {
      console.error("Failed to fetch contacts:", err)
      setContacts([]) // Reset to empty array on error
      setError(err instanceof Error ? err.message : "Failed to load contacts")
    } finally {
      setLoading(false)
    }
  }, [params])

  useEffect(() => {
    fetchContacts()
  }, [fetchContacts])

  const goToPage = (page: number) => {
    setParams(prev => ({ ...prev, page }))
  }

  const updateFilters = (newFilters: Partial<GetContactsParams>) => {
    setParams(prev => ({ ...prev, ...newFilters, page: 1 })) // Reset to page 1 on filter change
  }

  const totalPages = Math.ceil(totalCount / (params.limit || 20))

  return {
    contacts,
    loading,
    error,
    params,
    totalCount,
    totalPages,
    goToPage,
    updateFilters,
    refetch: fetchContacts,
  }
}
