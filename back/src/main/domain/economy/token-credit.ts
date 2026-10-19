import type { UserUpgradeEffects } from '../../types/domain/economy/economy.types'
import type { PrimaTransactionClient } from '../../types/infra/orm/client'
import {
  calculateTokens,
  effectiveRegenInterval,
  overflowDust,
} from './economy.domain'

/**
 * Crédite des jetons offerts au-dessus du plafond. La régénération est
 * matérialisée avant le crédit (même calcul qu'orders.deliver) : sinon
 * calculateTokens plafonnerait plus tard `stock + regen` à maxStock et
 * avalerait le cadeau. Renvoie le nouveau solde.
 */
export async function creditTokensInTx(
  tx: PrimaTransactionClient,
  userId: string,
  amount: number,
  ctx: {
    upgrades: UserUpgradeEffects
    teamLoot: number
    cfg: { tokenRegenIntervalMinutes: number; tokenMaxStock: number }
  },
): Promise<number> {
  const { upgrades, teamLoot, cfg } = ctx
  const user = await tx.user.findUniqueOrThrow({
    where: { id: userId },
    select: { tokens: true, lastTokenAt: true },
  })
  const { tokens, newLastTokenAt, overflow } = calculateTokens(
    user.lastTokenAt,
    user.tokens,
    effectiveRegenInterval({
      intervalMinutes: cfg.tokenRegenIntervalMinutes,
      reductionMinutes: upgrades.regenReductionMinutes,
      lootBonusPct: teamLoot,
    }),
    cfg.tokenMaxStock + upgrades.tokenVaultBonus,
    upgrades.multiTokenChance,
  )
  const updated = await tx.user.update({
    where: { id: userId },
    data: {
      tokens: tokens + amount,
      lastTokenAt: newLastTokenAt ?? undefined,
      dust: {
        increment: overflowDust(overflow, upgrades.tokenOverflowDust),
      },
    },
    select: { tokens: true },
  })
  return updated.tokens
}
