import type { IocContainer } from '../../types/application/ioc'
import type { ISkillTreeRepository } from '../../types/infra/orm/repositories/skill-tree.repository.interface'

export class AdminSkillTreeDomain {
  readonly #repo: ISkillTreeRepository

  constructor({ skillTreeRepository }: IocContainer) {
    this.#repo = skillTreeRepository
  }

  getTree() { return this.#repo.getFullTree() }
  getConfig() { return this.#repo.getSkillConfig() }

  createBranch(data: Parameters<ISkillTreeRepository['createBranch']>[0]) {
    return this.#repo.createBranch(data)
  }
  updateBranch(id: string, data: Parameters<ISkillTreeRepository['updateBranch']>[1]) {
    return this.#repo.updateBranch(id, data)
  }
  deleteBranch(id: string) { return this.#repo.deleteBranch(id) }

  createNode(data: Parameters<ISkillTreeRepository['createNode']>[0]) {
    return this.#repo.createNode(data)
  }
  updateNode(id: string, data: Parameters<ISkillTreeRepository['updateNode']>[1]) {
    return this.#repo.updateNode(id, data)
  }
  deleteNode(id: string) { return this.#repo.deleteNode(id) }

  createEdge(fromNodeId: string, toNodeId: string, minLevel: number) {
    return this.#repo.createEdge(fromNodeId, toNodeId, minLevel)
  }
  deleteEdge(fromNodeId: string, toNodeId: string) {
    return this.#repo.deleteEdge(fromNodeId, toNodeId)
  }

  updateConfig(data: Parameters<ISkillTreeRepository['updateSkillConfig']>[0]) {
    return this.#repo.updateSkillConfig(data)
  }
}
