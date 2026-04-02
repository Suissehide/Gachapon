import { getSkillEffects } from '../../../domain/skills/skill-effects.domain'
import type { UserUpgradeEffects } from '../../../types/domain/economy/economy.types'
import type { IocContainer } from '../../../types/application/ioc'
import type { ISkillTreeRepository, SkillBranchWithNodes } from '../../../types/infra/orm/repositories/skill-tree.repository.interface'
import type { PostgresPrismaClient } from '../postgres-client'

export class SkillTreeRepository implements ISkillTreeRepository {
  readonly #prisma: PostgresPrismaClient

  constructor({ postgresOrm }: IocContainer) {
    this.#prisma = postgresOrm.prisma
  }

  async getEffectsForUser(userId: string): Promise<UserUpgradeEffects> {
    const userSkills = await this.#prisma.userSkill.findMany({
      where: { userId },
      include: { node: { include: { levels: true } } },
    })
    const rows = userSkills.map((us) => {
      const levelConfig = us.node.levels.find((l) => l.level === us.level)
      return { effectType: us.node.effectType, effect: levelConfig?.effect ?? 0 }
    })
    return getSkillEffects(rows)
  }

  getFullTree(): Promise<SkillBranchWithNodes[]> {
    return this.#prisma.skillBranch.findMany({
      orderBy: { order: 'asc' },
      include: {
        nodes: {
          include: {
            levels: { orderBy: { level: 'asc' } },
            edgesFrom: true,
            edgesTo: true,
          },
        },
      },
    }) as Promise<SkillBranchWithNodes[]>
  }

  getUserSkills(userId: string) {
    return this.#prisma.userSkill.findMany({ where: { userId } })
  }

  getSkillConfig() {
    return this.#prisma.skillConfig.upsert({
      where: { id: 1 },
      create: { id: 1, resetCostPerPoint: 50 },
      update: {},
    })
  }

  async getTotalInvestedPoints(userId: string): Promise<number> {
    const skills = await this.#prisma.userSkill.findMany({ where: { userId } })
    return skills.reduce((sum, s) => sum + s.level, 0)
  }

  upsertUserSkillInTx(tx: any, userId: string, nodeId: string, level: number) {
    return tx.userSkill.upsert({
      where: { userId_nodeId: { userId, nodeId } },
      create: { userId, nodeId, level },
      update: { level },
    })
  }

  deleteUserSkillsInTx(tx: any, userId: string) {
    return tx.userSkill.deleteMany({ where: { userId } })
  }

  createBranch(data: { name: string; description: string; icon: string; color: string; order: number }) {
    return this.#prisma.skillBranch.create({ data })
  }

  updateBranch(id: string, data: Partial<{ name: string; description: string; icon: string; color: string; order: number }>) {
    return this.#prisma.skillBranch.update({ where: { id }, data })
  }

  async deleteBranch(id: string): Promise<void> {
    await this.#prisma.skillBranch.delete({ where: { id } })
  }

  async createNode(data: { branchId: string; name: string; description: string; icon: string; maxLevel: number; effectType: string; posX: number; posY: number; levels: { level: number; effect: number }[] }) {
    const { levels, ...nodeData } = data
    return this.#prisma.skillNode.create({
      data: {
        ...nodeData,
        effectType: nodeData.effectType as any,
        levels: { create: levels },
      },
    })
  }

  async updateNode(id: string, data: Partial<{ name: string; description: string; icon: string; maxLevel: number; effectType: string; posX: number; posY: number; levels: { level: number; effect: number }[] }>) {
    const { levels, ...rest } = data
    if (levels !== undefined) {
      await this.#prisma.skillNodeLevel.deleteMany({ where: { nodeId: id } })
      await this.#prisma.skillNodeLevel.createMany({ data: levels.map((l) => ({ ...l, nodeId: id })) })
    }
    return this.#prisma.skillNode.update({ where: { id }, data: rest as any })
  }

  async deleteNode(id: string): Promise<void> {
    await this.#prisma.skillNode.delete({ where: { id } })
  }

  createEdge(fromNodeId: string, toNodeId: string, minLevel: number) {
    return this.#prisma.skillEdge.create({ data: { fromNodeId, toNodeId, minLevel } })
  }

  async deleteEdge(fromNodeId: string, toNodeId: string): Promise<void> {
    await this.#prisma.skillEdge.delete({ where: { fromNodeId_toNodeId: { fromNodeId, toNodeId } } })
  }

  updateSkillConfig(data: Partial<{ resetCostPerPoint: number }>) {
    return this.#prisma.skillConfig.upsert({
      where: { id: 1 },
      create: { id: 1, resetCostPerPoint: data.resetCostPerPoint ?? 50 },
      update: data,
    })
  }
}
