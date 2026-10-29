import Boom from '@hapi/boom'

import { errorMessage } from '../../infra/i18n/error-messages'
import type { PostgresOrm } from '../../infra/orm/postgres-client'
import type { IocContainer } from '../../types/application/ioc'
import type {
  ISkillResetDomain,
  ResetResult,
} from '../../types/domain/skills/skill-tree.domain.interface'
import type { ISkillTreeRepository } from '../../types/infra/orm/repositories/skill-tree.repository.interface'
import type { UserRepositoryInterface } from '../../types/infra/orm/repositories/user.repository.interface'
import { loadTokenCreditCtx } from '../economy/token-credit'
import { settleRegenInTx } from './settle-regen'

export class SkillResetDomain implements ISkillResetDomain {
  readonly #skillTreeRepository: ISkillTreeRepository
  readonly #userRepository: UserRepositoryInterface
  readonly #postgresOrm: PostgresOrm
  readonly #combatPointsTx: IocContainer['combatPointsTx']
  readonly #regenDeps: Parameters<typeof loadTokenCreditCtx>[0]

  constructor({
    skillTreeRepository,
    userRepository,
    postgresOrm,
    combatPointsTx,
    configService,
    teamProgressionDomain,
  }: IocContainer) {
    this.#skillTreeRepository = skillTreeRepository
    this.#userRepository = userRepository
    this.#postgresOrm = postgresOrm
    this.#combatPointsTx = combatPointsTx
    this.#regenDeps = {
      skillTreeRepository,
      configService,
      teamProgressionDomain,
    }
  }

  async reset(userId: string): Promise<ResetResult> {
    const [config, totalInvested, user] = await Promise.all([
      this.#skillTreeRepository.getSkillConfig(),
      this.#skillTreeRepository.getTotalInvestedPoints(userId),
      this.#userRepository.findById(userId),
    ])

    if (!user) {
      throw Boom.notFound(errorMessage('user.notFound'))
    }
    if (totalInvested === 0) {
      throw Boom.badRequest(errorMessage('skills.noPointsInvested'))
    }

    const dustCost = totalInvested * config.resetCostPerPoint
    if (user.dust < dustCost) {
      throw Boom.paymentRequired(errorMessage('economy.notEnoughDust'))
    }

    const settleCtx = await loadTokenCreditCtx(this.#regenDeps, userId)
    const result = await this.#postgresOrm.executeWithTransactionClient(
      async (tx) => {
        await settleRegenInTx(tx, userId, settleCtx, this.#combatPointsTx)
        await this.#skillTreeRepository.deleteUserSkillsInTx(tx, userId)
        const updated = await tx.user.update({
          where: { id: userId },
          data: {
            skillPoints: { increment: totalInvested },
            dust: { decrement: dustCost },
          },
        })
        return updated
      },
      { isolationLevel: 'Serializable', maxWait: 5000, timeout: 10000 },
    )

    return { skillPoints: result.skillPoints, dustSpent: dustCost }
  }
}
