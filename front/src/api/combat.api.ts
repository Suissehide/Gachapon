import { apiUrl } from '../constants/config.constant.ts'
import { handleHttpError } from '../libs/httpErrorHandler.ts'
import { fetchWithAuth } from './fetchWithAuth.ts'

export type TeamUnit = {
  userCardId: string
  cardId: string
  cardName: string
  cardImageUrl: string | null
  element: string | null
  rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'
  variant: 'NORMAL' | 'BRILLIANT' | 'HOLOGRAPHIC'
  level: number
  palier: number
  passiveKey: string | null
  passiveLabel: string | null
  stats: { hp: number; atk: number; def: number; spd: number }
}

export type CombatTeamView = { team: TeamUnit[]; inherited: boolean }

export type AttackPattern =
  | 'BASIC'
  | 'AOE_3'
  | 'MULTI_2'
  | 'MONO_AMPLIFIED'
  | 'MONO_DOUBLE'

export type SimulatorUnit = {
  id: string
  name?: string
  imageUrl?: string | null
  /** Card rarity for ally units (ennemis = undefined → rose placeholder). */
  rarity?: string | null
  variant?: string | null
  setName?: string | null
  level?: number | null
  hp: number
  atk: number
  def: number
  spd: number
  attackPattern: AttackPattern
  passiveKey: string | null
  /** Élément du domaine (FIRE/WATER/NATURE/EARTH/LIGHT/DARK) ; null = neutre. */
  element?: string | null
  palier: number
}

export type BattleLogEntry = Record<string, unknown> & { type: string }

export type DebugBattleResult = {
  won: 'A' | 'B' | null
  log: BattleLogEntry[]
  turns: number
}

export type CombatPointsView = {
  combatPoints: number
  maxStock: number
  regenSeconds: number
  battleCost: number
  sweepCost: number
  nextCombatPointAt: string | null
}

export const CombatApi = {
  getPoints: async (): Promise<CombatPointsView> => {
    const res = await fetchWithAuth(`${apiUrl}/combat/points`)
    if (!res.ok) {
      handleHttpError(res, {}, 'Erreur lors du chargement des points de combat')
    }
    return res.json()
  },

  getTeam: async (key: string): Promise<CombatTeamView> => {
    const res = await fetchWithAuth(
      `${apiUrl}/combat/teams/${encodeURIComponent(key)}`,
    )
    if (!res.ok) {
      handleHttpError(res, {}, "Erreur lors du chargement de l'équipe")
    }
    return res.json()
  },

  getAllTeams: async (): Promise<{ teams: Record<string, CombatTeamView> }> => {
    const res = await fetchWithAuth(`${apiUrl}/combat/teams`)
    if (!res.ok) {
      handleHttpError(res, {}, 'Erreur lors du chargement des équipes')
    }
    return res.json()
  },

  setTeam: async (
    key: string,
    userCardIds: string[],
  ): Promise<CombatTeamView> => {
    const res = await fetchWithAuth(
      `${apiUrl}/combat/teams/${encodeURIComponent(key)}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userCardIds }),
      },
    )
    if (!res.ok) {
      handleHttpError(res, {}, "Erreur lors de l'enregistrement de l'équipe")
    }
    return res.json()
  },

  clearTeam: async (key: string): Promise<void> => {
    const res = await fetchWithAuth(
      `${apiUrl}/combat/teams/${encodeURIComponent(key)}`,
      { method: 'DELETE' },
    )
    if (!res.ok) {
      handleHttpError(res, {}, 'Erreur lors du retour à l’équipe de campagne')
    }
  },

  debugBattle: async (input: {
    teamA: SimulatorUnit[]
    teamB: SimulatorUnit[]
    seed: string
    timeoutTurns?: number
  }): Promise<DebugBattleResult> => {
    const res = await fetchWithAuth(`${apiUrl}/combat/debug/battle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!res.ok) {
      handleHttpError(res, {}, 'Erreur lors de la simulation de combat')
    }
    return res.json()
  },
}
