import type { CardRarity } from '../../../generated/client'
import type {
  OrderLine,
  OrderReward,
  OrderRewardConfig,
} from '../../types/domain/orders/orders.domain.interface'
import type { ConfigKey } from '../../types/infra/config/config.service.interface'
import { RARITY_ORDER } from '../wagers/wager-rules'

export const REWARD_CONFIG_KEYS = [
  'dustCommon',
  'dustUncommon',
  'dustRare',
  'dustEpic',
  'dustLegendary',
  'orders.dustMult',
  'orders.goldMult',
  'orders.tokensCommon',
  'orders.tokensUncommon',
  'orders.tokensRare',
  'orders.tokensEpic',
  'orders.tokensLegendary',
] as const satisfies readonly ConfigKey[]

export type RewardConfigKey = (typeof REWARD_CONFIG_KEYS)[number]

export function rewardConfigFrom(
  c: Record<RewardConfigKey, number>,
): OrderRewardConfig {
  return {
    dustByRarity: {
      COMMON: c.dustCommon,
      UNCOMMON: c.dustUncommon,
      RARE: c.dustRare,
      EPIC: c.dustEpic,
      LEGENDARY: c.dustLegendary,
    },
    tokensByRarity: {
      COMMON: c['orders.tokensCommon'],
      UNCOMMON: c['orders.tokensUncommon'],
      RARE: c['orders.tokensRare'],
      EPIC: c['orders.tokensEpic'],
      LEGENDARY: c['orders.tokensLegendary'],
    },
    dustMult: c['orders.dustMult'],
    goldMult: c['orders.goldMult'],
  }
}

/**
 * V = valeur poussière des cartes demandées, SANS le multiplicateur de
 * compétence : deux joueurs voient la même récompense pour la même commande.
 * Jetons plafonnés à nbCartes − 1 : une commande ne rend jamais autant de
 * tirages qu'elle consomme de cartes (un tirage ≈ une carte).
 */
export function computeOrderReward(
  lines: OrderLine[],
  cfg: OrderRewardConfig,
): OrderReward {
  const v = lines.reduce(
    (sum, l) => sum + cfg.dustByRarity[l.rarity] * l.quantity,
    0,
  )
  const cards = lines.reduce((n, l) => n + l.quantity, 0)
  const maxRarity = lines.reduce<CardRarity>(
    (max, l) =>
      RARITY_ORDER.indexOf(l.rarity) > RARITY_ORDER.indexOf(max)
        ? l.rarity
        : max,
    'COMMON',
  )
  return {
    dust: Math.round(v * cfg.dustMult),
    gold: Math.round(v * cfg.goldMult),
    tokens: Math.max(0, Math.min(cfg.tokensByRarity[maxRarity], cards - 1)),
  }
}
