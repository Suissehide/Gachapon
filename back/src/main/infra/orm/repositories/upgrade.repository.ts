import {
  getUpgradeEffectsFromRows,
  type UserUpgradeEffects,
} from '../../../domain/economy/upgrade.domain'
import type { IocContainer } from '../../../types/application/ioc'
import type { UpgradeConfig, UserUpgrade } from '../../../../generated/client'
import type { PrimaTransactionClient } from '../../../types/infra/orm/client'
import type { IUpgradeRepository } from '../../../types/infra/orm/repositories/upgrade.repository.interface'
import type { PostgresOrm, PostgresPrismaClient } from '../postgres-client'

export class UpgradeRepository implements IUpgradeRepository {
  readonly #prisma: PostgresPrismaClient
  readonly #postgresOrm: PostgresOrm

  constructor({ postgresOrm }: IocContainer) {
    this.#prisma = postgresOrm.prisma
    this.#postgresOrm = postgresOrm
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

  findAllConfigs(): Promise<UpgradeConfig[]> {
    return this.#prisma.upgradeConfig.findMany({
      orderBy: [{ type: 'asc' }, { level: 'asc' }],
    })
  }

  findUserUpgradesByUserId(userId: string): Promise<UserUpgrade[]> {
    return this.#prisma.userUpgrade.findMany({ where: { userId } })
  }

  findUserUpgradeByType(userId: string, type: string): Promise<UserUpgrade | null> {
    return this.#prisma.userUpgrade.findUnique({
      where: { userId_type: { userId, type: type as any } },
    })
  }

  findConfigByTypeLevel(type: string, level: number): Promise<UpgradeConfig | null> {
    return this.#prisma.upgradeConfig.findUnique({
      where: { type_level: { type: type as any, level } },
    })
  }

  async bulkUpdateConfigs(
    upgrades: { type: string; level: number; effect: number; dustCost: number }[],
  ): Promise<void> {
    await this.#postgresOrm.executeWithTransactionClient(
      (tx) => this.bulkUpdateConfigsInTx(tx, upgrades),
      { isolationLevel: 'Serializable', maxWait: 5000, timeout: 10000 },
    )
  }

  async bulkUpdateConfigsInTx(
    tx: PrimaTransactionClient,
    upgrades: { type: string; level: number; effect: number; dustCost: number }[],
  ): Promise<void> {
    for (const row of upgrades) {
      await tx.upgradeConfig.update({
        where: { type_level: { type: row.type as any, level: row.level } },
        data: { effect: row.effect, dustCost: row.dustCost },
      })
    }
  }

  async upsertUserUpgradeInTx(
    tx: PrimaTransactionClient,
    userId: string,
    type: string,
    level: number,
  ): Promise<UserUpgrade> {
    return tx.userUpgrade.upsert({
      where: { userId_type: { userId, type: type as any } },
      create: { userId, type: type as any, level },
      update: { level },
    })
  }

  async decrementUserDustInTx(
    tx: PrimaTransactionClient,
    userId: string,
    amount: number,
  ): Promise<{ newDustTotal: number }> {
    const updated = await tx.user.update({
      where: { id: userId },
      data: { dust: { decrement: amount } },
    })
    return { newDustTotal: updated.dust }
  }
}
