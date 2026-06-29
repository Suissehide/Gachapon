import Boom from '@hapi/boom'

import type { IocContainer } from '../../types/application/ioc'
import type { ConfigServiceInterface } from '../../types/infra/config/config.service.interface'
import type { PostgresORMInterface } from '../../types/infra/orm/client'
import type { PrimaTransactionClient } from '../../types/infra/orm/client'
import { calculateCombatPoints } from './combat-points.domain'

export interface CombatPointsView {
  combatPoints: number
  maxStock: number
  regenSeconds: number
  nextCombatPointAt: Date | null
}

export class CombatPointsTx {
  readonly #postgresOrm: PostgresORMInterface
  readonly #configService: ConfigServiceInterface

  constructor({ postgresOrm, configService }: IocContainer) {
    this.#postgresOrm = postgresOrm
    this.#configService = configService
  }

  /**
   * Read user's PC (lazily applying regen since lastCombatPointAt).
   *
   * Pure read — does NOT persist the recomputed state. Persistence happens
   * only inside #debitInTx, which is the single writer for combatPoints.
   * Avoids a race where a polling /combat/points call reads the pre-debit
   * state, then writes back the regenerated PC after a concurrent debit,
   * effectively refunding the spent PC.
   */
  async getView(userId: string): Promise<CombatPointsView> {
    const cfg = await this.#loadConfig()
    const user = await this.#postgresOrm.prisma.user.findUnique({
      where: { id: userId },
      select: { combatPoints: true, lastCombatPointAt: true },
    })
    if (!user) throw Boom.notFound('User not found')

    const state = calculateCombatPoints(
      user.lastCombatPointAt,
      user.combatPoints,
      cfg.regenSeconds,
      cfg.maxStock,
    )

    return {
      combatPoints: state.combatPoints,
      maxStock: cfg.maxStock,
      regenSeconds: cfg.regenSeconds,
      nextCombatPointAt: state.nextCombatPointAt,
    }
  }

  /**
   * Debit `cost` PC atomically inside the calling transaction.
   * Throws 402 if the user does not have enough PC (after lazy regen).
   *
   * The caller passes its own tx client so the debit is part of the same
   * Serializable transaction (e.g. the campaign battle/sweep).
   */
  async debitInTx(
    tx: PrimaTransactionClient,
    userId: string,
    cost: number,
  ): Promise<{ combatPointsAfter: number }> {
    if (cost <= 0) {
      return { combatPointsAfter: 0 }
    }
    const cfg = await this.#loadConfig()
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { combatPoints: true, lastCombatPointAt: true },
    })
    if (!user) throw Boom.notFound('User not found')

    // Apply regen first so the user sees their current effective stock.
    const state = calculateCombatPoints(
      user.lastCombatPointAt,
      user.combatPoints,
      cfg.regenSeconds,
      cfg.maxStock,
    )

    if (state.combatPoints < cost) {
      throw Boom.paymentRequired(
        `Not enough combat points (need ${cost}, have ${state.combatPoints})`,
      )
    }

    const after = state.combatPoints - cost
    // Preserve the regen clock returned by calculateCombatPoints: it already
    // advances by N intervals for the PCs gained (so the partial window
    // toward the next PC is kept). Resetting to "now" here would discard
    // any sub-interval regen progress on every battle/sweep.
    await tx.user.update({
      where: { id: userId },
      data: {
        combatPoints: after,
        lastCombatPointAt: state.newLastCombatPointAt,
      },
    })
    return { combatPointsAfter: after }
  }

  async #loadConfig(): Promise<{ maxStock: number; regenSeconds: number }> {
    const cfg = await this.#configService.getMany(
      'combat.pointsMax',
      'combat.regenSeconds',
    )
    return {
      maxStock: cfg['combat.pointsMax'],
      regenSeconds: cfg['combat.regenSeconds'],
    }
  }
}
