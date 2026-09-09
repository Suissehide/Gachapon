import type { DuelStatus } from '../../../../generated/client'

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
}
