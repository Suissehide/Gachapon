// Shared page header — keeps the arcade typographic system consistent across
// all top-level routes (profile, achievements, settings, quests, …).
// Renders:
//   • optional mono "tag" line above the title (e.g. "Profil · Succès")
//   • the page title in font-display
//   • optional subtitle (smaller, text-light) under the title
//   • optional `right` slot for stats / actions on the trailing side

import type { ReactNode } from 'react'

type Props = {
  tag?: string
  title: string
  subtitle?: ReactNode
  right?: ReactNode
}

export function PageHeader({ tag, title, subtitle, right }: Props) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {tag && (
          <span className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-text-light">
            {tag}
          </span>
        )}
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-text leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 font-body text-sm text-text-light">{subtitle}</p>
        )}
      </div>
      {right && <div className="text-right shrink-0">{right}</div>}
    </div>
  )
}
