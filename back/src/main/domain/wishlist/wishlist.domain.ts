import Boom from '@hapi/boom'

import { errorMessage } from '../../infra/i18n/error-messages'
import type { IocContainer } from '../../types/application/ioc'
import type {
  IWishlistDomain,
  PurchaseWishlistResult,
  WishlistStatus,
} from '../../types/domain/wishlist/wishlist.domain.interface'
import type { ConfigServiceInterface } from '../../types/infra/config/config.service.interface'
import type { PostgresORMInterface } from '../../types/infra/orm/client'
import type { ISkillTreeRepository } from '../../types/infra/orm/repositories/skill-tree.repository.interface'
import type { IUserCardRepository } from '../../types/infra/orm/repositories/user-card.repository.interface'

const RARITY_PRICE_KEYS = {
  COMMON: 'dailyShopPriceCommon',
  UNCOMMON: 'dailyShopPriceUncommon',
  RARE: 'dailyShopPriceRare',
  EPIC: 'dailyShopPriceEpic',
  LEGENDARY: 'dailyShopPriceLegendary',
} as const

const RARITY_MULTIPLIER_KEYS = {
  COMMON: 'wishlist.priceMultiplierCommon',
  UNCOMMON: 'wishlist.priceMultiplierUncommon',
  RARE: 'wishlist.priceMultiplierRare',
  EPIC: 'wishlist.priceMultiplierEpic',
  LEGENDARY: 'wishlist.priceMultiplierLegendary',
} as const

/** Clés de config nécessaires au calcul d'un prix de vœu, quelle que soit la rareté. */
export const WISHLIST_PRICE_CONFIG_KEYS = [
  ...Object.values(RARITY_PRICE_KEYS),
  ...Object.values(RARITY_MULTIPLIER_KEYS),
] as const

/**
 * Prix d'un vœu : prix de la boutique du jour pour la rareté × le facteur de
 * CETTE rareté. Le facteur mesure ce que coûte le fait de CHOISIR la carte
 * plutôt que de la subir au hasard — il est donc toujours > 1.
 *
 * `shopDiscount` n'est PAS appliqué : l'achat ciblé est le service premium du
 * jeu — la seule façon d'obtenir une carte choisie — et il a perdu son délai
 * d'attente. Le plein tarif est devenu son unique frein.
 */
export function wishlistPriceFor(
  rarity: string,
  c: Record<string, number>,
): number {
  const priceKey = RARITY_PRICE_KEYS[rarity as keyof typeof RARITY_PRICE_KEYS]
  const multiplierKey =
    RARITY_MULTIPLIER_KEYS[rarity as keyof typeof RARITY_MULTIPLIER_KEYS]
  const rarityBasePrice = priceKey ? (c[priceKey] ?? 50) : 50
  const multiplier = multiplierKey ? (c[multiplierKey] ?? 1) : 1
  return Math.max(0, Math.round(rarityBasePrice * multiplier))
}

/** Emplacements de vœu sans aucun point d'arbre. « Collectionneur » en ajoute jusqu'à 3. */
export const BASE_WISHLIST_SLOTS = 2

export function wishlistSlots(bonus: number): number {
  return BASE_WISHLIST_SLOTS + Math.max(0, bonus)
}

function isPrismaSerializationError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === 'P2034'
  )
}

export class WishlistDomain implements IWishlistDomain {
  readonly #postgresOrm: PostgresORMInterface
  readonly #configService: ConfigServiceInterface
  readonly #userCardRepository: IUserCardRepository
  readonly #skillTreeRepository: ISkillTreeRepository

  constructor({
    postgresOrm,
    configService,
    userCardRepository,
    skillTreeRepository,
  }: IocContainer) {
    this.#postgresOrm = postgresOrm
    this.#configService = configService
    this.#userCardRepository = userCardRepository
    this.#skillTreeRepository = skillTreeRepository
  }

