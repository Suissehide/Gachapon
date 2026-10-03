import Boom from '@hapi/boom'

import type { CardRarity, CardVariant } from '../../../generated/client'
import { errorMessage } from '../../infra/i18n/error-messages'
import type {
  AlchemyFromRarity,
  AlchemyPick,
} from '../../types/domain/alchemy/alchemy.domain.interface'
import type { ConfigKey } from '../../types/infra/config/config.service.interface'
import { RARITY_ORDER } from '../wagers/wager-rules'

export const ALCHEMY_FROM_RARITIES: AlchemyFromRarity[] = [
  'COMMON',
  'UNCOMMON',
  'RARE',
  'EPIC',
]

export const ALCHEMY_COST_KEYS = {
  COMMON: 'alchemy.costCommon',
  UNCOMMON: 'alchemy.costUncommon',
  RARE: 'alchemy.costRare',
  EPIC: 'alchemy.costEpic',
} as const satisfies Record<AlchemyFromRarity, ConfigKey>

export function nextRarity(r: CardRarity): CardRarity | null {
  return RARITY_ORDER[RARITY_ORDER.indexOf(r) + 1] ?? null
}

type IngredientCard = {
  id: string
  quantity: number
  variant: CardVariant
  card: { rarity: CardRarity }
}

function checkPick(
  fromRarity: CardRarity,
  pick: AlchemyPick,
  userCards: Map<string, IngredientCard>,
): IngredientCard {
  if (!Number.isInteger(pick.amount) || pick.amount <= 0) {
    throw Boom.badRequest(errorMessage('alchemy.invalidAmount'))
  }
  const userCard = userCards.get(pick.userCardId)
  if (!userCard) {
    throw Boom.badRequest(errorMessage('alchemy.unknownCard'))
  }
  if (userCard.card.rarity !== fromRarity) {
    throw Boom.badRequest(errorMessage('alchemy.wrongRarity'))
  }
  if (userCard.variant !== 'NORMAL') {
    throw Boom.badRequest(errorMessage('alchemy.variantNotAllowed'))
  }
  return userCard
}

/**
 * Lève un Boom.badRequest si la sélection n'est pas une recette valide :
 * cran inexistant, montant invalide, carte inconnue / d'une autre rareté /
 * non normale, dernier exemplaire entamé (montants sommés par carte), ou
 * total ≠ cost.
 */
export function validateIngredients(
  fromRarity: CardRarity,
  picks: AlchemyPick[],
  userCards: Map<string, IngredientCard>,
  cost: number,
): void {
  if (nextRarity(fromRarity) === null) {
    throw Boom.badRequest(errorMessage('alchemy.noTierFromLegendary'))
  }
  const perCard = new Map<string, number>()
  for (const pick of picks) {
    const userCard = checkPick(fromRarity, pick, userCards)
    perCard.set(userCard.id, (perCard.get(userCard.id) ?? 0) + pick.amount)
  }
  for (const [id, amount] of perCard) {
    const userCard = userCards.get(id)
    if (!userCard) {
      throw new Error(
        `Carte ${id} introuvable alors qu'elle vient d'être trouvée`,
      )
    }
    const { quantity } = userCard
    if (quantity - amount < 1) {
      throw Boom.badRequest(
        errorMessage('alchemy.wouldLeaveZeroCopies', { amount, quantity }),
      )
    }
  }
  const total = [...perCard.values()].reduce((s, n) => s + n, 0)
  if (total !== cost) {
    throw Boom.badRequest(
      errorMessage('alchemy.wrongTotal', { expected: cost, got: total }),
    )
  }
}

/** Sélection gloutonne : piles les plus fournies d'abord ; null si impossible. */
export function suggestIngredients(
  stacks: { userCardId: string; available: number }[],
  cost: number,
): AlchemyPick[] | null {
  let need = cost
  const picks: AlchemyPick[] = []
  for (const s of [...stacks].sort((a, b) => b.available - a.available)) {
    if (need === 0) {
      break
    }
    const take = Math.min(need, s.available)
    if (take > 0) {
      picks.push({ userCardId: s.userCardId, amount: take })
      need -= take
    }
  }
  return need === 0 ? picks : null
}

export function maxTransmutations(
  stacks: { available: number }[],
  cost: number,
): number {
  return Math.floor(stacks.reduce((s, x) => s + x.available, 0) / cost)
}
