import type { CardRarity } from '../constants/card.constant.ts'
import { apiUrl } from '../constants/config.constant.ts'
import i18n from '../i18n/index.ts'
import { handleHttpErrorFromServer } from '../libs/httpErrorHandler.ts'
import type { BattleLogEntry, SimulatorUnit } from './combat.api.ts'
import { fetchWithAuth } from './fetchWithAuth.ts'
import type { TowerElement } from './tower.api.ts'

export type RaidRewardView = {
  tokens: number
  dust: number
  gold: number
  xp: number
  cardRarity: CardRarity | null
}

export type RaidTierView = {
  pct: number
  reached: boolean
  reward: RaidRewardView
}

export type RaidContribution = {
  user: { id: string; username: string; avatar: string | null }
  damage: number
  attacks: number
}

export type RaidView = {
  id: string
  weekKey: string
  endsAt: string
  boss: {
    name: string
    element: TowerElement
    imageUrl: string | null
    power: number
  }
  maxHp: number
  hp: number
  damageDone: number
  memberCountAtStart: number
  killedAt: string | null
  tiers: RaidTierView[]
  me: {
    attacksPerDay: number
    attacksRemainingToday: number
    damage: number
    attacks: number
  }
  contributions: RaidContribution[]
}

export type RaidAttackResult = {
  log: BattleLogEntry[]
  teamA: SimulatorUnit[]
  teamB: SimulatorUnit[]
  damage: number
  hpBefore: number
  hpAfter: number
  maxHp: number
  killed: boolean
  newTiers: RaidTierView[]
  attacksRemainingToday: number
}

export const RaidApi = {
  getRaid: async (teamId: string): Promise<RaidView> => {
    const res = await fetchWithAuth(`${apiUrl}/teams/${teamId}/raid`)
    if (!res.ok) {
      // 403 : `team.notMember` du catalogue back (le bannissement du
      // limiteur de débit, seule autre source possible d'un 403, n'est pas
      // activé — voir rate-limit.plugin.ts).
      await handleHttpErrorFromServer(
        res,
        { 403: i18n.t('team:apiTitles.accessDenied') },
        i18n.t('team:apiTitles.operations.loadRaid'),
      )
    }
    return res.json()
  },

  attack: async (teamId: string): Promise<RaidAttackResult> => {
    const res = await fetchWithAuth(`${apiUrl}/teams/${teamId}/raid/attack`, {
      method: 'POST',
    })
    if (!res.ok) {
      // 409 : `raid.bossAlreadyDefeated`, seule source de ce statut.
      // 429 : partagé avec le limiteur de débit GLOBAL, dont le message est
      // anglais — le front garde le sien.
      await handleHttpErrorFromServer(
        res,
        {
          409: i18n.t('team:apiTitles.raidBossDefeated'),
          429: {
            title: i18n.t('team:apiTitles.raidNoAttacksLeft'),
            message: i18n.t('team:apiTitles.raidComeBackTomorrowMessage'),
          },
        },
        i18n.t('team:apiTitles.operations.raidAttack'),
      )
    }
    return res.json()
  },
}