  async getStatus(userId: string): Promise<WishlistStatus> {
    const [rows, c, effects] = await Promise.all([
      this.#postgresOrm.prisma.userWishlistCard.findMany({
        where: { userId },
        include: { card: { include: { set: true } } },
        orderBy: { addedAt: 'asc' },
      }),
      this.#configService.getMany(...WISHLIST_PRICE_CONFIG_KEYS),
      this.#skillTreeRepository.getEffectsForUser(userId),
    ])

    return {
      slots: wishlistSlots(effects.wishlistSlots ?? 0),
      cards: rows.map((row) => ({
        id: row.card.id,
        name: row.card.name,
        imageUrl: row.card.imageUrl,
        rarity: row.card.rarity,
        element: row.card.element,
        set: { id: row.card.set.id, name: row.card.set.name },
        price: wishlistPriceFor(row.card.rarity, c),
      })),
    }
  }

  async addWish(userId: string, cardId: string): Promise<void> {
    const [card, effects] = await Promise.all([
      this.#postgresOrm.prisma.card.findUnique({
        where: { id: cardId },
        include: { set: true },
      }),
      this.#skillTreeRepository.getEffectsForUser(userId),
    ])
    if (!card || !card.set.isActive) {
      throw Boom.notFound(errorMessage('wishlist.cardNotFoundOrInactive'))
    }
    const slots = wishlistSlots(effects.wishlistSlots ?? 0)

    // Le comptage et l'insertion tiennent dans UNE transaction sérialisable :
    // deux ajouts concurrents verraient sinon le même compte et dépasseraient
    // le plafond à deux.
    await this.#postgresOrm.executeWithTransactionClient(
      async (tx) => {
        const already = await tx.userWishlistCard.findUnique({
          where: { userId_cardId: { userId, cardId } },
        })
        if (already) {
          return
        }
        const count = await tx.userWishlistCard.count({ where: { userId } })
        if (count >= slots) {
          throw Boom.conflict(errorMessage('wishlist.full', { slots }))
        }
        await tx.userWishlistCard.create({ data: { userId, cardId } })
      },
      { isolationLevel: 'Serializable' },
    )
  }

  async removeWish(userId: string, cardId: string): Promise<void> {
    await this.#postgresOrm.prisma.userWishlistCard.deleteMany({
      where: { userId, cardId },
    })
  }

  async purchase(
    userId: string,
    cardId: string,
  ): Promise<PurchaseWishlistResult> {
    const [wish, c] = await Promise.all([
      this.#postgresOrm.prisma.userWishlistCard.findUnique({
        where: { userId_cardId: { userId, cardId } },
        include: { card: { include: { set: true } } },
      }),
      this.#configService.getMany(...WISHLIST_PRICE_CONFIG_KEYS),
    ])

    if (!wish) {
      throw Boom.badRequest(errorMessage('wishlist.cardNotInWishlist'))
    }
    const card = wish.card
    const finalPrice = wishlistPriceFor(card.rarity, c)

    const attempt = async (): Promise<PurchaseWishlistResult> => {
      const result = await this.#postgresOrm.executeWithTransactionClient(
        async (tx) => {
          const u = await tx.user.findUniqueOrThrow({ where: { id: userId } })
          if (u.dust < finalPrice) {
            throw Boom.paymentRequired(errorMessage('economy.notEnoughDust'))
          }
          const updated = await tx.user.update({
            where: { id: userId },
            data: { dust: { decrement: finalPrice } },
          })
          const { wasDuplicate } = await this.#userCardRepository.upsertInTx(
            tx,
            userId,
            card.id,
            'NORMAL',
          )
          return { newDustBalance: updated.dust, wasDuplicate }
        },
        { isolationLevel: 'Serializable', maxWait: 5000, timeout: 10000 },
      )

      return {
        card: {
          id: card.id,
          name: card.name,
          imageUrl: card.imageUrl,
          rarity: card.rarity,
          element: card.element,
          set: { id: card.set.id, name: card.set.name },
          price: finalPrice,
        },
        wasDuplicate: result.wasDuplicate,
        dustSpent: finalPrice,
        newDustBalance: result.newDustBalance,
      }
    }

    const run = async (
      retriesLeft: number,
    ): Promise<PurchaseWishlistResult> => {
      try {
        return await attempt()
      } catch (err: unknown) {
        if (retriesLeft > 0 && isPrismaSerializationError(err)) {
          return run(retriesLeft - 1)
        }
        throw err
      }
    }

    return run(3)
  }
}
