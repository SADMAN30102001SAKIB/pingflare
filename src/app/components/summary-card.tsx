export function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon: React.ReactNode
}) {
  return (
    <article className="summary-card">
      <div>{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  )
}
