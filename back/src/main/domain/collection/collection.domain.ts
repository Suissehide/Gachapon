import Boom from '@hapi/boom'

import { errorMessage } from '../../infra/i18n/error-messages'
import type { PostgresOrm } from '../../infra/orm/postgres-client'
import type { IocContainer } from '../../types/application/ioc'
import type {
  ICollectionDomain,
  RecycleAllResult,
  RecycleInput,
  RecycleResult,
} from '../../types/domain/collection/collection.domain.interface'
import type {
  CardRarity,
  CardVariant,
} from '../../types/domain/gacha/gacha.types'
import type { IDuelDomain } from '../../types/domain/wagers/wagers.domain.interface'
import type {
  ConfigKey,
  ConfigServiceInterface,
} from '../../types/infra/config/config.service.interface'
import type { ICardRepository } from '../../types/infra/orm/repositories/card.repository.interface'
import type { ISkillTreeRepository } from '../../types/infra/orm/repositories/skill-tree.repository.interface'
import type { AchievementsDomainInterface } from '../achievements/achievements.domain.interface'
import { retryOnSerialization } from '../shared/retry-serialization'
import { hasFinish } from './finishes'

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
    const { cardId, quantity } = input

    const card = await this.#cardRepository.findById(cardId)
    if (!card) {
      throw Boom.notFound(errorMessage('collection.cardNotFound'))
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
          // Propriété d'ABORD, verrou de duel ensuite — comme sur les trois
          // autres chemins de retrait. Dans l'ordre inverse, une demande
          // portant sur une carte qu'on ne possède pas s'entendait répondre
          // « engagée dans un duel », ce qui renseigne sur autrui.
          const uc = await tx.userCard.findUnique({
            where: { userId_cardId: { userId, cardId } },
          })
          if (!uc || uc.quantity < quantity) {
            throw Boom.badRequest(errorMessage('collection.cardNotOwned'))
          }

          await this.#duelDomain.assertCardNotEngagedInTx(tx, userId, cardId)

          if (uc.quantity - quantity <= 0) {
            // On recycle des exemplaires, jamais un vernis : supprimer la
            // ligne effacerait les vernis débloqués.
            if (uc.finishes.length > 0) {
              throw Boom.badRequest(
                errorMessage('collection.lastCopyHasFinish'),
              )
            }
            await tx.userCard.delete({ where: { id: uc.id } })
          } else {
            await tx.userCard.update({
              where: { id: uc.id },
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
              quantity: { gt: 1 },
              card: { rarity: { in: rarities } },
            },
            include: { card: { select: { rarity: true } } },
          })

          // Chargé une seule fois pour tout le lot : une carte engagée est
          // IGNORÉE plutôt que refusée — faire échouer tout le recyclage de
          // masse pour une seule carte verrouillée serait hostile.
          const engaged = await this.#duelDomain.listEngagedCardIdsInTx(
            tx,
            userId,
          )
          const candidates = userCards.filter((uc) => !engaged.has(uc.cardId))
          // Même base que cardsRecycled (copies, pas lignes) : les deux
          // champs sont affichés côte à côte au joueur, ils doivent être
          // comparables un à un.
          const skippedEngaged = userCards
            .filter((uc) => engaged.has(uc.cardId))
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

  async setDisplayedFinish(
    userId: string,
    userCardId: string,
    finish: CardVariant,
  ): Promise<{ displayedFinish: CardVariant }> {
    const prisma = this.#postgresOrm.prisma
    const uc = await prisma.userCard.findUnique({
      where: { id: userCardId },
      select: { userId: true, finishes: true },
    })
    if (!uc || uc.userId !== userId) {
      throw Boom.notFound(errorMessage('collection.userCardNotFound'))
    }
    if (!hasFinish(uc.finishes, finish)) {
      throw Boom.badRequest(errorMessage('collection.finishLocked'))
    }
    await prisma.userCard.update({
      where: { id: userCardId },
      data: { displayedFinish: finish },
    })
    return { displayedFinish: finish }
  }
}
