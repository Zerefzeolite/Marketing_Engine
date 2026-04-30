interface DateRangePickerProps {
  startDate: Date
  endDate: Date
  onChange: (start: Date, end: Date) => void
}

export function DateRangePicker({ startDate, endDate, onChange }: DateRangePickerProps) {
  return (
    <div>
      <label>Date Range</label>
      <input
        type="date"
        value={startDate.toISOString().split("T")[0]}
        onChange={(e) => onChange(new Date(e.target.value), endDate)}
      />
      <span> to </span>
      <input
        type="date"
        value={endDate.toISOString().split("T")[0]}
        onChange={(e) => onChange(startDate, new Date(e.target.value))}
      />
    </div>
  )
}
