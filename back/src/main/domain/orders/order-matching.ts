import Boom from '@hapi/boom'

import { errorMessage } from '../../infra/i18n/error-messages'
import type {
  DeliveryPick,
  DuplicateStack,
  MatchableCard,
  MatchableUserCard,
  OrderLine,
} from '../../types/domain/orders/orders.domain.interface'

export function cardMatchesLine(card: MatchableCard, line: OrderLine): boolean {
  if (card.rarity !== line.rarity) {
    return false
  }
  if (line.element && card.element !== line.element) {
    return false
  }
  if (line.setId && card.setId !== line.setId) {
    return false
  }
  return true
}

/**
 * Valide un pick et retourne la carte avec la ligne correspondante.
 * Lève un Boom.badRequest si le pick est invalide.
 */
function validatePickAndGetCard(
  pick: DeliveryPick,
  lines: OrderLine[],
  userCards: Map<string, MatchableUserCard>,
): { line: OrderLine; userCard: MatchableUserCard } {
  if (!Number.isInteger(pick.amount) || pick.amount <= 0) {
    throw Boom.badRequest(errorMessage('orders.invalidAmount'))
  }
  const line = lines[pick.lineIndex]
  if (!line) {
    throw Boom.badRequest(
      errorMessage('orders.badLine', { line: pick.lineIndex + 1 }),
    )
  }
  const userCard = userCards.get(pick.userCardId)
  if (!userCard) {
    throw Boom.badRequest(errorMessage('orders.unknownCard'))
  }
  if (userCard.variant !== 'NORMAL') {
    throw Boom.badRequest(errorMessage('orders.variantNotAllowed'))
  }
  if (!cardMatchesLine(userCard.card, line)) {
    throw Boom.badRequest(
      errorMessage('orders.cardDoesNotMatch', { line: pick.lineIndex + 1 }),
    )
  }
  return { line, userCard }
}

/**
 * Lève un Boom.badRequest si la sélection ne couvre pas EXACTEMENT chaque
 * ligne, ou si elle consomme le dernier exemplaire d'une carte. Le total par
 * carte est sommé sur TOUTES les lignes : une même carte peut servir deux
 * lignes, pas en vider le stock.
 */
export function validateDelivery(
  lines: OrderLine[],
  picks: DeliveryPick[],
  userCards: Map<string, MatchableUserCard>,
): void {
  const perLine = lines.map(() => 0)
  const perCard = new Map<string, number>()

  for (const pick of picks) {
    const { userCard } = validatePickAndGetCard(pick, lines, userCards)
    perLine[pick.lineIndex] = (perLine[pick.lineIndex] ?? 0) + pick.amount
    perCard.set(userCard.id, (perCard.get(userCard.id) ?? 0) + pick.amount)
  }

  for (const [id, amount] of perCard) {
    // biome-ignore lint/style/noNonNullAssertion: chaque id de perCard vient d'une carte trouvée ci-dessus
    const { quantity } = userCards.get(id)!
    if (quantity - amount < 1) {
      throw Boom.badRequest(
        errorMessage('orders.wouldLeaveZeroCopies', { amount, quantity }),
      )
    }
  }

  lines.forEach((line, i) => {
    if (perLine[i] !== line.quantity) {
      throw Boom.badRequest(
        errorMessage('orders.lineNotCovered', {
          line: i + 1,
          expected: line.quantity,
          got: perLine[i] ?? 0,
        }),
      )
    }
  })
}

/**
 * Sélection gloutonne : lignes filtrées d'abord (elles ont moins de
 * candidats), puis piles les plus fournies d'abord. Rend null si impossible.
 * ponytail: glouton, peut rater une affectation qui existe sur des cas
 * tordus (3+ lignes croisées) ; le joueur peut toujours choisir à la main.
 */
export function suggestPicks(
  lines: OrderLine[],
  stacks: DuplicateStack[],
): DeliveryPick[] | null {
  const left = new Map(stacks.map((s) => [s.userCardId, s.available]))
  const order = lines
    .map((line, lineIndex) => ({ line, lineIndex }))
    .sort(
      (a, b) =>
        Number(Boolean(b.line.element || b.line.setId)) -
        Number(Boolean(a.line.element || a.line.setId)),
    )
  const picks: DeliveryPick[] = []

  for (const { line, lineIndex } of order) {
    let need = line.quantity
    const candidates = stacks
      .filter((s) => cardMatchesLine(s, line))
      .sort(
        (a, b) => (left.get(b.userCardId) ?? 0) - (left.get(a.userCardId) ?? 0),
      )
    for (const s of candidates) {
      if (need === 0) {
        break
      }
      const take = Math.min(need, left.get(s.userCardId) ?? 0)
      if (take > 0) {
        picks.push({ lineIndex, userCardId: s.userCardId, amount: take })
        left.set(s.userCardId, (left.get(s.userCardId) ?? 0) - take)
        need -= take
      }
    }
    if (need > 0) {
      return null
    }
  }
  return picks
}
