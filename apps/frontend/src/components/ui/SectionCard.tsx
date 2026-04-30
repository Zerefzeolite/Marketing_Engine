import { ReactNode } from "react"

interface SectionCardProps {
  children: ReactNode
}

export function SectionCard({ children }: SectionCardProps) {
  return <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 16 }}>{children}</div>
}
