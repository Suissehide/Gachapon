import Boom from '@hapi/boom'

import type { PostgresOrm } from '../../infra/orm/postgres-client'
import type { IocContainer } from '../../types/application/ioc'
import type {
  BuyUpgradeResult,
  IUpgradePurchaseDomain,
  UpgradeType,
  UserUpgradeInfo,
} from '../../types/domain/economy/upgrade-purchase.domain.interface'
import type { IUpgradeRepository } from '../../types/infra/orm/repositories/upgrade.repository.interface'
import type { UserRepositoryInterface } from '../../types/infra/orm/repositories/user.repository.interface'

const UPGRADE_TYPES: UpgradeType[] = [
  'REGEN',
  'LUCK',
  'DUST_HARVEST',
  'TOKEN_VAULT',
]
const MAX_LEVEL = 4

export class UpgradePurchaseDomain implements IUpgradePurchaseDomain {
  readonly #upgradeRepository: IUpgradeRepository
  readonly #userRepository: UserRepositoryInterface
  readonly #postgresOrm: PostgresOrm

  constructor({
    upgradeRepository,
    userRepository,
    postgresOrm,
  }: IocContainer) {
    this.#upgradeRepository = upgradeRepository
    this.#userRepository = userRepository
    this.#postgresOrm = postgresOrm
  }

  async getUserUpgradesInfo(userId: string): Promise<UserUpgradeInfo[]> {
    const [userUpgrades, allConfigs, user] = await Promise.all([
      this.#upgradeRepository.findUserUpgradesByUserId(userId),
      this.#upgradeRepository.findAllConfigs(),
      this.#userRepository.findById(userId),
    ])

    const levelByType = Object.fromEntries(
      userUpgrades.map((u) => [u.type, u.level]),
    ) as Record<string, number>

    const dust = user?.dust ?? 0

    return UPGRADE_TYPES.map((type) => {
      const currentLevel = levelByType[type] ?? 0
      const currentConfig = allConfigs.find(
        (c) => c.type === type && c.level === currentLevel,
      )
      const nextConfig =
        currentLevel < MAX_LEVEL
          ? allConfigs.find(
              (c) => c.type === type && c.level === currentLevel + 1,
            )
          : null

      return {
        type,
        currentLevel,
        currentEffect: currentConfig?.effect ?? null,
        nextLevel: nextConfig ? currentLevel + 1 : null,
        nextEffect: nextConfig?.effect ?? null,
        nextCost: nextConfig?.dustCost ?? null,
        canAfford: nextConfig ? dust >= nextConfig.dustCost : false,
        isMaxed: currentLevel >= MAX_LEVEL,
      }
    })
  }

  async buy(userId: string, type: UpgradeType): Promise<BuyUpgradeResult> {
    const existing = await this.#upgradeRepository.findUserUpgradeByType(
      userId,
      type,
    )
    const currentLevel = existing?.level ?? 0

    if (currentLevel >= MAX_LEVEL) {
      throw Boom.conflict('Upgrade already at maximum level')
    }

    const nextLevel = currentLevel + 1
    const config = await this.#upgradeRepository.findConfigByTypeLevel(
      type,
      nextLevel,
    )
    if (!config) {
      throw Boom.internal('Upgrade config not found')
    }

    const result = await this.#postgresOrm.executeWithTransactionClient(
      async (tx) => {
        const user = await tx.user.findUniqueOrThrow({ where: { id: userId } })
        if (user.dust < config.dustCost) {
          throw Boom.paymentRequired('Not enough dust')
        }

        const upgrade = await tx.userUpgrade.upsert({
          where: { userId_type: { userId, type: type as UpgradeType } },
          create: { userId, type: type as UpgradeType, level: nextLevel },
          update: { level: nextLevel },
        })

        const updated = await tx.user.update({
          where: { id: userId },
          data: { dust: { decrement: config.dustCost } },
        })

        return { upgrade, newDustTotal: updated.dust }
      },
      { isolationLevel: 'Serializable', maxWait: 5000, timeout: 10000 },
    )

    return {
      type,
      newLevel: result.upgrade.level,
      effect: config.effect,
      newDustTotal: result.newDustTotal,
    }
  }
}
