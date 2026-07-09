import Boom from '@hapi/boom'

import type { PostgresOrm } from '../../infra/orm/postgres-client'
import type { IocContainer } from '../../types/application/ioc'
import type {
  InvestBatchResult,
  ISkillInvestBatchDomain,
  SkillAllocation,
} from '../../types/domain/skills/skill-tree.domain.interface'
import type {
  ISkillTreeRepository,
  SkillNodeWithLevelsAndEdges,
} from '../../types/infra/orm/repositories/skill-tree.repository.interface'
import type { UserRepositoryInterface } from '../../types/infra/orm/repositories/user.repository.interface'

export class SkillInvestBatchDomain implements ISkillInvestBatchDomain {
  readonly #skillTreeRepository: ISkillTreeRepository
  readonly #userRepository: UserRepositoryInterface
  readonly #postgresOrm: PostgresOrm

  constructor({
    skillTreeRepository,
    userRepository,
    postgresOrm,
  }: IocContainer) {
    this.#skillTreeRepository = skillTreeRepository
    this.#userRepository = userRepository
    this.#postgresOrm = postgresOrm
  }

  async investBatch(
    userId: string,
    allocations: SkillAllocation[],
  ): Promise<InvestBatchResult> {
    // Collapse duplicate nodeIds into a single total-per-node
    const addByNode = new Map<string, number>()
    for (const { nodeId, levels } of allocations) {
      addByNode.set(nodeId, (addByNode.get(nodeId) ?? 0) + levels)
    }

    const totalPoints = [...addByNode.values()].reduce((a, b) => a + b, 0)
    if (totalPoints < 1) {
      throw Boom.badRequest('No allocations provided')
    }

    const user = await this.#userRepository.findById(userId)
    if (!user) {
      throw Boom.notFound('User not found')
    }
    if (user.skillPoints < totalPoints) {
      throw Boom.paymentRequired('Not enough skill points')
    }

    const [tree, userSkills] = await Promise.all([
      this.#skillTreeRepository.getFullTree(),
      this.#skillTreeRepository.getUserSkills(userId),
    ])
    const nodeById = new Map(tree.flatMap((b) => b.nodes).map((n) => [n.id, n]))

    const finalLevel = this.#computeFinalLevels(addByNode, nodeById, userSkills)
    this.#assertPrerequisites(addByNode, nodeById, finalLevel)

    const result = await this.#postgresOrm.executeWithTransactionClient(
      async (tx) => {
        for (const nodeId of addByNode.keys()) {
          await this.#skillTreeRepository.upsertUserSkillInTx(
            tx,
            userId,
            nodeId,
            finalLevel.get(nodeId) ?? 0,
          )
        }
        const updated = await tx.user.update({
          where: { id: userId },
          data: { skillPoints: { decrement: totalPoints } },
        })
        return updated
      },
      { isolationLevel: 'Serializable', maxWait: 5000, timeout: 10000 },
    )

    return { skillPoints: result.skillPoints }
  }

  /** Saved levels overlaid with the requested additions; validates existence + max level. */
  #computeFinalLevels(
    addByNode: Map<string, number>,
    nodeById: Map<string, SkillNodeWithLevelsAndEdges>,
    userSkills: { nodeId: string; level: number }[],
  ): Map<string, number> {
    const finalLevel = new Map<string, number>(
      userSkills.map((s) => [s.nodeId, s.level]),
    )
    for (const [nodeId, added] of addByNode) {
      const node = nodeById.get(nodeId)
      if (!node) {
        throw Boom.notFound(`Skill node not found: ${nodeId}`)
      }
      const target = (finalLevel.get(nodeId) ?? 0) + added
      if (target > node.maxLevel) {
        throw Boom.conflict(`Node ${nodeId} exceeds max level`)
      }
      finalLevel.set(nodeId, target)
    }
    return finalLevel
  }

  /**
   * Validate prerequisites against the FINAL state. A valid final DAG state
   * always has a valid incremental order, so applying all at once is safe.
   */
  #assertPrerequisites(
    addByNode: Map<string, number>,
    nodeById: Map<string, SkillNodeWithLevelsAndEdges>,
    finalLevel: Map<string, number>,
  ): void {
    for (const nodeId of addByNode.keys()) {
      const node = nodeById.get(nodeId)
      if (!node) {
        continue
      }
      for (const edge of node.edgesTo) {
        if ((finalLevel.get(edge.fromNodeId) ?? 0) < edge.minLevel) {
          throw Boom.forbidden(
            `Prerequisite not met: node ${edge.fromNodeId} requires level ${edge.minLevel}`,
          )
        }
      }
    }
  }
}
