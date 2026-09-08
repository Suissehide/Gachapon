import type { CardRarity } from '../constants/card.constant.ts'
import { apiUrl } from '../constants/config.constant.ts'
import { handleHttpError } from '../libs/httpErrorHandler.ts'
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
      handleHttpError(
        res,
        {
          403: {
            title: 'Accès refusé',
            message: 'Tu ne fais pas partie de cette équipe.',
          },
        },
        'Chargement du raid',
      )
    }
    return res.json()
  },

  attack: async (
    teamId: string,
    userCardIds: string[],
  ): Promise<RaidAttackResult> => {
    const res = await fetchWithAuth(`${apiUrl}/teams/${teamId}/raid/attack`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userCardIds }),
    })
    if (!res.ok) {
      handleHttpError(
        res,
        {
          409: {
            title: 'Boss vaincu',
            message:
              'Le boss est déjà à terre, rendez-vous la semaine prochaine.',
          },
          429: {
            title: "Plus d'attaque aujourd'hui",
            message: 'Reviens demain pour attaquer à nouveau.',
          },
        },
        'Attaque de raid',
      )
    }
    return res.json()
  },
}
