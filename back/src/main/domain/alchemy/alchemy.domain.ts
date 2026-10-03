import Boom from '@hapi/boom'

import type { CardRarity, CardVariant } from '../../../generated/client'
import { errorMessage } from '../../infra/i18n/error-messages'
import type { IocContainer } from '../../types/application/ioc'
import type {
  AlchemyBoard,
  AlchemyFromRarity,
  AlchemyPick,
  AlchemyStack,
  IAlchemyDomain,
  TransmuteResult,
} from '../../types/domain/alchemy/alchemy.domain.interface'
import type { IDuelDomain } from '../../types/domain/wagers/wagers.domain.interface'
import type { PrimaTransactionClient } from '../../types/infra/orm/client'
import { pickVariant } from '../gacha/gacha.domain'
import { retryOnSerialization } from '../shared/retry-serialization'
import { weightedPick } from '../shared/weighted-pick'
import {
  ALCHEMY_COST_KEYS,
  ALCHEMY_FROM_RARITIES,
  maxTransmutations,
  nextRarity,
  suggestIngredients,
  validateIngredients,
} from './alchemy-rules'

const VARIANT_KEYS = [
  'brilliantRateRare',
  'brilliantRateEpic',
  'brilliantRateLegendary',
  'holoRateRare',
  'holoRateEpic',
  'holoRateLegendary',
] as const

export class AlchemyDomain implements IAlchemyDomain {
  readonly #postgresOrm
  readonly #configService
  readonly #achievementsDomain
  readonly #duelDomain: IDuelDomain

  constructor({
    postgresOrm,
    configService,
    achievementsDomain,
    duelDomain,
  }: Pick<
    IocContainer,
    'postgresOrm' | 'configService' | 'achievementsDomain'
  > & {
    duelDomain: IDuelDomain
  }) {
    this.#postgresOrm = postgresOrm
    this.#configService = configService
    this.#achievementsDomain = achievementsDomain
    this.#duelDomain = duelDomain
  }

  async board(userId: string): Promise<AlchemyBoard> {
    const prisma = this.#postgresOrm.prisma
    const [costs, owned, engaged] = await Promise.all([
      this.#configService.getMany(...Object.values(ALCHEMY_COST_KEYS)),
      prisma.userCard.findMany({
        where: { userId, variant: 'NORMAL', quantity: { gt: 1 } },
        include: { card: { include: { set: true } } },
      }),
      this.#duelDomain.listEngagedCardKeysInTx(prisma, userId),
    ])
    const stacks: AlchemyStack[] = owned
      .filter((u) => !engaged.has(`${u.cardId}:${u.variant}`))
      .map((u) => ({
        userCardId: u.id,
        cardId: u.cardId,
        name: u.card.name,
        imageUrl: u.card.imageUrl,
        rarity: u.card.rarity,
        element: u.card.element,
        setName: u.card.set.name,
        available: u.quantity - 1,
      }))
    return {
      tiers: ALCHEMY_FROM_RARITIES.map((fromRarity) => {
        const cost = costs[ALCHEMY_COST_KEYS[fromRarity]]
        const candidates = stacks.filter((s) => s.rarity === fromRarity)
        return {
          fromRarity,
          // biome-ignore lint/style/noNonNullAssertion: ALCHEMY_FROM_RARITIES exclut LEGENDARY
          toRarity: nextRarity(fromRarity)!,
          cost,
          candidates,
          maxTransmutations: maxTransmutations(candidates, cost),
          suggestedPicks: suggestIngredients(candidates, cost),
        }
      }),
    }
  }

