type StatCardProps = {
  label: string
  value: string | number
  sub?: string
}

export function StatCard({ label, value, sub }: StatCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-text-light">
        {label}
      </p>
      <p className="mt-1 text-3xl font-black text-text">{value}</p>
      {sub && <p className="mt-1 text-xs text-text-light">{sub}</p>}
    </div>
  )
}
