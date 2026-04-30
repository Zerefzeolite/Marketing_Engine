interface KPICardProps {
  label: string
  value: number
  unit: "count" | "percentage" | "currency"
  trend: "up" | "down" | "flat"
  trendValue: number
  alert: "none" | "warning" | "error"
}

export function KPICard({ label, value, unit, trend, trendValue, alert }: KPICardProps) {
  const trendColor = trend === "up" ? "green" : trend === "down" ? "red" : "gray"
  const alertColor = alert === "error" ? "red" : alert === "warning" ? "orange" : "transparent"

  const formattedValue = unit === "percentage"
    ? `${value.toFixed(1)}%`
    : unit === "currency"
      ? `$${value.toFixed(2)}`
      : value.toLocaleString()

  return (
    <div style={{
      border: "1px solid #e5e7eb",
      borderRadius: 8,
      padding: 16,
      minWidth: 150,
      borderLeft: alert !== "none" ? `4px solid ${alertColor}` : undefined
    }}>
      <div style={{ color: "#6b7280", fontSize: 14, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 600, marginBottom: 4 }}>
        {formattedValue}
      </div>
      <div style={{ fontSize: 12, color: trendColor }}>
        {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"} {Math.abs(trendValue).toFixed(1)}%
      </div>
    </div>
  )
}