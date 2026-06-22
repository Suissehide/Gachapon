import { useEffect, useMemo, useRef, useState } from 'react'

const LIVE_ENTRIES_CAP = 50
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'

import { GachaApi } from '../api/gacha.api'
import { TeamsApi } from '../api/teams.api'
import { wsClient } from '../lib/ws'
import type { FeedEntry } from '../types/feed'

export type { FeedEntry }

const LIMIT = 20

export function useLiveFeed(opts?: { teamId?: string; rarities?: string[] }) {
  const teamId = opts?.teamId
  const rarities = opts?.rarities
  const raritiesKey =
    rarities && rarities.length > 0 ? rarities.join(',') : ''
  const [liveEntries, setLiveEntries] = useState<FeedEntry[]>([])

  // Réinitialiser les entrées live quand le filtre change
  useEffect(() => {
    setLiveEntries([])
  }, [teamId, raritiesKey])

  // Stable ref so the WS subscription doesn't re-bind on every render just
  // because the rarities array reference changes.
  const raritiesSetRef = useRef<Set<string> | null>(null)
  raritiesSetRef.current =
    rarities && rarities.length > 0 ? new Set(rarities) : null

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['pulls', 'recent', teamId ?? 'global', raritiesKey],
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      GachaApi.getRecentPulls({
        limit: LIMIT,
        before: pageParam,
        teamId,
        rarities,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.entries[lastPage.entries.length - 1]?.pulledAt : undefined,
    staleTime: 60_000,
  })

  // Membres de la team pour filtrer les events WS
  const { data: teamData } = useQuery({
    queryKey: ['team', teamId],
    queryFn: () => TeamsApi.getTeam(teamId!),
    enabled: !!teamId,
    staleTime: 5 * 60_000,
  })

  const teamUsernames = useMemo(
    () =>
      teamId
        ? new Set(teamData?.members.map((m) => m.user.username) ?? [])
        : null,
    [teamId, teamData],
  )

  // Ref pour accéder à teamUsernames sans re-souscrire au WS
  const teamUsernamesRef = useRef<Set<string> | null>(null)
  teamUsernamesRef.current = teamUsernames

  const teamDataLoadedRef = useRef(false)
  teamDataLoadedRef.current = !!teamData

  useEffect(() => {
    return wsClient.on((event) => {
      if (event.type !== 'feed:pull') return
      const names = teamUsernamesRef.current
      // Si filtre actif et membres chargés : exclure les non-membres
      if (names !== null && (!teamDataLoadedRef.current || !names.has(event.username))) return
      // Si filtre par rareté actif : exclure les autres raretés
      const allowedRarities = raritiesSetRef.current
      if (allowedRarities !== null && !allowedRarities.has(event.rarity)) return
      const entry: FeedEntry = {
        username: event.username,
        cardName: event.cardName,
        rarity: event.rarity,
        variant: event.variant,
        cardId: event.cardId,
        imageUrl: event.imageUrl,
        setName: event.setName,
        pulledAt: event.pulledAt,
      }
      setLiveEntries((prev) => [entry, ...prev].slice(0, LIVE_ENTRIES_CAP))
    })
  }, [])

  const historicalEntries = data?.pages.flatMap((p) => p.entries) ?? []
  const seen = new Set<string>()
  const entries = [...liveEntries, ...historicalEntries].filter((e) => {
    const key = `${e.username}-${e.cardId}-${e.pulledAt}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return { entries, fetchNextPage, hasNextPage, isFetchingNextPage }
}