  /** Vérifie les ingrédients (recette, verrou de duel) et consomme les piles — partagé par `transmute`. */
  async #consume(
    tx: PrimaTransactionClient,
    userId: string,
    fromRarity: AlchemyFromRarity,
    picks: AlchemyPick[],
    cost: number,
  ): Promise<void> {
    const userCards = await tx.userCard.findMany({
      where: { userId, id: { in: picks.map((p) => p.userCardId) } },
      select: {
        id: true,
        cardId: true,
        quantity: true,
        variant: true,
        card: { select: { rarity: true } },
      },
    })
    validateIngredients(
      fromRarity,
      picks,
      new Map(userCards.map((u) => [u.id, u])),
      cost,
    )
    const engaged = await this.#duelDomain.listEngagedCardKeysInTx(tx, userId)
    if (userCards.some((u) => engaged.has(`${u.cardId}:${u.variant}`))) {
      throw Boom.conflict(errorMessage('wagers.cardEngagedInActiveDuel'))
    }
    const perCard = new Map<string, number>()
    for (const p of picks) {
      perCard.set(p.userCardId, (perCard.get(p.userCardId) ?? 0) + p.amount)
    }
    for (const [id, amount] of perCard) {
      await tx.userCard.update({
        where: { id },
        data: { quantity: { decrement: amount } },
      })
    }
  }

  /** Tire la carte cible et sa variante, puis les ajoute à la collection — partagé par `transmute`. */
  async #grantResult(
    tx: PrimaTransactionClient,
    userId: string,
    toRarity: CardRarity,
    rates: Record<(typeof VARIANT_KEYS)[number], number>,
  ): Promise<{ cardId: string; variant: CardVariant; isNew: boolean }> {
    const pool = await tx.card.findMany({
      where: { rarity: toRarity, set: { isActive: true } },
      select: { id: true, dropWeight: true },
    })
    if (pool.every((c) => c.dropWeight <= 0)) {
      throw Boom.conflict(errorMessage('alchemy.noTargetCard'))
    }
    const target = weightedPick(pool, Math.random)
    const variant = pickVariant(toRarity, rates)
    const existing = await tx.userCard.findUnique({
      where: { userId_cardId_variant: { userId, cardId: target.id, variant } },
    })
    if (existing) {
      await tx.userCard.update({
        where: { id: existing.id },
        data: { quantity: { increment: 1 } },
      })
    } else {
      await tx.userCard.create({
        data: { userId, cardId: target.id, variant, quantity: 1 },
      })
    }
    return { cardId: target.id, variant, isNew: !existing }
  }

  transmute(
    userId: string,
    fromRarity: AlchemyFromRarity,
    picks: AlchemyPick[],
  ): Promise<TransmuteResult> {
    return retryOnSerialization(async () => {
      const toRarity = nextRarity(fromRarity)
      if (!toRarity) {
        throw Boom.badRequest(errorMessage('alchemy.noTierFromLegendary'))
      }
      const [costs, rates] = await Promise.all([
        this.#configService.getMany(ALCHEMY_COST_KEYS[fromRarity]),
        this.#configService.getMany(...VARIANT_KEYS),
      ])
      const cost = costs[ALCHEMY_COST_KEYS[fromRarity]]
      const resultId = await this.#postgresOrm.executeWithTransactionClient(
        async (tx) => {
          await this.#consume(tx, userId, fromRarity, picks, cost)
          const result = await this.#grantResult(tx, userId, toRarity, rates)
          const unlockedAchievements = await this.#achievementsDomain.track(
            tx,
            userId,
            { kind: 'CARD_RECYCLED', amount: cost },
          )
          return { ...result, unlockedAchievements }
        },
        { isolationLevel: 'Serializable' },
      )
      // Lecture hors transaction : noms localisés par le client étendu.
      const card = await this.#postgresOrm.prisma.card.findUniqueOrThrow({
        where: { id: resultId.cardId },
        include: { set: true },
      })
      return {
        card: {
          id: card.id,
          name: card.name,
          imageUrl: card.imageUrl,
          rarity: card.rarity as CardRarity,
          element: card.element,
          variant: resultId.variant,
          set: { id: card.set.id, name: card.set.name },
        },
        isNew: resultId.isNew,
        unlockedAchievements: resultId.unlockedAchievements,
      }
    })
  }
}
