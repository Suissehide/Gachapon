import {
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
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

/** Drop every persisted battle result from sessionStorage. */
function clearCachedBattles(): void {
  try {
    const keys: string[] = []
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)
      if (key?.startsWith(BATTLE_STORAGE_PREFIX)) {
        keys.push(key)
      }
    }
    for (const key of keys) {
      sessionStorage.removeItem(key)
    }
  } catch {
    // sessionStorage blocked — nothing to clear.
  }
}

/**
 * Invalidate every cached battle — both the sessionStorage replay cache (keyed
 * only by stageId) and react-query's own ['battle',*] entries. Call this from
 * any mutation that changes a battle's outcome (team swap, card level-up/ascend,
 * equip/unequip) so a later navigation back to /battle/$id fires a *fresh*
 * battle instead of replaying one fought with the previous stats. Without it the
 * cache would replay a stale battle even after the player strengthened their
 * cards.
 */
export function invalidateBattleCache(qc: QueryClient): void {
  clearCachedBattles()
  qc.removeQueries({ queryKey: ['battle'] })
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

  // Invalidate sibling caches every time a battle *fetch resolves* — success or
  // error. We key off dataUpdatedAt/errorUpdatedAt (which bump once per completed
  // fetch) rather than isSuccess/isError: `refetch()` (the "Rejouer"/"Réessayer"
  // button) keeps status === 'success' throughout, so a transition-into-settled
  // guard would fire only on the first battle and leave combat points, rewards
  // and campaign progress stale on every retry. A result hydrated from
  // sessionStorage has updatedAt === 0, so the page-refresh replay stays inert
  // (no phantom re-invalidation for a battle that wasn't actually re-fought).
  const lastSettledAtRef = useRef(0)
  useEffect(() => {
    const settledAt = Math.max(query.dataUpdatedAt, query.errorUpdatedAt)
    if (settledAt === 0 || settledAt === lastSettledAtRef.current) {
      return
    }
    lastSettledAtRef.current = settledAt
    qc.invalidateQueries({ queryKey: CAMPAIGN_KEY })
    qc.invalidateQueries({ queryKey: ['combat', 'points'] })
    qc.invalidateQueries({ queryKey: ['equipment'] })
    qc.invalidateQueries({ queryKey: ['collection'] })
    qc.invalidateQueries({ queryKey: ['profile'] })
    // A cleared stage fires STAGE_CLEARED (+ LEVEL_UP) events that feed the
    // quest + achievement engines — refresh their progress.
    qc.invalidateQueries({ queryKey: ['quests'] })
    qc.invalidateQueries({ queryKey: ['achievements'] })
    // Gold/dust live in the Zustand auth store (topbar + upgrade panel read
    // from it), not in a query cache. We do NOT refresh it here: the battle
    // fetch resolves several seconds before the scene animation finishes and
    // the result popup slides in, so a refresh on settle would flash the new
    // gold in the topbar before the victory popup appears. The battle page
    // refreshes the store when it reveals the result popup instead.
  }, [query.dataUpdatedAt, query.errorUpdatedAt, qc])

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
      // Sweeping clears stages → STAGE_CLEARED (+ LEVEL_UP) events feed the
      // quest + achievement engines — refresh their progress.
      qc.invalidateQueries({ queryKey: ['quests'] })
      qc.invalidateQueries({ queryKey: ['achievements'] })
      // Refresh gold/dust in the auth store (see useAttackStage note).
      void useAuthStore.getState().fetchMe()
    },
  })
}
