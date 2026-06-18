// Shared page header — keeps the arcade typographic system consistent across
// all top-level routes (profile, achievements, settings, quests, …).
//
// Renders:
//   • breadcrumb trail (`/`-separated, earlier crumbs clickable when `to` is set)
//   • the page title in font-display
//   • optional subtitle (smaller, text-light) under the title
//   • optional `right` slot for stats / actions on the trailing side

import { Link, type LinkOptions } from '@tanstack/react-router'
import type { ReactNode } from 'react'

// A crumb is either a label (current page) or a label + route info (link).
// We piggy-back on TanStack Router's LinkOptions so callers can pass any
// shape that `<Link>` accepts (typed routes, params, search, …).
export type Crumb =
  | { label: string; to?: undefined }
  | ({ label: string } & LinkOptions)

type Props = {
  breadcrumbs?: Crumb[]
  title: string
  subtitle?: ReactNode
  right?: ReactNode
}

const baseChip =
  'font-mono text-[11px] font-bold uppercase tracking-[0.25em] transition-colors'

export function PageHeader({ breadcrumbs, title, subtitle, right }: Props) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav
            aria-label="Fil d'Ariane"
            className="flex flex-wrap items-center gap-x-1.5 gap-y-1"
          >
            {breadcrumbs.map((crumb, i) => {
              const isLast = i === breadcrumbs.length - 1
              return (
                <span key={`${crumb.label}-${i}`} className="flex items-center gap-x-1.5">
                  {i > 0 && (
                    <span
                      className={`${baseChip} text-text-light/40`}
                      aria-hidden
                    >
                      /
                    </span>
                  )}
                  {crumb.to && !isLast ? (
                    <Link
                      {...(crumb as LinkOptions)}
                      className={`${baseChip} text-text-light/70 hover:text-text`}
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span
                      className={`${baseChip} ${
                        isLast ? 'text-text-light' : 'text-text-light/70'
                      }`}
                      aria-current={isLast ? 'page' : undefined}
                    >
                      {crumb.label}
                    </span>
                  )}
                </span>
              )
            })}
          </nav>
        )}
        <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-text leading-tight">
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
