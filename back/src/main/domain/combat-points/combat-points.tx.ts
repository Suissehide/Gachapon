import Boom from '@hapi/boom'

import type { IocContainer } from '../../types/application/ioc'
import type { ConfigServiceInterface } from '../../types/infra/config/config.service.interface'
import type { ISkillTreeRepository } from '../../types/infra/orm/repositories/skill-tree.repository.interface'
import type {
  PostgresORMInterface,
  PrimaTransactionClient,
} from '../../types/infra/orm/client'
import { calculateCombatPoints } from './combat-points.domain'

export interface CombatPointsView {
  combatPoints: number
  maxStock: number
  regenSeconds: number
  battleCost: number
  sweepCost: number
  nextCombatPointAt: Date | null
}

type CombatCfg = {
  maxStock: number
  regenSeconds: number
  battleCost: number
  sweepCost: number
}

type PcEffects = {
  pcVaultBonus: number
  pcRegenReductionSeconds: number
}

const NEUTRAL_EFFECTS: PcEffects = { pcVaultBonus: 0, pcRegenReductionSeconds: 0 }

const REGEN_FLOOR_SECONDS = 60

/**
 * Apply skill-tree PC effects to the raw combat config.
 * Pure function — no side effects.
 *
 * - maxStock   += pcVaultBonus
 * - regenSeconds = max(REGEN_FLOOR_SECONDS, regenSeconds - pcRegenReductionSeconds)
 */
export function effectiveCombatConfig(cfg: CombatCfg, effects: PcEffects): CombatCfg {
  return {
    maxStock: cfg.maxStock + effects.pcVaultBonus,
    regenSeconds: Math.max(REGEN_FLOOR_SECONDS, cfg.regenSeconds - effects.pcRegenReductionSeconds),
    battleCost: cfg.battleCost,
    sweepCost: cfg.sweepCost,
  }
}

export class CombatPointsTx {
  readonly #postgresOrm: PostgresORMInterface
  readonly #configService: ConfigServiceInterface
  readonly #skillTreeRepository: ISkillTreeRepository

  constructor({ postgresOrm, configService, skillTreeRepository }: IocContainer) {
    this.#postgresOrm = postgresOrm
    this.#configService = configService
    this.#skillTreeRepository = skillTreeRepository
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
    const [rawCfg, effects] = await Promise.all([
      this.#loadConfig(),
      this.#skillTreeRepository.getEffectsForUser(userId),
    ])
    const cfg = effectiveCombatConfig(rawCfg, effects)

    const user = await this.#postgresOrm.prisma.user.findUnique({
      where: { id: userId },
      select: { combatPoints: true, lastCombatPointAt: true },
    })
    if (!user) {
      throw Boom.notFound('User not found')
    }

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
      battleCost: cfg.battleCost,
      sweepCost: cfg.sweepCost,
      nextCombatPointAt: state.nextCombatPointAt,
    }
  }

  /**
   * Debit `cost` PC atomically inside the calling transaction.
   * Throws 402 if the user does not have enough PC (after lazy regen).
   *
   * The caller passes its own tx client so the debit is part of the same
   * Serializable transaction (e.g. the campaign battle/sweep).
   *
   * `effects` must be read OUTSIDE the transaction by the caller before
   * opening the tx (reading from a different connection inside a Serializable
   * tx is unsafe and couples the tx to the skill-tree read path). When
   * absent (e.g. legacy callers or task-8 migration), neutral effects apply
   * and behaviour is byte-identical to the previous implementation.
   */
  async debitInTx(
    tx: PrimaTransactionClient,
    userId: string,
    cost: number,
    effects: PcEffects = NEUTRAL_EFFECTS,
  ): Promise<{ combatPointsAfter: number }> {
    if (cost <= 0) {
      return { combatPointsAfter: 0 }
    }
    const rawCfg = await this.#loadConfig()
    const cfg = effectiveCombatConfig(rawCfg, effects)

    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { combatPoints: true, lastCombatPointAt: true },
    })
    if (!user) {
      throw Boom.notFound('User not found')
    }

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

  async #loadConfig(): Promise<CombatCfg> {
    const cfg = await this.#configService.getMany(
      'combat.pointsMax',
      'combat.regenSeconds',
      'combat.battleCost',
      'combat.sweepCost',
    )
    return {
      maxStock: cfg['combat.pointsMax'],
      regenSeconds: cfg['combat.regenSeconds'],
      battleCost: cfg['combat.battleCost'],
      sweepCost: cfg['combat.sweepCost'],
    }
  }
}
