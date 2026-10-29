import type { IocContainer } from '../../types/application/ioc'
import type { PrimaTransactionClient } from '../../types/infra/orm/client'
import { creditTokensInTx, type TokenCreditCtx } from '../economy/token-credit'

/**
 * Matérialise la régénération des jetons et de l'énergie aux effets d'avant le
 * changement d'arbre (`ctx` lu hors transaction AVANT de le modifier). Le
 * calcul lazy repart de `lastTokenAt` / `lastCombatPointAt` : sans ce
 * règlement, un point investi dans REGEN, TOKEN_VAULT, PC_REGEN ou PC_VAULT
 * s'appliquerait à tout le temps écoulé depuis la dernière écriture, et un
 * reset le retirerait rétroactivement.
 */
export async function settleRegenInTx(
  tx: PrimaTransactionClient,
  userId: string,
  ctx: TokenCreditCtx,
  combatPointsTx: IocContainer['combatPointsTx'],
): Promise<void> {
  await creditTokensInTx(tx, userId, 0, ctx)
  await combatPointsTx.settleInTx(tx, userId, ctx.upgrades)
}
