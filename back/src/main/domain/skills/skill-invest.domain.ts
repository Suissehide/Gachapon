import Boom from '@hapi/boom'
import type { IocContainer } from '../../types/application/ioc'
import type { ISkillInvestDomain, InvestResult } from '../../types/domain/skills/skill-tree.domain.interface'
import type { ISkillTreeRepository } from '../../types/infra/orm/repositories/skill-tree.repository.interface'
import type { UserRepositoryInterface } from '../../types/infra/orm/repositories/user.repository.interface'
import type { PostgresOrm } from '../../infra/orm/postgres-client'

export class SkillInvestDomain implements ISkillInvestDomain {
  readonly #skillTreeRepository: ISkillTreeRepository
  readonly #userRepository: UserRepositoryInterface
  readonly #postgresOrm: PostgresOrm

  constructor({ skillTreeRepository, userRepository, postgresOrm }: IocContainer) {
    this.#skillTreeRepository = skillTreeRepository
    this.#userRepository = userRepository
    this.#postgresOrm = postgresOrm
  }

  async invest(userId: string, nodeId: string): Promise<InvestResult> {
    const user = await this.#userRepository.findById(userId)
    if (!user) throw Boom.notFound('User not found')
    if (user.skillPoints < 1) throw Boom.paymentRequired('No skill points available')

    const tree = await this.#skillTreeRepository.getFullTree()
    const node = tree.flatMap((b) => b.nodes).find((n) => n.id === nodeId)
    if (!node) throw Boom.notFound('Skill node not found')

    const userSkills = await this.#skillTreeRepository.getUserSkills(userId)
    const skillMap = Object.fromEntries(userSkills.map((s) => [s.nodeId, s.level]))

    const currentLevel = skillMap[nodeId] ?? 0
    if (currentLevel >= node.maxLevel) throw Boom.conflict('Node already at max level')

    // Verify prerequisites: all parent nodes must have >= minLevel
    for (const edge of node.edgesTo) {
      const parentLevel = skillMap[edge.fromNodeId] ?? 0
      if (parentLevel < edge.minLevel) {
        throw Boom.forbidden(`Prerequisite not met: node ${edge.fromNodeId} requires level ${edge.minLevel}`)
      }
    }

    const result = await this.#postgresOrm.executeWithTransactionClient(
      async (tx) => {
        const skill = await this.#skillTreeRepository.upsertUserSkillInTx(
          tx, userId, nodeId, currentLevel + 1,
        )
        const updated = await tx.user.update({
          where: { id: userId },
          data: { skillPoints: { decrement: 1 } },
        })
        return { skill, skillPoints: updated.skillPoints }
      },
      { isolationLevel: 'Serializable', maxWait: 5000, timeout: 10000 },
    )

    return { nodeId, newLevel: result.skill.level, skillPoints: result.skillPoints }
  }
}
