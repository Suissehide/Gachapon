import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'

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
          <span className="mr-1 font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-text-light/60">
            Équipe
          </span>
          {teams.length <= MAX_TEAM_CHIPS ? (
            <>
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
            </>
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
        'cursor-pointer rounded-full border px-2.5 py-1 text-[12px] font-semibold transition-colors',
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
