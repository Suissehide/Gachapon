import { apiUrl } from '../constants/config.constant.ts'
import { handleHttpError } from '../libs/httpErrorHandler.ts'
import { fetchWithAuth } from './fetchWithAuth.ts'

export type WagerUserMini = {
  id: string
  username: string
  avatar: string | null
}

export type DuelStatus =
  | 'PENDING'
  | 'ACTIVE'
  | 'SETTLED'
  | 'EXPIRED'
  | 'DECLINED'
  | 'CANCELLED'

export type DuelView = {
  id: string
  status: DuelStatus
  challenger: WagerUserMini
  opponent: WagerUserMini
  pullCount: number
  challengerPulls: number
  opponentPulls: number
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
  engagedCardIds: string[]
}

const DUEL_ALREADY_IN_PROGRESS = {
  403: {
    title: 'Accès refusé',
    message: 'Tu ne fais pas partie de cette équipe.',
  },
  409: {
    title: 'Duel en cours',
    message: 'Tu as déjà un duel en cours.',
  },
  400: {
    title: 'Adversaire invalide',
    message: "Cet adversaire ne fait pas partie de l'équipe.",
  },
}

export const WagersApi = {
  getWagers: async (teamId: string): Promise<WagersView> => {
    const res = await fetchWithAuth(`${apiUrl}/teams/${teamId}/wagers`)
    if (!res.ok) {
      handleHttpError(
        res,
        {
          403: {
            title: 'Accès refusé',
            message: 'Tu ne fais pas partie de cette équipe.',
          },
        },
        'Chargement des duels',
      )
    }
    return res.json()
  },

  proposeDuel: async (
    teamId: string,
    opponentId: string,
  ): Promise<DuelView> => {
    const res = await fetchWithAuth(`${apiUrl}/teams/${teamId}/duels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ opponentId }),
    })
    if (!res.ok) {
      handleHttpError(res, DUEL_ALREADY_IN_PROGRESS, 'Proposition de duel')
    }
    return res.json()
  },

  acceptDuel: async (teamId: string, duelId: string): Promise<DuelView> => {
    const res = await fetchWithAuth(
      `${apiUrl}/teams/${teamId}/duels/${duelId}/accept`,
      { method: 'POST' },
    )
    if (!res.ok) {
      handleHttpError(
        res,
        {
          403: {
            title: 'Accès refusé',
            message: 'Tu ne fais pas partie de cette équipe.',
          },
          409: {
            title: 'Duel expiré',
            message: "Ce duel n'est plus en attente d'acceptation.",
          },
        },
        'Acceptation du duel',
      )
    }
    return res.json()
  },

  declineDuel: async (teamId: string, duelId: string): Promise<DuelView> => {
    const res = await fetchWithAuth(
      `${apiUrl}/teams/${teamId}/duels/${duelId}/decline`,
      { method: 'POST' },
    )
    if (!res.ok) {
      handleHttpError(
        res,
        {
          403: {
            title: 'Accès refusé',
            message: 'Tu ne fais pas partie de cette équipe.',
          },
          409: {
            title: 'Duel expiré',
            message: "Ce duel n'est plus en attente d'acceptation.",
          },
        },
        'Refus du duel',
      )
    }
    return res.json()
  },

  cancelDuel: async (teamId: string, duelId: string): Promise<DuelView> => {
    const res = await fetchWithAuth(
      `${apiUrl}/teams/${teamId}/duels/${duelId}/cancel`,
      { method: 'POST' },
    )
    if (!res.ok) {
      handleHttpError(
        res,
        {
          403: {
            title: 'Accès refusé',
            message: 'Tu ne fais pas partie de cette équipe.',
          },
          409: {
            title: 'Duel expiré',
            message: "Ce duel n'est plus en attente d'acceptation.",
          },
        },
        'Annulation du duel',
      )
    }
    return res.json()
  },
}
