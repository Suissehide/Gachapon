import {
  getUpgradeEffectsFromRows,
  type UserUpgradeEffects,
} from '../../../domain/economy/upgrade.domain'
import type { IocContainer } from '../../../types/application/ioc'
import type { IUpgradeRepository } from '../../../types/infra/orm/repositories/upgrade.repository.interface'
import type { PostgresPrismaClient } from '../postgres-client'

export class UpgradeRepository implements IUpgradeRepository {
  readonly #prisma: PostgresPrismaClient

  constructor({ postgresOrm }: IocContainer) {
    this.#prisma = postgresOrm.prisma
  }

  async getEffectsForUser(userId: string): Promise<UserUpgradeEffects> {
    const userUpgrades = await this.#prisma.userUpgrade.findMany({
      where: { userId },
    })

    if (userUpgrades.length === 0) {
      return {
        regenReductionMinutes: 0,
        luckMultiplier: 1.0,
        dustHarvestMultiplier: 1.0,
        tokenVaultBonus: 0,
      }
    }

    const configs = await this.#prisma.upgradeConfig.findMany({
      where: {
        OR: userUpgrades.map((u) => ({ type: u.type, level: u.level })),
      },
    })

    return getUpgradeEffectsFromRows(configs)
  }
}
