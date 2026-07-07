import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef } from 'react'

import { type BattleResult, CampaignApi } from '../api/campaign.api.ts'
import { useAuthStore } from '../stores/auth.store.ts'

const CAMPAIGN_KEY = ['campaign']

export function useCampaign() {
  return useQuery({
    queryKey: CAMPAIGN_KEY,
    queryFn: CampaignApi.get,
  })
}

/**
 * Auto-fires a battle for the given stage. Uses useQuery (not useMutation) so
 * React 19 StrictMode's mount → unmount → mount cycle in dev cannot bill the
 * user twice — both mounts subscribe to the same in-flight request keyed by
 * stageId, and the result lands once.
 *
 * The last result is also persisted in `sessionStorage` so a full page refresh
 * on /battle/$id replays the same battle instead of consuming another combat
 * point. `refetch()` (called by "Rejouer") always overrides the cached copy.
 *
 * - `staleTime: Infinity` + `refetchOnWindowFocus: false` keep the battle from
 *   being re-fired by focus events or stale-time expiry.
 * - `gcTime: 1000` removes the cached result shortly after the page leaves —
 *   longer than StrictMode's quick remount but short enough that a real
 *   navigate-away → navigate-back fires a new battle.
 * - `retry: false` so we don't quietly bill PC twice on network blips.
 */
const BATTLE_STORAGE_PREFIX = 'battle-result:'

function readCachedBattle(stageId: string): BattleResult | null {
  try {
    const raw = sessionStorage.getItem(BATTLE_STORAGE_PREFIX + stageId)
    return raw ? (JSON.parse(raw) as BattleResult) : null
  } catch {
    return null
  }
}

function writeCachedBattle(stageId: string, result: BattleResult): void {
  try {
    sessionStorage.setItem(
      BATTLE_STORAGE_PREFIX + stageId,
      JSON.stringify(result),
    )
  } catch {
    // sessionStorage full or blocked — silently skip; page still works.
  }
}

export function useAttackStage(stageId: string, enabled: boolean) {
  const qc = useQueryClient()
  const cached = useMemo(() => readCachedBattle(stageId), [stageId])

  const query = useQuery({
    queryKey: ['battle', stageId],
    queryFn: () => CampaignApi.battle(stageId),
    // If we hydrated a result from sessionStorage, seed react-query with it so
    // the query starts satisfied and no new battle is fired on mount.
    initialData: cached ?? undefined,
    enabled,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  })

  // Persist every fresh success to sessionStorage so a page refresh replays
  // the same result instead of firing a new battle.
  useEffect(() => {
    if (query.isSuccess && query.data) {
      writeCachedBattle(stageId, query.data)
    }
  }, [query.isSuccess, query.data, stageId])

  // Invalidate sibling caches once the battle settles (success or error). A
  // ref guard so we only invalidate on the *transition* into settled.
  const settledRef = useRef(false)
  useEffect(() => {
    if (!query.isSuccess && !query.isError) {
      settledRef.current = false
      return
    }
    if (settledRef.current) {
      return
    }
    settledRef.current = true
    qc.invalidateQueries({ queryKey: CAMPAIGN_KEY })
    qc.invalidateQueries({ queryKey: ['combat', 'points'] })
    qc.invalidateQueries({ queryKey: ['equipment'] })
    qc.invalidateQueries({ queryKey: ['collection'] })
    qc.invalidateQueries({ queryKey: ['profile'] })
    // Gold/dust live in the Zustand auth store (topbar + upgrade panel read
    // from it), not in a query cache — refresh it so battle rewards show up
    // without a manual page reload.
    void useAuthStore.getState().fetchMe()
  }, [query.isSuccess, query.isError, qc])

  return query
}

export function useSweepStage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ stageId, runs }: { stageId: string; runs: number }) =>
      CampaignApi.sweep(stageId, runs),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: CAMPAIGN_KEY })
      qc.invalidateQueries({ queryKey: ['combat', 'points'] })
      qc.invalidateQueries({ queryKey: ['equipment'] })
      qc.invalidateQueries({ queryKey: ['collection'] })
      qc.invalidateQueries({ queryKey: ['profile'] })
      // Refresh gold/dust in the auth store (see useAttackStage note).
      void useAuthStore.getState().fetchMe()
    },
  })
}
