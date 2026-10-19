import Boom from '@hapi/boom'

import { errorMessage } from '../../infra/i18n/error-messages'
import type { IocContainer } from '../../types/application/ioc'
import type {
  IReturnBonusDomain,
  ReturnChestClaim,
} from '../../types/domain/return-bonus/return-bonus.domain.interface'
import type { ConfigServiceInterface } from '../../types/infra/config/config.service.interface'
import type {
  PostgresORMInterface,
  PrimaTransactionClient,
} from '../../types/infra/orm/client'
import {
  calculateTokens,
  effectiveRegenInterval,
  overflowDust,
} from '../economy/economy.domain'
import { retryOnSerialization } from '../shared/retry-serialization'
import {
  computeReturnChest,
  type ReturnChestAmounts,
} from './return-bonus-rules'

const CHEST_SELECT = {
  days: true,
  cappedDays: true,
  tokens: true,
  energy: true,
} as const

export class ReturnBonusDomain implements IReturnBonusDomain {
  readonly #postgresOrm: PostgresORMInterface
  readonly #configService: ConfigServiceInterface
  readonly #skillTreeRepository: IocContainer['skillTreeRepository']
  readonly #teamProgressionDomain: IocContainer['teamProgressionDomain']
  readonly #combatPointsTx: IocContainer['combatPointsTx']

  constructor({
    postgresOrm,
    configService,
    skillTreeRepository,
    teamProgressionDomain,
    combatPointsTx,
  }: Pick<
    IocContainer,
    | 'postgresOrm'
    | 'configService'
    | 'skillTreeRepository'
    | 'teamProgressionDomain'
    | 'combatPointsTx'
  >) {
    this.#postgresOrm = postgresOrm
    this.#configService = configService
    this.#skillTreeRepository = skillTreeRepository
    this.#teamProgressionDomain = teamProgressionDomain
    this.#combatPointsTx = combatPointsTx
  }

  async grantInTx(
    tx: PrimaTransactionClient,
    userId: string,
    dayGap: number,
  ): Promise<void> {
    const cfg = await this.#configService.getMany(
      'returnBonus.minDays',
      'returnBonus.maxDays',
      'returnBonus.tokensPerDay',
      'returnBonus.energyPerDay',
    )
    const chest = computeReturnChest(dayGap, {
      minDays: cfg['returnBonus.minDays'],
      maxDays: cfg['returnBonus.maxDays'],
      tokensPerDay: cfg['returnBonus.tokensPerDay'],
      energyPerDay: cfg['returnBonus.energyPerDay'],
    })
    if (!chest) {
      return
    }
    // Un coffre en attente reste tel quel : jamais recalculé ni cumulé.
    await tx.returnChest.upsert({
      where: { userId },
      create: { userId, ...chest },
      update: {},
    })
  }

  findPending(userId: string): Promise<ReturnChestAmounts | null> {
    return this.#postgresOrm.prisma.returnChest.findUnique({
      where: { userId },
      select: CHEST_SELECT,
    })
  }

  claim(userId: string): Promise<ReturnChestClaim> {
    return retryOnSerialization(async () => {
      // Les effets ne servent qu'à régler la recharge en cours : le cadeau
      // lui-même est un crédit plat, sans bonus.
      const [upgrades, cfg, teamEffects] = await Promise.all([
        this.#skillTreeRepository.getEffectsForUser(userId),
        this.#configService.getMany(
          'tokenRegenIntervalMinutes',
          'tokenMaxStock',
        ),
        this.#teamProgressionDomain.effectsForUser(userId),
      ])
      return this.#postgresOrm.executeWithTransactionClient(
        async (tx) => {
          const chest = await tx.returnChest.findUnique({
            where: { userId },
            select: CHEST_SELECT,
          })
          if (!chest) {
            throw Boom.notFound(errorMessage('returnBonus.notFound'))
          }
          await tx.returnChest.delete({ where: { userId } })

          // Régénération matérialisée AVANT le crédit (même calcul que
          // orders.deliver) : sinon calculateTokens plafonnerait plus tard
          // `stock + regen` à maxStock et avalerait le cadeau.
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
              lootBonusPct: teamEffects.loot,
            }),
            cfg.tokenMaxStock + upgrades.tokenVaultBonus,
            upgrades.multiTokenChance,
          )
          const updated = await tx.user.update({
            where: { id: userId },
            data: {
              tokens: tokens + chest.tokens,
              lastTokenAt: newLastTokenAt ?? undefined,
              dust: {
                increment: overflowDust(overflow, upgrades.tokenOverflowDust),
              },
            },
            select: { tokens: true },
          })
          const { combatPointsAfter } = await this.#combatPointsTx.creditInTx(
            tx,
            userId,
            chest.energy,
            upgrades,
          )
          return {
            tokens: updated.tokens,
            combatPoints: combatPointsAfter,
            gained: chest,
          }
        },
        { isolationLevel: 'Serializable', maxWait: 5000, timeout: 10000 },
      )
    })
  }
}
