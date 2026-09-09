import type {
  Bet,
  BetStatus,
  CardRarity,
  CardVariant,
  Duel,
  DuelTransfer,
} from '../../../../../generated/client'
import type { PrimaTransactionClient } from '../client'

export type PullWithRarity = {
  cardId: string
  variant: CardVariant
  rarity: CardRarity
  pulledAt: Date
}

export type DuelWithParties = Duel & {
  challenger: { id: string; username: string; avatar: string | null }
  opponent: { id: string; username: string; avatar: string | null }
}

export type BetWithParties = Bet & {
  bettor: { id: string; username: string; avatar: string | null }
  target: { id: string; username: string; avatar: string | null }
}

export interface IWagerRepository {
  /** Les `take` premiers tirages du joueur postérieurs à `since`, du plus ancien au plus récent, avec la rareté de la carte. */
  findPullsSince(
    userId: string,
    since: Date,
    take: number,
  ): Promise<PullWithRarity[]>
  findPullsSinceInTx(
    tx: PrimaTransactionClient,
    userId: string,
    since: Date,
    take: number,
  ): Promise<PullWithRarity[]>
  /** Duel PENDING ou ACTIVE où le joueur est partie, ou null. Sert au « un duel à la fois ». */
  findOpenDuelForUser(userId: string): Promise<Duel | null>
  findDuelById(id: string): Promise<DuelWithParties | null>
  listTeamDuels(teamId: string): Promise<DuelWithParties[]>
  listRecentSettledDuels(
    teamId: string,
    take: number,
  ): Promise<DuelWithParties[]>
  listActiveDuelsForUser(userId: string): Promise<Duel[]>
  listActiveDuelsForUserInTx(
    tx: PrimaTransactionClient,
    userId: string,
  ): Promise<Duel[]>
  createDuel(data: {
    teamId: string
    challengerId: string
    opponentId: string
    pullCount: number
  }): Promise<Duel>
  listTransfers(duelId: string): Promise<DuelTransfer[]>
  /** Paris de l'équipe, filtrés par statut côté SQL quand `statuses` est fourni. */
  listTeamBets(
    teamId: string,
    statuses?: BetStatus[],
  ): Promise<BetWithParties[]>
  listRecentSettledBets(teamId: string, take: number): Promise<BetWithParties[]>
  listActiveBetsForTarget(targetId: string): Promise<Bet[]>
  /**
   * Paris ouverts du parieur, relus DANS la transaction : seule version
   * exposée. Un compte lu hors transaction laisserait deux placements
   * simultanés franchir le même plafond.
   */
  countOpenBetsByBettorInTx(
    tx: PrimaTransactionClient,
    bettorId: string,
  ): Promise<number>
  countOpenBetsOnTargetInTx(
    tx: PrimaTransactionClient,
    targetId: string,
  ): Promise<number>
  createBet(data: {
    teamId: string
    bettorId: string
    targetId: string
    stake: number
    minRarity: CardRarity
    pullWindow: number
    multiplier: number
    deadlineAt: Date
  }): Promise<Bet>
  /** Duels et paris dont l'échéance est passée — alimente le règlement paresseux à la lecture. */
  listStaleForTeam(
    teamId: string,
    now: Date,
  ): Promise<{ duelIds: string[]; betIds: string[] }>
}
