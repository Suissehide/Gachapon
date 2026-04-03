import { useQuery } from '@tanstack/react-query'
import { PanelRightClose, PanelRightOpen } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { TeamsApi } from '../../api/teams.api'
import { useLiveFeed } from '../../hooks/useLiveFeed'
import { Button } from '../ui/button'
import { Select } from '../ui/input'
import { FeedEntryRow } from './FeedEntry'

type Tab = 'global' | 'team'

export function LiveFeed() {
  const [visible, setVisible] = useState(true)
  const [tab, setTab] = useState<Tab>('global')
  const [selectedTeamId, setSelectedTeamId] = useState<string | undefined>()
  const sentinelRef = useRef<HTMLDivElement>(null)

  const { data: teamsData } = useQuery({
    queryKey: ['teams'],
    queryFn: TeamsApi.getMyTeams,
    staleTime: 5 * 60_000,
  })
  const teams = teamsData?.teams ?? []

  // Sélectionner la première team au chargement
  useEffect(() => {
    if (teams.length > 0 && !selectedTeamId) {
      setSelectedTeamId(teams[0]?.id)
    }
  }, [teams, selectedTeamId])

  const teamId = tab === 'team' ? selectedTeamId : undefined
  const { entries, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useLiveFeed({ teamId })

  // IntersectionObserver — charge la page suivante quand le sentinel est visible
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
    <div className="fixed right-3 top-20 bottom-4 z-20 flex flex-col items-end gap-2 pointer-events-none">
      <Button
        variant="outline"
        size="icon-sm"
        className="pointer-events-auto shrink-0"
        onClick={() => setVisible((v) => !v)}
        title={visible ? 'Cacher le feed' : 'Afficher le feed'}
      >
        {visible ? <PanelRightClose size={13} /> : <PanelRightOpen size={13} />}
      </Button>

      {visible && (
        <div className="pointer-events-auto w-52 flex-1 min-h-0 flex flex-col rounded-xl overflow-hidden bg-white/80 backdrop-blur-sm border border-border shadow-sm animate-in fade-in slide-in-from-top-1 duration-200">
          {/* Header */}
          <div className="shrink-0 border-b border-border">
            {/* Titre */}
            <div className="flex items-center gap-2 px-3 py-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse shrink-0" />
              <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-text-light">
                Tirages récents
              </span>
            </div>

            {/* Onglets — uniquement si l'utilisateur appartient à au moins une team */}
            {teams.length > 0 && (
              <>
                <div className="flex border-t border-border">
                  <button
                    type="button"
                    className={`cursor-pointer flex-1 py-1.5 text-[8px] font-bold uppercase tracking-[0.18em] transition-colors ${
                      tab === 'global'
                        ? 'border-b-2 border-text text-text'
                        : 'text-text-light/50 hover:text-text-light'
                    }`}
                    onClick={() => setTab('global')}
                  >
                    Tous
                  </button>
                  <button
                    type="button"
                    className={`cursor-pointer flex-1 py-1.5 text-[8px] font-bold uppercase tracking-[0.18em] transition-colors ${
                      tab === 'team'
                        ? 'border-b-2 border-text text-text'
                        : 'text-text-light/50 hover:text-text-light'
                    }`}
                    onClick={() => setTab('team')}
                  >
                    Équipe
                  </button>
                </div>

                {tab === 'team' && (
                  <div className="px-2.5 py-1.5 border-t border-border">
                    <Select
                      id="live-feed-team-select"
                      options={teams.map((t) => ({
                        value: t.id,
                        label: t.name,
                      }))}
                      value={selectedTeamId ?? ''}
                      onValueChange={(v) => setSelectedTeamId(v || undefined)}
                      clearable={false}
                      className="h-7 text-[9px]"
                    />
                  </div>
                )}
              </>
            )}
          </div>

          {/* Feed */}
          <div className="flex-1 min-h-0 overflow-y-auto flex flex-col py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {entries.length === 0 ? (
              <p className="px-3 py-3 text-[10px] text-text-light/50 italic">
                Aucun tirage récent…
              </p>
            ) : (
              entries.map((entry, i) => (
                <FeedEntryRow
                  key={`${entry.username}-${entry.cardId}-${entry.pulledAt}`}
                  entry={entry}
                  index={i}
                />
              ))
            )}

            {/* Sentinel pour l'infinite scroll */}
            <div ref={sentinelRef} className="h-1 shrink-0" />

            {isFetchingNextPage && (
              <div className="flex justify-center py-2">
                <div className="h-3 w-3 rounded-full border border-text-light/30 border-t-text-light animate-spin" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
