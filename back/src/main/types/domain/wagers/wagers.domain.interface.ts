import type { CardVariant, DuelStatus } from '../../../../generated/client'
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

export type WagersView = {
  duels: DuelView[]
  settledDuels: DuelView[]
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
