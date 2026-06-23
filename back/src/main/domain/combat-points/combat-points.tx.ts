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
   * Read user's PC (lazily applying regen since lastCombatPointAt and
   * persisting the new state if it changed).
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

    const previousMs = user.lastCombatPointAt?.getTime() ?? null
    const newMs = state.newLastCombatPointAt.getTime()
    const changed =
      state.combatPoints !== user.combatPoints || previousMs !== newMs
    if (changed) {
      await this.#postgresOrm.prisma.user.update({
        where: { id: userId },
        data: {
          combatPoints: state.combatPoints,
          lastCombatPointAt: state.newLastCombatPointAt,
        },
      })
    }

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
    await tx.user.update({
      where: { id: userId },
      data: {
        combatPoints: after,
        // Reset the regen clock to "now" — mirrors token regen behavior so
        // a stale elapsed window cannot instantly refund the PC we just spent.
        lastCombatPointAt: new Date(),
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
