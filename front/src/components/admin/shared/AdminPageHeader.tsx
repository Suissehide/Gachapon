import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

type AdminPageHeaderProps = {
  icon: LucideIcon
  kicker: string
  title: string
  subtitle?: string
  actions?: ReactNode
}

export function AdminPageHeader({
  icon: Icon,
  kicker,
  title,
  subtitle,
  actions,
}: AdminPageHeaderProps) {
  return (
    <div className="mb-8 flex items-start justify-between gap-4">
      <div>
        <div className="mb-1 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <span className="text-xs font-black uppercase tracking-widest text-primary">
            {kicker}
          </span>
        </div>
        <h1 className="text-3xl font-black text-text">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-text-light">{subtitle}</p>}
      </div>
      {actions && (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      )}
    </div>
  )
}
