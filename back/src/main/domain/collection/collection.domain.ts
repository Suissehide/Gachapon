import Boom from '@hapi/boom'

import type { PostgresOrm } from '../../infra/orm/postgres-client'
import type { IocContainer } from '../../types/application/ioc'
import type {
  ICollectionDomain,
  RecycleAllResult,
  RecycleInput,
  RecycleResult,
} from '../../types/domain/collection/collection.domain.interface'
import type { CardRarity } from '../../types/domain/gacha/gacha.types'
import type {
  ConfigKey,
  ConfigServiceInterface,
} from '../../types/infra/config/config.service.interface'
import type { ICardRepository } from '../../types/infra/orm/repositories/card.repository.interface'
import type { ISkillTreeRepository } from '../../types/infra/orm/repositories/skill-tree.repository.interface'
import type { AchievementsDomainInterface } from '../achievements/achievements.domain.interface'
import type { IDuelDomain } from '../../types/domain/wagers/wagers.domain.interface'
import { retryOnSerialization } from '../shared/retry-serialization'

const RARITY_ORDER: CardRarity[] = [
  'COMMON',
  'UNCOMMON',
  'RARE',
  'EPIC',
  'LEGENDARY',
]

export const raritiesUpTo = (maxRarity: CardRarity): CardRarity[] =>
  RARITY_ORDER.slice(0, RARITY_ORDER.indexOf(maxRarity) + 1)

export const computeBulkRecycle = (
  cards: { rarity: CardRarity; quantity: number }[],
  rates: Record<CardRarity, number>,
  multiplier: number,
): { dustEarned: number; copiesRecycled: number } => {
  let dustEarned = 0
  let copiesRecycled = 0
  for (const card of cards) {
    const copies = card.quantity - 1
    if (copies <= 0) {
      continue
    }
    dustEarned += Math.round(rates[card.rarity] * multiplier * copies)
    copiesRecycled += copies
  }
  return { dustEarned, copiesRecycled }
}

export class CollectionDomain implements ICollectionDomain {
  readonly #cardRepository: ICardRepository
  readonly #skillTreeRepository: ISkillTreeRepository
  readonly #configService: ConfigServiceInterface
  readonly #postgresOrm: PostgresOrm
  readonly #achievementsDomain: AchievementsDomainInterface
  readonly #duelDomain: IDuelDomain

  constructor({
    cardRepository,
    skillTreeRepository,
    configService,
    postgresOrm,
    achievementsDomain,
    duelDomain,
  }: Pick<
    IocContainer,
    | 'cardRepository'
    | 'skillTreeRepository'
    | 'configService'
    | 'postgresOrm'
    | 'achievementsDomain'
  > & { duelDomain: IDuelDomain }) {
    this.#cardRepository = cardRepository
    this.#skillTreeRepository = skillTreeRepository
    this.#configService = configService
    this.#postgresOrm = postgresOrm
    this.#achievementsDomain = achievementsDomain
    this.#duelDomain = duelDomain
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

    const result = await retryOnSerialization(() =>
      this.#postgresOrm.executeWithTransactionClient(
        async (tx) => {
          await this.#duelDomain.assertCardNotEngagedInTx(
            tx,
            userId,
            cardId,
            variant,
          )

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
      ),
    )

    return result
  }

  async recycleAllBelow(
    userId: string,
    maxRarity: CardRarity,
  ): Promise<RecycleAllResult> {
    const rarities = raritiesUpTo(maxRarity)

    const rates = await this.#configService.getMany(
      'dustCommon',
      'dustUncommon',
      'dustRare',
      'dustEpic',
      'dustLegendary',
    )
    const ratesByRarity: Record<CardRarity, number> = {
      COMMON: rates.dustCommon,
      UNCOMMON: rates.dustUncommon,
      RARE: rates.dustRare,
      EPIC: rates.dustEpic,
      LEGENDARY: rates.dustLegendary,
    }

    const upgrades = await this.#skillTreeRepository.getEffectsForUser(userId)

    return retryOnSerialization(() =>
      this.#postgresOrm.executeWithTransactionClient(
        async (tx) => {
          const userCards = await tx.userCard.findMany({
            where: {
              userId,
              variant: 'NORMAL',
              quantity: { gt: 1 },
              card: { rarity: { in: rarities } },
            },
            include: { card: { select: { rarity: true } } },
          })

          // Chargé une seule fois pour tout le lot : une carte engagée est
          // IGNORÉE plutôt que refusée — faire échouer tout le recyclage de
          // masse pour une seule carte verrouillée serait hostile.
          const engagedKeys = await this.#duelDomain.listEngagedCardKeysInTx(
            tx,
            userId,
          )
          const candidates = userCards.filter(
            (uc) => !engagedKeys.has(`${uc.cardId}:${uc.variant}`),
          )
          // Même base que cardsRecycled (copies, pas lignes) : les deux
          // champs sont affichés côte à côte au joueur, ils doivent être
          // comparables un à un.
          const skippedEngaged = userCards
            .filter((uc) => engagedKeys.has(`${uc.cardId}:${uc.variant}`))
            .reduce((sum, uc) => sum + (uc.quantity - 1), 0)

          const { dustEarned, copiesRecycled } = computeBulkRecycle(
            candidates.map((uc) => ({
              rarity: uc.card.rarity,
              quantity: uc.quantity,
            })),
            ratesByRarity,
            upgrades.dustHarvestMultiplier,
          )

          if (copiesRecycled === 0) {
            const user = await tx.user.findUniqueOrThrow({
              where: { id: userId },
            })
            return {
              dustEarned: 0,
              cardsRecycled: 0,
              newDustTotal: user.dust,
              unlockedAchievements: [],
              skippedEngaged,
            }
          }

          await tx.userCard.updateMany({
            where: { id: { in: candidates.map((uc) => uc.id) } },
            data: { quantity: 1 },
          })

          const user = await tx.user.update({
            where: { id: userId },
            data: {
              dust: { increment: dustEarned },
              dustGenerated: { increment: dustEarned },
            },
          })

          const unlocks = await this.#achievementsDomain.track(tx, userId, {
            kind: 'CARD_RECYCLED',
            amount: copiesRecycled,
          })

          return {
            dustEarned,
            cardsRecycled: copiesRecycled,
            newDustTotal: user.dust,
            unlockedAchievements: unlocks,
            skippedEngaged,
          }
        },
        { isolationLevel: 'Serializable', maxWait: 5000, timeout: 10000 },
      ),
    )
  }
}
