import type { CardWithSet } from '../../types/domain/gacha/gacha.types'
import { weightFor } from './gacha.domain'

const RARITIES = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'] as const

function weightedIndex(weights: readonly number[], roll: number): number {
  const total = weights.reduce((s, w) => s + w, 0)
  let r = roll * total
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i] ?? 0
    if (r < 0) {
      return i
    }
  }
  return weights.length - 1
}

/**
 * Carte d'un tirage de capsule. La rareté est tirée aux poids du pool NORMAL
 * (Chance comprise), puis la carte parmi celles de la capsule à cette rareté
 * au `dropWeight` : tirer au poids sur le seul sous-pool fausserait les taux.
 * Rareté absente du sous-pool → rareté inférieure (puis supérieure en dernier
 * recours). `forceLegendary` (pitié) prime sur `minRarity` (boule d'or).
 */
export function pickCapsuleCard(
  normalPool: CardWithSet[],
  capsulePool: CardWithSet[],
  opts: {
    luckMultiplier: number
    forceLegendary: boolean
    minRarity?: 'RARE'
    rng?: () => number
  },
): CardWithSet {
  if (capsulePool.length === 0) {
    throw new Error('No capsule cards to pick from')
  }
  const rng = opts.rng ?? Math.random
  const minIdx = opts.forceLegendary
    ? RARITIES.indexOf('LEGENDARY')
    : opts.minRarity
      ? RARITIES.indexOf(opts.minRarity)
      : 0
  const allowed = RARITIES.slice(minIdx)
  const rarityWeights = allowed.map((r) =>
    normalPool
      .filter((c) => c.rarity === r)
      .reduce((s, c) => s + weightFor(c, opts.luckMultiplier), 0),
  )
  const roll = rng()
  const drawnIdx =
    minIdx +
    (rarityWeights.some((w) => w > 0) ? weightedIndex(rarityWeights, roll) : 0)

  const order = [
    ...RARITIES.slice(0, drawnIdx + 1).reverse(),
    ...RARITIES.slice(drawnIdx + 1),
  ]
  for (const rarity of order) {
    const candidates = capsulePool.filter(
      (c) => c.rarity === rarity && c.dropWeight > 0,
    )
    const card =
      candidates[
        weightedIndex(
          candidates.map((c) => c.dropWeight),
          rng(),
        )
      ]
    if (card) {
      return card
    }
  }
  throw new Error('No capsule cards to pick from')
}
