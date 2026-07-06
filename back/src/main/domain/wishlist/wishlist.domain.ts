import Boom from '@hapi/boom'

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

function isPrismaSerializationError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === 'P2034'
  )
}

function computeAvailableAt(
  purchasedAt: Date | null,
  effectiveCooldownDays: number,
): string | null {
  if (purchasedAt === null) {
    return null
  }
  const at = new Date(
    purchasedAt.getTime() + effectiveCooldownDays * 24 * 60 * 60 * 1000,
  )
  return new Date() < at ? at.toISOString() : null
}

export class WishlistDomain implements IWishlistDomain {
  readonly #postgresOrm: PostgresORMInterface
  readonly #configService: ConfigServiceInterface
  readonly #skillTreeRepository: ISkillTreeRepository
  readonly #userCardRepository: IUserCardRepository

  constructor({
    postgresOrm,
    configService,
    skillTreeRepository,
    userCardRepository,
  }: IocContainer) {
    this.#postgresOrm = postgresOrm
    this.#configService = configService
    this.#skillTreeRepository = skillTreeRepository
    this.#userCardRepository = userCardRepository
  }

  async getStatus(userId: string): Promise<WishlistStatus> {
    const [user, c, effects] = await Promise.all([
      this.#postgresOrm.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        include: { wishlistCard: { include: { set: true } } },
      }),
      this.#configService.getMany(
        'wishlist.priceMultiplier',
        'wishlist.cooldownDays',
        'dailyShopPriceCommon',
        'dailyShopPriceUncommon',
        'dailyShopPriceRare',
        'dailyShopPriceEpic',
        'dailyShopPriceLegendary',
      ),
      this.#skillTreeRepository.getEffectsForUser(userId),
    ])

    const cooldownDays = c['wishlist.cooldownDays']
    const effectiveCooldownDays = Math.max(
      1,
      cooldownDays - (effects.wishlistCooldownReductionDays ?? 0),
    )
    const availableAt = computeAvailableAt(user.wishlistPurchasedAt, effectiveCooldownDays)

    if (!user.wishlistCard) {
      return { card: null, price: null, availableAt, cooldownDays }
    }

    const card = user.wishlistCard
    const priceKey = RARITY_PRICE_KEYS[card.rarity as keyof typeof RARITY_PRICE_KEYS]
    const rarityBasePrice = priceKey ? (c[priceKey] ?? 50) : 50
    const basePrice = rarityBasePrice * c['wishlist.priceMultiplier']
    const discount = effects.shopDiscount ?? 0
    const price = Math.max(0, Math.round(basePrice * (1 - discount / 100)))

    return {
      card: {
        id: card.id,
        name: card.name,
        imageUrl: card.imageUrl,
        rarity: card.rarity,
        set: { id: card.set.id, name: card.set.name },
      },
      price,
      availableAt,
      cooldownDays,
    }
  }

  async setWish(userId: string, cardId: string): Promise<void> {
    const card = await this.#postgresOrm.prisma.card.findUnique({
      where: { id: cardId },
      include: { set: true },
    })
    if (!card || !card.set.isActive) {
      throw Boom.notFound('Card not found or set is inactive')
    }
    await this.#postgresOrm.prisma.user.update({
      where: { id: userId },
      data: { wishlistCardId: cardId },
    })
  }

  async purchase(userId: string): Promise<PurchaseWishlistResult> {
    // Read config + effects OUTSIDE the transaction (gacha pattern)
    const [user, c, effects] = await Promise.all([
      this.#postgresOrm.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        include: { wishlistCard: { include: { set: true } } },
      }),
      this.#configService.getMany(
        'wishlist.priceMultiplier',
        'wishlist.cooldownDays',
        'dailyShopPriceCommon',
        'dailyShopPriceUncommon',
        'dailyShopPriceRare',
        'dailyShopPriceEpic',
        'dailyShopPriceLegendary',
      ),
      this.#skillTreeRepository.getEffectsForUser(userId),
    ])

    if (!user.wishlistCard) {
      throw Boom.badRequest('No wish set')
    }

    const card = user.wishlistCard
    const cooldownDays = c['wishlist.cooldownDays']
    const effectiveCooldownDays = Math.max(
      1,
      cooldownDays - (effects.wishlistCooldownReductionDays ?? 0),
    )

    const now = new Date()
    if (user.wishlistPurchasedAt !== null) {
      const availableAt = new Date(
        user.wishlistPurchasedAt.getTime() +
          effectiveCooldownDays * 24 * 60 * 60 * 1000,
      )
      if (now < availableAt) {
        const err = Boom.tooManyRequests('Cooldown actif')
        err.output.payload = { ...err.output.payload, availableAt: availableAt.toISOString() }
        throw err
      }
    }

    const priceKey = RARITY_PRICE_KEYS[card.rarity as keyof typeof RARITY_PRICE_KEYS]
    const rarityBasePrice = priceKey ? (c[priceKey] ?? 50) : 50
    const basePrice = rarityBasePrice * c['wishlist.priceMultiplier']
    const discount = effects.shopDiscount ?? 0
    const finalPrice = Math.max(0, Math.round(basePrice * (1 - discount / 100)))

    const attempt = async (): Promise<PurchaseWishlistResult> => {
      const purchasedAt = new Date()
      const newAvailableAt = new Date(
        purchasedAt.getTime() + effectiveCooldownDays * 24 * 60 * 60 * 1000,
      )

      const result = await this.#postgresOrm.executeWithTransactionClient(
        async (tx) => {
          const u = await tx.user.findUniqueOrThrow({ where: { id: userId } })
          // Re-check cooldown inside tx to close the race on P2034 retry
          // (effectiveCooldownDays captured outside tx is stable — it derives from config/effects, not mutable state)
          if (u.wishlistPurchasedAt !== null) {
            const availableAt = new Date(
              u.wishlistPurchasedAt.getTime() + effectiveCooldownDays * 24 * 60 * 60 * 1000,
            )
            if (new Date() < availableAt) {
              const err = Boom.tooManyRequests('Cooldown actif')
              err.output.payload = { ...err.output.payload, availableAt: availableAt.toISOString() }
              throw err
            }
          }
          if (u.dust < finalPrice) {
            throw Boom.paymentRequired('Not enough dust')
          }
          const updated = await tx.user.update({
            where: { id: userId },
            data: {
              dust: { decrement: finalPrice },
              wishlistPurchasedAt: purchasedAt,
            },
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
          set: { id: card.set.id, name: card.set.name },
        },
        wasDuplicate: result.wasDuplicate,
        dustSpent: finalPrice,
        newDustBalance: result.newDustBalance,
        availableAt: newAvailableAt.toISOString(),
      }
    }

    const run = async (retriesLeft: number): Promise<PurchaseWishlistResult> => {
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
