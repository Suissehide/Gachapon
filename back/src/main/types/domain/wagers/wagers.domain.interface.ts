import type {
  BetStatus,
  CardRarity,
  CardVariant,
  DuelStatus,
} from '../../../../generated/client'
import type { PrimaTransactionClient } from '../../infra/orm/client'

export type WagerUserMini = {
  id: string
  username: string
  avatar: string | null
}

export type DuelView = {
  id: string
  status: DuelStatus
  challenger: WagerUserMini
  opponent: WagerUserMini
  pullCount: number
  challengerPulls: number
  opponentPulls: number
  // Exprimés en points affichables : la colonne stocke des DEMI-points
  // (barème ×1,5 sur les brillantes), divisée par deux ici pour l'API.
  challengerScore: number
  opponentScore: number
  createdAt: string
  acceptedAt: string | null
  deadlineAt: string | null
  settledAt: string | null
  winnerId: string | null
  myRole: 'CHALLENGER' | 'OPPONENT' | 'SPECTATOR'
}

export type BetView = {
  id: string
  status: BetStatus
  bettor: WagerUserMini
  target: WagerUserMini
  stake: number
  minRarity: CardRarity
  pullWindow: number
  // Cote annoncée au parieur et figée au placement. Elle sert de PLAFOND au
  // règlement : si la cible améliore ses vraies chances entre-temps (achat
  // d'un boost), le paiement retombe sur une cote recalculée plus basse.
  multiplier: number
  createdAt: string
  deadlineAt: string
  settledAt: string | null
  pullsSeen: number
  payout: number
  myRole: 'BETTOR' | 'TARGET' | 'SPECTATOR'
}

/**
 * Devis affiché avant le placement. `probability` et `multiplier` sont
 * recalculés côté serveur au moment du POST : ce devis est indicatif, jamais
 * une valeur que le client pourrait renvoyer pour fixer sa propre cote.
 */
export type BetQuote = {
  multiplier: number
  probability: number
  pullWindow: number
  minStake: number
  maxStake: number
}

export type WagersView = {
  duels: DuelView[]
  settledDuels: DuelView[]
  bets: BetView[]
  settledBets: BetView[]
  // Cartes que MES duels ACTIVE verrouillent (voir DuelDomain#listEngagedCardKeysInTx) —
  // signale au joueur, avant qu'il ne tente un recyclage, pourquoi il serait refusé.
  engagedCardIds: string[]
}

export interface IDuelDomain {
  propose(
    teamId: string,
    challengerId: string,
    opponentId: string,
    now?: Date,
  ): Promise<DuelView>
  accept(
    teamId: string,
    duelId: string,
    userId: string,
    now?: Date,
  ): Promise<DuelView>
  decline(teamId: string, duelId: string, userId: string): Promise<DuelView>
  cancel(teamId: string, duelId: string, userId: string): Promise<DuelView>
  listForTeam(
    teamId: string,
    userId: string,
    now?: Date,
  ): Promise<WagersView>
  settleForUser(userId: string, now?: Date): Promise<void>
  /**
   * Règle TOUS les duels et paris ACTIVE de l'équipe, pas seulement ceux
   * dont l'échéance est passée. Appelé avant de fermer une équipe : le
   * règlement étant paresseux, un enjeu dont l'issue est déjà déterminée
   * peut dormir en ACTIVE, et le rembourser ou l'annuler en l'état
   * fausserait le résultat (voir `DuelDomain#settleTeamWagers`).
   */
  settleTeamWagers(teamId: string, now?: Date): Promise<void>
  /**
   * Clés `${cardId}:${variant}` des cartes que les tirages comptés (au sens
   * de `findPullsSinceInTx`) de tous les duels ACTIVE du joueur verrouillent.
   * Utilisé à la fois pour peupler `WagersView#engagedCardIds` et par les
   * quatre chemins de retrait de carte (recyclage unitaire/masse, conversion
   * en poussière, ascension) pour refuser ou ignorer une carte engagée.
   */
  listEngagedCardKeysInTx(
    tx: PrimaTransactionClient,
    userId: string,
  ): Promise<Set<string>>
  /** Lève `Boom.conflict` si `${cardId}:${variant}` est engagée dans un duel ACTIVE du joueur. */
  assertCardNotEngagedInTx(
    tx: PrimaTransactionClient,
    userId: string,
    cardId: string,
    variant: CardVariant,
  ): Promise<void>
}

export interface IBetDomain {
  /** Cote indicative pour un pari du parieur sur la cible, à la rareté visée. */
  quote(
    teamId: string,
    bettorId: string,
    targetId: string,
    minRarity: CardRarity,
  ): Promise<BetQuote>
  /**
   * Place le pari. La cote est RECALCULÉE ici, jamais reprise d'un devis
   * transmis par le client.
   */
  place(
    teamId: string,
    bettorId: string,
    targetId: string,
    minRarity: CardRarity,
    stake: number,
    now?: Date,
  ): Promise<BetView>
  /**
   * Règle tous les paris ACTIVE portant sur cette CIBLE — déclenché après
   * chaque tirage de la cible. Aucun état de progression n'est stocké : les
   * tirages sont relus et le verdict recalculé à chaque appel.
   */
  settleForUser(targetId: string, now?: Date): Promise<void>
  /**
   * Règle UN pari nommément, quel que soit le chemin qui l'a repéré. Sert au
   * règlement paresseux à la lecture (`DuelDomain#listForTeam`), où l'on
   * connaît l'identifiant du pari périmé mais pas forcément une cible qui
   * tirera encore un jour — sans lui, un pari dont la cible a cessé de jouer
   * ne serait jamais remboursé.
   */
  settleBet(betId: string, now?: Date): Promise<void>
}
