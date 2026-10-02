import { describe, expect, it } from '@jest/globals'

import {
  computeOrderReward,
  REWARD_CONFIG_KEYS,
  rewardConfigFrom,
} from '../../main/domain/orders/order-rewards'
import { DEFAULTS } from '../../main/infra/config/config.service'
import type { OrderLine } from '../../main/types/domain/orders/orders.domain.interface'
import { collectSkillTree } from '../helpers/skill-tree-seed'

const RARITIES = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'] as const
const cfg = rewardConfigFrom(
  Object.fromEntries(REWARD_CONFIG_KEYS.map((k) => [k, DEFAULTS[k]])) as never,
)

/** Toutes les commandes possibles : 1 à 2 lignes, 1 à 3 cartes, toute rareté. */
function allOrders(): OrderLine[][] {
  const single: OrderLine[] = RARITIES.flatMap((rarity) =>
    [1, 2, 3].map((quantity) => ({ quantity, rarity })),
  )
  return [
    ...single.map((l) => [l]),
    ...single.flatMap((a) => single.map((b) => [a, b])),
  ]
}

const cardCount = (lines: OrderLine[]) =>
  lines.reduce((n, l) => n + l.quantity, 0)

describe('barème des commandes', () => {
  it('calcule les exemples de la spec', () => {
    expect(
      computeOrderReward([{ quantity: 2, rarity: 'RARE', element: 'WATER' }], cfg),
    ).toEqual({ dust: 240, gold: 640, tokens: 1 })
    expect(
      computeOrderReward([{ quantity: 3, rarity: 'COMMON', element: 'FIRE' }], cfg),
    ).toEqual({ dust: 45, gold: 120, tokens: 1 })
    expect(computeOrderReward([{ quantity: 1, rarity: 'EPIC' }], cfg).tokens).toBe(0)
  })

  it('prend la rareté MAX des lignes pour le barème de jetons', () => {
    expect(
      computeOrderReward(
        [
          { quantity: 3, rarity: 'COMMON' },
          { quantity: 3, rarity: 'EPIC' },
        ],
        cfg,
      ).tokens,
    ).toBe(3)
  })

  // Invariant 1 — un tirage ≈ une carte : rendre autant de jetons que de
  // cartes consommées créerait une boucle tirage → commande → tirage.
  it('ne rend jamais autant de jetons que de cartes livrées', () => {
    for (const lines of allOrders()) {
      expect(computeOrderReward(lines, cfg).tokens).toBeLessThan(cardCount(lines))
    }
  })

  // Invariant 2 — livrer doit battre le recyclage, même Recyclage au max.
  // Le maximum est LU dans le seed : buffer Recyclage cassera ce test.
  it('rend plus de poussière que la conversion au multiplicateur max', async () => {
    const { nodes } = await collectSkillTree()
    const recyclage = nodes.find((n) => n.effectType === 'DUST_HARVEST')
    expect(recyclage).toBeDefined()
    const maxEffect = Math.max(...recyclage!.levels.map((l) => l.effect))
    const maxHarvest = 1 + maxEffect / 100
    for (const lines of allOrders()) {
      const v = lines.reduce(
        (sum, l) => sum + cfg.dustByRarity[l.rarity] * l.quantity,
        0,
      )
      expect(computeOrderReward(lines, cfg).dust).toBeGreaterThan(v * maxHarvest)
    }
  })
})
