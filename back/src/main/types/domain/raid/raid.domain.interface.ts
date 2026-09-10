import type { CardRarity } from '../../../../generated/client'
import type {
  LogEntry,
  SimulatorUnit,
} from '../../../domain/combat/battle-simulator.domain'
import type { TowerElement } from '../../../domain/tower/tower-slots'
import type { TeamWithMembers } from '../team/team.types'

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

/** Le raid en cours d'une équipe, réduit à ce qu'une liste affiche. */
export type RaidTeamBadge = {
  bossName: string
  pct: number
}

/** Une semaine révolue, pour la bande d'historique de la fiche d'équipe. */
export type RaidHistoryEntry = {
  /** Lundi de la semaine, AAAA-MM-JJ (UTC). */
  weekKey: string
  /** ISO 8601 — lundi suivant 00:00 UTC, la fin de cette semaine-là. */
  endsAt: string
  bossName: string
  bossElement: TowerElement
  maxHp: number
  damage: number
  /** Entier 0..100, plancher : un boss encore debout n'affiche jamais 100. */
  pct: number
  killedAt: string | null
}

export type RaidMemberStats = {
  userId: string
  damage: number
  /** Attaques portées sur le raid EN COURS. */
  attacks: number
  /** Attaques restantes aujourd'hui — quota GLOBAL au joueur. */
  attacksRemainingToday: number
}

export type RaidMemberStatsView = {
  attacksPerDay: number
  members: RaidMemberStats[]
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
  /**
   * Le raid en cours de plusieurs équipes, indexé par `teamId`. NE CRÉE
   * RIEN : une équipe sans raid cette semaine est absente de la Map.
   */
  currentRaidBadges(
    teamIds: string[],
    now?: Date,
  ): Promise<Map<string, RaidTeamBadge>>
  /** Les `limit` semaines révolues, plus récentes d'abord. */
  getHistory(
    teamId: string,
    limit: number,
    now?: Date,
  ): Promise<RaidHistoryEntry[]>
  countRaidsWon(teamId: string): Promise<number>
  /**
   * Dégâts et attaques restantes de chaque membre sur le raid en cours,
   * bâtis sur la MÊME agrégation que la vue de raid.
   */
  memberRaidStats(
    team: TeamWithMembers,
    now?: Date,
  ): Promise<RaidMemberStatsView>
  attack(
    teamId: string,
    userId: string,
    userCardIds: string[],
    now?: Date,
  ): Promise<RaidAttackResult>
}
