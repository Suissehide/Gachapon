import type { CardRarity } from '../../../../generated/client'
import type {
  LogEntry,
  SimulatorUnit,
} from '../../../domain/combat/battle-simulator.domain'
import type { TowerElement } from '../../../domain/tower/tower-slots'

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

export type RaidUserMini = {
  id: string
  username: string
  avatar: string | null
}

export type RaidContribution = {
  user: RaidUserMini
  damage: number
  attacks: number
}

export type RaidView = {
  id: string
  weekKey: string
  /** ISO 8601 — lundi suivant 00:00 UTC. */
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
  log: LogEntry[]
  teamA: SimulatorUnit[]
  teamB: SimulatorUnit[]
  damage: number
  hpBefore: number
  hpAfter: number
  maxHp: number
  killed: boolean
  /** Paliers franchis PAR CETTE attaque (pour l'écran de résultat). */
  newTiers: RaidTierView[]
  attacksRemainingToday: number
}

export interface IRaidDomain {
  getRaid(teamId: string, userId: string, now?: Date): Promise<RaidView>
  getContributions(teamId: string, userId: string): Promise<RaidContribution[]>
  attack(
    teamId: string,
    userId: string,
    userCardIds: string[],
    now?: Date,
  ): Promise<RaidAttackResult>
}
