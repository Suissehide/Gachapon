import Boom from '@hapi/boom'
import type { IocContainer } from '../../types/application/ioc'
import type { ISkillResetDomain, ResetResult } from '../../types/domain/skills/skill-tree.domain.interface'
import type { ISkillTreeRepository } from '../../types/infra/orm/repositories/skill-tree.repository.interface'
import type { UserRepositoryInterface } from '../../types/infra/orm/repositories/user.repository.interface'
import type { PostgresOrm } from '../../infra/orm/postgres-client'

export class SkillResetDomain implements ISkillResetDomain {
  readonly #skillTreeRepository: ISkillTreeRepository
  readonly #userRepository: UserRepositoryInterface
  readonly #postgresOrm: PostgresOrm

  constructor({ skillTreeRepository, userRepository, postgresOrm }: IocContainer) {
    this.#skillTreeRepository = skillTreeRepository
    this.#userRepository = userRepository
    this.#postgresOrm = postgresOrm
  }

  async reset(userId: string): Promise<ResetResult> {
    const [config, totalInvested, user] = await Promise.all([
      this.#skillTreeRepository.getSkillConfig(),
      this.#skillTreeRepository.getTotalInvestedPoints(userId),
      this.#userRepository.findById(userId),
    ])

    if (!user) throw Boom.notFound('User not found')
    if (totalInvested === 0) throw Boom.badRequest('No skill points invested')

    const dustCost = totalInvested * config.resetCostPerPoint
    if (user.dust < dustCost) throw Boom.paymentRequired('Not enough dust')

    const result = await this.#postgresOrm.executeWithTransactionClient(
      async (tx) => {
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
