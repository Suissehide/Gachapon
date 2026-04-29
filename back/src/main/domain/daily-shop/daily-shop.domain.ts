import Boom from '@hapi/boom'

import type { IocContainer } from '../../types/application/ioc'
import type {
  BuyDailyShopItemResult,
  DailyShopItemResult,
  DailyShopResult,
  IDailyShopDomain,
} from '../../types/domain/daily-shop/daily-shop.domain.interface'
import type { ConfigServiceInterface } from '../../types/infra/config/config.service.interface'
import type { PostgresORMInterface } from '../../types/infra/orm/client'
import type { ISkillTreeRepository } from '../../types/infra/orm/repositories/skill-tree.repository.interface'
import { pickWeightedRandom } from '../gacha/gacha.domain'

const RARITY_PRICE_KEYS = {
  COMMON: 'dailyShopPriceCommon',
  UNCOMMON: 'dailyShopPriceUncommon',
  RARE: 'dailyShopPriceRare',
  EPIC: 'dailyShopPriceEpic',
  LEGENDARY: 'dailyShopPriceLegendary',
} as const

function todayUTC(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

function formatItem(item: {
  id: string
  dustPrice: number
  purchased: boolean
  card: { id: string; name: string; imageUrl: string | null; rarity: string; set: { id: string; name: string } }
}): DailyShopItemResult {
  return {
    id: item.id,
    card: {
      id: item.card.id,
      name: item.card.name,
      imageUrl: item.card.imageUrl,
      rarity: item.card.rarity,
      set: { id: item.card.set.id, name: item.card.set.name },
    },
    dustPrice: item.dustPrice,
    purchased: item.purchased,
  }
}

export class DailyShopDomain implements IDailyShopDomain {
  readonly #postgresOrm: PostgresORMInterface
  readonly #configService: ConfigServiceInterface
  readonly #skillTreeRepository: ISkillTreeRepository

  constructor({ postgresOrm, configService, skillTreeRepository }: IocContainer) {
    this.#postgresOrm = postgresOrm
    this.#configService = configService
    this.#skillTreeRepository = skillTreeRepository
  }

  async getOrGenerate(userId: string): Promise<DailyShopResult> {
    const date = todayUTC()
    const prisma = this.#postgresOrm.prisma

    const existing = await prisma.dailyShop.findUnique({
      where: { userId_date: { userId, date } },
      include: {
        items: {
          include: { card: { include: { set: true } } },
        },
      },
    })

    if (existing) {
      return {
        date: existing.date.toISOString(),
        items: existing.items.map(formatItem),
      }
    }

    const [prices, activeCards] = await Promise.all([
      this.#configService.getMany(
        'dailyShopPriceCommon',
        'dailyShopPriceUncommon',
        'dailyShopPriceRare',
        'dailyShopPriceEpic',
        'dailyShopPriceLegendary',
      ),
      prisma.card.findMany({
        where: { set: { isActive: true } },
        include: { set: true },
      }),
    ])

    if (activeCards.length < 4) {
      throw Boom.conflict('Not enough active cards to generate daily shop')
    }

    const picked: typeof activeCards = []
    let pool = [...activeCards]
    for (let i = 0; i < 4; i++) {
      const card = pickWeightedRandom(pool)
      picked.push(card)
      pool = pool.filter((c) => c.id !== card.id)
    }

    const shop = await prisma.dailyShop.create({
      data: {
        userId,
        date,
        items: {
          create: picked.map((card) => ({
            cardId: card.id,
            dustPrice: prices[RARITY_PRICE_KEYS[card.rarity as keyof typeof RARITY_PRICE_KEYS]] ?? 50,
          })),
        },
      },
      include: {
        items: {
          include: { card: { include: { set: true } } },
        },
      },
    })

    return {
      date: shop.date.toISOString(),
      items: shop.items.map(formatItem),
    }
  }

  async buy(userId: string, itemId: string): Promise<BuyDailyShopItemResult> {
    const date = todayUTC()
    const prisma = this.#postgresOrm.prisma

    const item = await prisma.dailyShopItem.findUnique({
      where: { id: itemId },
      include: {
        dailyShop: true,
        card: { include: { set: true } },
      },
    })

    if (!item || item.dailyShop.userId !== userId || item.dailyShop.date.getTime() !== date.getTime()) {
      throw Boom.notFound('Item not found')
    }
    if (item.purchased) {
      throw Boom.badRequest('Item already purchased')
    }

    const effects = await this.#skillTreeRepository.getEffectsForUser(userId)
    const discount = effects.shopDiscount ?? 0
    const finalPrice = Math.max(0, Math.round(item.dustPrice * (1 - discount / 100)))

    const result = await this.#postgresOrm.executeWithTransactionClient(
      async (tx) => {
        const user = await tx.user.findUniqueOrThrow({ where: { id: userId } })
        if (user.dust < finalPrice) {
          throw Boom.paymentRequired('Not enough dust')
        }

        await tx.dailyShopItem.update({
          where: { id: itemId },
          data: { purchased: true, purchasedAt: new Date() },
        })

        const updated = await tx.user.update({
          where: { id: userId },
          data: { dust: { decrement: finalPrice } },
        })

        await tx.userCard.upsert({
          where: {
            userId_cardId_variant: {
              userId,
              cardId: item.card.id,
              variant: 'NORMAL',
            },
          },
          create: {
            userId,
            cardId: item.card.id,
            variant: 'NORMAL',
            quantity: 1,
          },
          update: {
            quantity: { increment: 1 },
          },
        })

        return { newDustBalance: updated.dust }
      },
      { isolationLevel: 'Serializable', maxWait: 5000, timeout: 10000 },
    )

    return {
      card: {
        id: item.card.id,
        name: item.card.name,
        imageUrl: item.card.imageUrl,
        rarity: item.card.rarity,
        set: { id: item.card.set.id, name: item.card.set.name },
      },
      dustSpent: finalPrice,
      newDustBalance: result.newDustBalance,
    }
  }
}
