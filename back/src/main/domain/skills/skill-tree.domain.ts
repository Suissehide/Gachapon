import type { IocContainer } from '../../types/application/ioc'
import type { ISkillTreeDomain, SkillTreeState } from '../../types/domain/skills/skill-tree.domain.interface'
import type { ISkillTreeRepository } from '../../types/infra/orm/repositories/skill-tree.repository.interface'
import type { UserRepositoryInterface } from '../../types/infra/orm/repositories/user.repository.interface'

export class SkillTreeDomain implements ISkillTreeDomain {
  readonly #skillTreeRepository: ISkillTreeRepository
  readonly #userRepository: UserRepositoryInterface

  constructor({ skillTreeRepository, userRepository }: IocContainer) {
    this.#skillTreeRepository = skillTreeRepository
    this.#userRepository = userRepository
  }

  async getState(userId: string): Promise<SkillTreeState> {
    const [branches, userSkills, config, user, totalInvested] = await Promise.all([
      this.#skillTreeRepository.getFullTree(),
      this.#skillTreeRepository.getUserSkills(userId),
      this.#skillTreeRepository.getSkillConfig(),
      this.#userRepository.findById(userId),
      this.#skillTreeRepository.getTotalInvestedPoints(userId),
    ])

    const skillPoints = user?.skillPoints ?? 0
    const resetCost = totalInvested * config.resetCostPerPoint

    return { branches, userSkills, skillPoints, totalInvested, resetCost }
  }
}
