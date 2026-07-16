import Boom from '@hapi/boom'

import type { PostgresOrm } from '../../infra/orm/postgres-client'
import type { IocContainer } from '../../types/application/ioc'
import type {
  ICollectionDomain,
  RecycleInput,
  RecycleResult,
} from '../../types/domain/collection/collection.domain.interface'
import type {
  ConfigKey,
  ConfigServiceInterface,
} from '../../types/infra/config/config.service.interface'
import type { ICardRepository } from '../../types/infra/orm/repositories/card.repository.interface'
import type { ISkillTreeRepository } from '../../types/infra/orm/repositories/skill-tree.repository.interface'
import type { AchievementsDomainInterface } from '../achievements/achievements.domain.interface'

export class CollectionDomain implements ICollectionDomain {
  readonly #cardRepository: ICardRepository
  readonly #skillTreeRepository: ISkillTreeRepository
  readonly #configService: ConfigServiceInterface
  readonly #postgresOrm: PostgresOrm
  readonly #achievementsDomain: AchievementsDomainInterface

  constructor({
    cardRepository,
    skillTreeRepository,
    configService,
    postgresOrm,
    achievementsDomain,
  }: Pick<
    IocContainer,
    | 'cardRepository'
    | 'skillTreeRepository'
    | 'configService'
    | 'postgresOrm'
    | 'achievementsDomain'
  >) {
    this.#cardRepository = cardRepository
    this.#skillTreeRepository = skillTreeRepository
    this.#configService = configService
    this.#postgresOrm = postgresOrm
    this.#achievementsDomain = achievementsDomain
  }

  async recycleCard(
    userId: string,
    input: RecycleInput,
  ): Promise<RecycleResult> {
    const { cardId, quantity, variant } = input

    const card = await this.#cardRepository.findById(cardId)
    if (!card) {
      throw Boom.notFound('Card not found')
    }

    const dustKey =
      `dust${card.rarity.charAt(0) + card.rarity.slice(1).toLowerCase()}` as ConfigKey
    const baseDust = await this.#configService.get(dustKey)

    const upgrades = await this.#skillTreeRepository.getEffectsForUser(userId)

    const dustEarned = Math.round(
      baseDust * upgrades.dustHarvestMultiplier * quantity,
    )

    const result = await this.#postgresOrm.executeWithTransactionClient(
      async (tx) => {
        const uc = await tx.userCard.findUnique({
          where: { userId_cardId_variant: { userId, cardId, variant } },
        })
        if (!uc || uc.quantity < quantity) {
          throw Boom.badRequest('You do not own this card')
        }

        if (uc.quantity - quantity <= 0) {
          await tx.userCard.delete({
            where: { userId_cardId_variant: { userId, cardId, variant } },
          })
        } else {
          await tx.userCard.update({
            where: { userId_cardId_variant: { userId, cardId, variant } },
            data: { quantity: { decrement: quantity } },
          })
        }

        const user = await tx.user.update({
          where: { id: userId },
          data: {
            dust: { increment: dustEarned },
            dustGenerated: { increment: dustEarned },
          },
        })

        const recycleUnlocks = await this.#achievementsDomain.track(
          tx,
          userId,
          {
            kind: 'CARD_RECYCLED',
            amount: quantity,
          },
        )

        return {
          dustEarned,
          newDustTotal: user.dust,
          unlockedAchievements: recycleUnlocks,
        }
      },
      { isolationLevel: 'Serializable', maxWait: 5000, timeout: 10000 },
    )

    return result
  }
}
