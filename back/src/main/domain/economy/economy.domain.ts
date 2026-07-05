export type { TokenState } from '../../types/domain/economy/economy.types'

import type { TokenState } from '../../types/domain/economy/economy.types'

/**
 * Calcul lazy des tokens accumulés depuis lastTokenAt.
 * Si lastTokenAt est null : on initialise le clock à maintenant (0 tokens gagnés, regen commence).
 * Ne fait aucun IO — pur calcul.
 */
export function calculateTokens(
  lastTokenAt: Date | null,
  currentTokens: number,
  regenIntervalMinutes: number,
  maxStock: number,
  multiTokenChance = 0,
  rng: () => number = Math.random,
): TokenState {
  // Déjà au max (ou au-dessus) → pas de regen, pas de nextTokenAt
  // On reset lastTokenAt à maintenant pour que le clock de regen reparte
  // de zéro si un token est ensuite consommé (sinon le calcul lazy
  // re-crédite immédiatement le token perdu à cause du elapsed stale).
  if (currentTokens >= maxStock) {
    return {
      tokens: currentTokens,
      newLastTokenAt: new Date(),
      nextTokenAt: null,
    }
  }

  // Null = premier accès, on démarre le clock maintenant
  const ref = lastTokenAt ?? new Date()
  if (!lastTokenAt) {
    const nextTokenAt = new Date(
      ref.getTime() + regenIntervalMinutes * 60 * 1000,
    )
    return { tokens: currentTokens, newLastTokenAt: ref, nextTokenAt }
  }

  const now = Date.now()
  const msPerToken = regenIntervalMinutes * 60 * 1000
  const elapsed = now - ref.getTime()
  const gained = Math.floor(elapsed / msPerToken)

  if (gained <= 0) {
    const nextTokenAt = new Date(ref.getTime() + msPerToken)
    return { tokens: currentTokens, newLastTokenAt: ref, nextTokenAt }
  }

  // Bonus tokens: MULTI_TOKEN_CHANCE — each time-gained token has a chance to grant a free extra.
  // Bonus tokens do NOT advance the regen clock (they cost no regen time).
  let bonus = 0
  if (gained > 0 && multiTokenChance > 0) {
    for (let i = 0; i < gained; i++) {
      if (rng() < multiTokenChance / 100) {
        bonus++
      }
    }
  }

  const newTokens = Math.min(currentTokens + gained + bonus, maxStock)
  // actualGainedFromTime: time-based tokens that fit in stock (bonus excluded).
  // Used to advance the regen clock — bonus tokens don't consume regen time.
  const actualGainedFromTime = Math.min(gained, maxStock - currentTokens)
  // Si la regen amène au max, reset le clock à maintenant pour éviter
  // qu'un elapsed résiduel ne régénère instantanément un futur token consommé.
  const newLastTokenAt =
    newTokens >= maxStock
      ? new Date()
      : new Date(ref.getTime() + actualGainedFromTime * msPerToken)

  const nextTokenAt =
    newTokens >= maxStock
      ? null
      : new Date(newLastTokenAt.getTime() + msPerToken)

  return { tokens: newTokens, newLastTokenAt, nextTokenAt }
}
