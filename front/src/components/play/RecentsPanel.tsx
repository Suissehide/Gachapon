import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react'

import { TeamsApi } from '../../api/teams.api'
import { type FeedEntry, useLiveFeed } from '../../hooks/useLiveFeed'
import { cn } from '../../libs/utils.ts'
import { Select } from '../ui/input.tsx'
import { FeedEntryRow } from './FeedEntry'

const EPIC_PLUS = ['EPIC', 'LEGENDARY']
const MAX_TEAM_CHIPS = 4

export function RecentsPanel({ frozen = false }: { frozen?: boolean }) {
  const [epicOnly, setEpicOnly] = useState(false)
  const [teamId, setTeamId] = useState<string | undefined>()
  const sentinelRef = useRef<HTMLDivElement>(null)

  const { data: teamsData } = useQuery({
    queryKey: ['teams'],
    queryFn: TeamsApi.getMyTeams,
    staleTime: 5 * 60_000,
  })
  const teams = teamsData?.teams ?? []

  const { entries, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useLiveFeed({ teamId, rarities: epicOnly ? EPIC_PLUS : undefined })

  // While a pull cycle is running on the play page we display a snapshot of the
  // feed taken when it started, so the player's own just-pulled card can't spoil
  // the reveal by appearing here first. On unfreeze we resume the live list.
  const [frozenEntries, setFrozenEntries] = useState<FeedEntry[] | null>(null)
  const entriesRef = useRef(entries)
  entriesRef.current = entries
  useEffect(() => {
    setFrozenEntries(frozen ? entriesRef.current : null)
  }, [frozen])
  const shownEntries = frozenEntries ?? entries

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) {
      return
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { threshold: 0 },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  return (
    <div className="flex max-h-[300px] min-h-0 flex-col rounded-2xl border border-border bg-card px-4 py-3.5 shadow-sm lg:max-h-[480px] lg:min-h-[280px] lg:flex-1">
      {/* En-tête : live + ÉPIQUE+ */}
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-text-light">
          <span className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_0_3px_rgba(34,197,94,0.18)]" />
          Tirages récents
        </span>
        <button
          type="button"
          className={cn(
            'cursor-pointer rounded-full border px-2.5 py-1 font-mono text-[9px] font-bold tracking-[0.12em] transition-colors',
            epicOnly
              ? 'border-transparent bg-linear-to-br from-secondary to-primary text-white'
              : 'border-border-dark text-text-light hover:border-text-light hover:text-text',
          )}
          onClick={() => setEpicOnly((e) => !e)}
        >
          ÉPIQUE+
        </button>
      </div>

      {/* Filtre équipe */}
      {teams.length > 0 && (
        <div className="mt-2.5 flex items-center gap-1 border-b border-border pb-2.5">
          <span className="mr-1 shrink-0 font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-text-light/60">
            Équipe
          </span>
          {teams.length <= MAX_TEAM_CHIPS ? (
            <TeamChipStrip>
              <TeamChip
                label="Toutes"
                active={teamId === undefined}
                onClick={() => setTeamId(undefined)}
              />
              {teams.map((t) => (
                <TeamChip
                  key={t.id}
                  label={t.name}
                  active={teamId === t.id}
                  onClick={() => setTeamId(t.id)}
                />
              ))}
            </TeamChipStrip>
          ) : (
            <Select
              id="recents-team-select"
              options={[
                { value: 'all', label: 'Toutes' },
                ...teams.map((t) => ({ value: t.id, label: t.name })),
              ]}
              value={teamId ?? 'all'}
              onValueChange={(v) => setTeamId(v === 'all' ? undefined : v)}
              clearable={false}
              className="h-7 flex-1 text-[10px]"
            />
          )}
        </div>
      )}

      {/* Liste scrollable + fondu bas */}
      {shownEntries.length === 0 ? (
        <p className="flex flex-1 items-center justify-center py-6 text-[13px] italic text-text-light/60">
          Aucun tirage récent…
        </p>
      ) : (
        <div className="mt-1 min-h-0 flex-1 overflow-y-auto pb-3.5 [mask-image:linear-gradient(180deg,#000_calc(100%-26px),transparent_100%)] [scrollbar-width:thin]">
          {shownEntries.map((entry, i) => (
            <FeedEntryRow
              key={`${entry.username}-${entry.cardId}-${entry.pulledAt}`}
              entry={entry}
              index={i}
            />
          ))}
          <div ref={sentinelRef} className="h-1 shrink-0" />
          {isFetchingNextPage && (
            <div className="flex justify-center py-2">
              <div className="h-3 w-3 animate-spin rounded-full border border-text-light/30 border-t-text-light" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Rangée de puces d'équipe : défile horizontalement quand les noms dépassent.
// Même motif que la bande de chapitres de la campagne — fondu du seul côté
// réellement coupé, plus un chevron cliquable pour rendre le scroll visible.
function TeamChipStrip({ children }: { children: ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ left: false, right: false })

  const update = useCallback(() => {
    const el = scrollRef.current
    if (!el) {
      return
    }
    const max = el.scrollWidth - el.clientWidth
    setEdges({ left: el.scrollLeft > 4, right: el.scrollLeft < max - 4 })
  }, [])

  useEffect(() => {
    update()
    const el = scrollRef.current
    if (!el) {
      return
    }
    el.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    // Les puces arrivent avec la query équipes : le scrollWidth change sans que
    // la fenêtre bouge, d'où l'observer sur le conteneur lui-même.
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => {
      el.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
      observer.disconnect()
    }
  }, [update])

  const nudge = (dir: -1 | 1) => {
    scrollRef.current?.scrollBy({
      left: dir * scrollRef.current.clientWidth * 0.7,
      behavior: 'smooth',
    })
  }

  const leftStop = edges.left ? '18px' : '0'
  const rightStop = edges.right ? 'calc(100% - 18px)' : '100%'
  const maskImage = `linear-gradient(90deg, transparent 0, #000 ${leftStop}, #000 ${rightStop}, transparent 100%)`

  return (
    <div className="relative flex min-w-0 flex-1 items-center">
      <StripArrow
        direction="left"
        hidden={!edges.left}
        onClick={() => nudge(-1)}
      />
      <div
        ref={scrollRef}
        className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ maskImage, WebkitMaskImage: maskImage }}
      >
        {children}
      </div>
      <StripArrow
        direction="right"
        hidden={!edges.right}
        onClick={() => nudge(1)}
      />
    </div>
  )
}

function StripArrow({
  direction,
  hidden,
  onClick,
}: {
  direction: 'left' | 'right'
  hidden: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={
        direction === 'left' ? 'Équipes précédentes' : 'Équipes suivantes'
      }
      className={cn(
        'absolute z-[2] flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-card text-text-light/70 shadow-sm transition-opacity hover:text-text',
        direction === 'left' ? '-left-1' : '-right-1',
        hidden && 'pointer-events-none opacity-0',
      )}
    >
      {direction === 'left' ? (
        <ChevronLeft className="h-3 w-3" />
      ) : (
        <ChevronRight className="h-3 w-3" />
      )}
    </button>
  )
}

function TeamChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={cn(
        'shrink-0 cursor-pointer whitespace-nowrap rounded-full border px-2.5 py-1 text-[12px] font-semibold transition-colors',
        active
          ? 'border-amber-soft bg-primary/10 text-primary-dark'
          : 'border-transparent text-text-light hover:bg-muted hover:text-text',
      )}
      onClick={onClick}
    >
      {label}
    </button>
  )
}
