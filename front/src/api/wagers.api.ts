import type { CardRarity } from '../constants/card.constant.ts'
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
  /**
   * Cartes effectivement raflees au reglement, 0 partout ailleurs. C'est la
   * seule trace DURABLE du butin : l'evenement WebSocket `duel:settled` le
   * porte au moment du reglement, puis il disparait — l'historique regle, lu
   * apres un rechargement, n'a que ce champ.
   */
  transferredCount: number
  myRole: 'CHALLENGER' | 'OPPONENT' | 'SPECTATOR'
}

/**
 * Un défi en attente de MA réponse, tel que `GET /me/duels` le sert à la
 * pastille de notification. Croisé champ par champ avec
 * `myPendingDuelsResponseSchema` (back/…/schemas/wagers.schema.ts) : le
 * provider Zod retire silencieusement du JSON toute clé absente de là-bas,
 * et rien ici ne prévient d'un champ renommé côté serveur.
 */
export type PendingDuelView = {
  id: string
  teamId: string
  team: { id: string; name: string; slug: string; avatar: string | null }
  challenger: WagerUserMini
  pullCount: number
  createdAt: string
  expiresAt: string
}

/**
 * Un pari en cours placé SUR moi, tel que `GET /me/bets` le sert à la
 * pastille. Croisé champ par champ avec `myTargetedBetsResponseSchema`
 * (back/…/schemas/wagers.schema.ts) : le provider Zod retire silencieusement
 * du JSON toute clé absente de là-bas, et rien ici ne prévient d'un champ
 * renommé côté serveur.
 */
export type TargetedBetView = {
  id: string
  teamId: string
  team: { id: string; name: string; slug: string; avatar: string | null }
  bettor: WagerUserMini
  minRarity: CardRarity
  stake: number
  multiplier: number
  pullWindow: number
  pullsSeen: number
  createdAt: string
  deadlineAt: string
}

/**
 * Une carte raflee au reglement d'un duel. Croise champ par champ avec
 * `duelTransfersResponseSchema` — `fromUserId`/`toUserId` ne sont
 * volontairement PAS servis, le serveur les a deja reduits a `toMe`.
 */
export type DuelTransferView = {
  id: string
  variant: string
  /** Relatif au LECTEUR : vrai si la carte est venue chez lui. */
  toMe: boolean
  card: {
    id: string
    name: string
    rarity: CardRarity
    imageUrl: string | null
    set: { name: string }
  }
}

export type BetStatus = 'ACTIVE' | 'WON' | 'LOST' | 'EXPIRED'

// Croisé champ par champ avec `betViewSchema`
// (back/src/main/interfaces/http/fastify/schemas/wagers.schema.ts) : le
// provider Zod retire silencieusement du JSON toute clé absente de là-bas,
// mais rien ici ne prévient d'un champ renommé côté client — vérifier à la
// main à chaque évolution du schéma serveur.
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
  // d'un boost), `payout` peut valoir moins que `stake × multiplier`.
  multiplier: number
  createdAt: string
  deadlineAt: string
  settledAt: string | null
  pullsSeen: number
  // Porte trois sens selon `status` : le gain total (mise comprise) si WON,
  // la mise remboursée à l'identique si EXPIRED, 0 si LOST. Ne jamais
  // l'afficher sous un libellé « gains » sans distinguer ces trois cas.
  payout: number
  myRole: 'BETTOR' | 'TARGET' | 'SPECTATOR'
}

// Croisé champ par champ avec `betQuoteResponseSchema` — devis indicatif,
// recalculé côté serveur au placement : jamais renvoyé par le client comme
// cote à honorer.
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
  engagedCardIds: string[]
}

const PROPOSE_DUEL_ERRORS = {
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

const BET_QUOTE_ERRORS = {
  403: {
    title: 'Accès refusé',
    message: 'Tu ne fais pas partie de cette équipe.',
  },
  400: {
    title: 'Cote indisponible',
    message: "Cette cible ne fait pas partie de l'équipe.",
  },
  404: {
    title: 'Cote indisponible',
    message: 'Ce joueur est introuvable.',
  },
}

const PLACE_BET_ERRORS = {
  403: {
    title: 'Accès refusé',
    message: 'Tu ne fais pas partie de cette équipe.',
  },
  402: {
    title: 'Poussière insuffisante',
    message: "Tu n'as pas assez de poussière pour cette mise.",
  },
  400: {
    title: 'Pari impossible',
    message:
      'Mise, cible ou nombre de paris déjà ouverts : le serveur a refusé ce pari.',
  },
}

export const WagersApi = {
  getMyTargetedBets: async (): Promise<{ bets: TargetedBetView[] }> => {
    const res = await fetchWithAuth(`${apiUrl}/me/bets`)
    if (!res.ok) {
      handleHttpError(res, {}, 'Chargement des paris reçus')
    }
    return res.json()
  },

  getMyPendingDuels: async (): Promise<{ duels: PendingDuelView[] }> => {
    const res = await fetchWithAuth(`${apiUrl}/me/duels`)
    if (!res.ok) {
      handleHttpError(res, {}, 'Chargement des défis reçus')
    }
    return res.json()
  },

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

  /**
   * Les cartes raflees sur un duel regle. Appelee a la demande, quand le
   * joueur ouvre le detail d'une ligne de l'historique : les charger avec la
   * vue d'equipe ferait payer vingt duels a chaque ouverture de la fiche.
   */
  getDuelTransfers: async (
    teamId: string,
    duelId: string,
  ): Promise<{ transfers: DuelTransferView[] }> => {
    const res = await fetchWithAuth(
      `${apiUrl}/teams/${teamId}/duels/${duelId}/transfers`,
    )
    if (!res.ok) {
      handleHttpError(
        res,
        {
          403: {
            title: 'Accès refusé',
            message: 'Tu ne fais pas partie de cette équipe.',
          },
        },
        'Chargement des cartes du duel',
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
      handleHttpError(res, PROPOSE_DUEL_ERRORS, 'Proposition de duel')
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

  /**
   * Devis indicatif : n'engage rien. `place` recalcule exactement la même
   * cote côté serveur avant d'écrire, donc un devis périmé ne peut pas être
   * « encaissé » à un prix qui n'a plus cours.
   */
  getQuote: async (
    teamId: string,
    targetId: string,
    minRarity: CardRarity,
  ): Promise<BetQuote> => {
    const params = new URLSearchParams({ targetId, minRarity })
    const res = await fetchWithAuth(
      `${apiUrl}/teams/${teamId}/bets/quote?${params.toString()}`,
    )
    if (!res.ok) {
      handleHttpError(res, BET_QUOTE_ERRORS, 'Calcul de la cote')
    }
    return res.json()
  },

  placeBet: async (
    teamId: string,
    input: { targetId: string; minRarity: CardRarity; stake: number },
  ): Promise<BetView> => {
    const res = await fetchWithAuth(`${apiUrl}/teams/${teamId}/bets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!res.ok) {
      handleHttpError(res, PLACE_BET_ERRORS, 'Placement du pari')
    }
    return res.json()
  },
}
