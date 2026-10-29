import Boom from '@hapi/boom'

import { errorMessage } from '../../infra/i18n/error-messages'
import type { PostgresOrm } from '../../infra/orm/postgres-client'
import type { IocContainer } from '../../types/application/ioc'
import type {
  InvestResult,
  ISkillInvestDomain,
} from '../../types/domain/skills/skill-tree.domain.interface'
import type { ISkillTreeRepository } from '../../types/infra/orm/repositories/skill-tree.repository.interface'
import type { UserRepositoryInterface } from '../../types/infra/orm/repositories/user.repository.interface'
import { loadTokenCreditCtx } from '../economy/token-credit'
import { settleRegenInTx } from './settle-regen'

export class SkillInvestDomain implements ISkillInvestDomain {
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

  async invest(userId: string, nodeId: string): Promise<InvestResult> {
    const user = await this.#userRepository.findById(userId)
    if (!user) {
      throw Boom.notFound(errorMessage('user.notFound'))
    }
    if (user.skillPoints < 1) {
      throw Boom.paymentRequired(errorMessage('skills.noPointsAvailable'))
    }

    const tree = await this.#skillTreeRepository.getFullTree()
    const node = tree.flatMap((b) => b.nodes).find((n) => n.id === nodeId)
    if (!node) {
      throw Boom.notFound(errorMessage('skills.nodeNotFound'))
    }

    const userSkills = await this.#skillTreeRepository.getUserSkills(userId)
    const skillMap = Object.fromEntries(
      userSkills.map((s) => [s.nodeId, s.level]),
    )

    const currentLevel = skillMap[nodeId] ?? 0
    if (currentLevel >= node.maxLevel) {
      throw Boom.conflict(errorMessage('skills.nodeAlreadyMaxLevel'))
    }

    // Verify prerequisites: all parent nodes must have >= minLevel
    for (const edge of node.edgesTo) {
      const parentLevel = skillMap[edge.fromNodeId] ?? 0
      if (parentLevel < edge.minLevel) {
        throw Boom.forbidden(
          errorMessage('skills.prerequisiteNotMet', {
            node: edge.fromNodeId,
            level: edge.minLevel,
          }),
        )
      }
    }

    const settleCtx = await loadTokenCreditCtx(this.#regenDeps, userId)
    const result = await this.#postgresOrm.executeWithTransactionClient(
      async (tx) => {
        await settleRegenInTx(tx, userId, settleCtx, this.#combatPointsTx)
        const skill = await this.#skillTreeRepository.upsertUserSkillInTx(
          tx,
          userId,
          nodeId,
          currentLevel + 1,
        )
        const updated = await tx.user.update({
          where: { id: userId },
          data: { skillPoints: { decrement: 1 } },
        })
        return { skill, skillPoints: updated.skillPoints }
      },
      { isolationLevel: 'Serializable', maxWait: 5000, timeout: 10000 },
    )

    return {
      nodeId,
      newLevel: result.skill.level,
      skillPoints: result.skillPoints,
    }
  }
}
