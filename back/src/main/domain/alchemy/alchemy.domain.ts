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
import { isAstralElement, NORMAL_POOL_WHERE } from '../gacha/card-pools'
import { pickVariant } from '../gacha/gacha.domain'
import { retryOnSerialization } from '../shared/retry-serialization'
import { weightedPick } from '../shared/weighted-pick'
import {
  ALCHEMY_BATCH_SIZE,
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

type GrantedCard = { cardId: string; variant: CardVariant; isNew: boolean }

export class AlchemyDomain implements IAlchemyDomain {
  readonly #postgresOrm
  readonly #configService
  readonly #achievementsDomain
  readonly #duelDomain: IDuelDomain
  readonly #userCardRepository

  constructor({
    postgresOrm,
    configService,
    achievementsDomain,
    duelDomain,
    userCardRepository,
  }: Pick<
    IocContainer,
    | 'postgresOrm'
    | 'configService'
    | 'achievementsDomain'
    | 'userCardRepository'
  > & {
    duelDomain: IDuelDomain
  }) {
    this.#postgresOrm = postgresOrm
    this.#configService = configService
    this.#achievementsDomain = achievementsDomain
    this.#duelDomain = duelDomain
    this.#userCardRepository = userCardRepository
  }

  async board(userId: string): Promise<AlchemyBoard> {
    const prisma = this.#postgresOrm.prisma
    const [costs, owned, engaged] = await Promise.all([
      this.#configService.getMany(...Object.values(ALCHEMY_COST_KEYS)),
      prisma.userCard.findMany({
        where: { userId, quantity: { gt: 1 } },
        include: { card: { include: { set: true } } },
      }),
      this.#duelDomain.listEngagedCardIdsInTx(prisma, userId),
    ])
    const stacks: AlchemyStack[] = owned
      .filter((u) => !engaged.has(u.cardId) && !isAstralElement(u.card.element))
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
        const toRarity = nextRarity(fromRarity)
        if (!toRarity) {
          throw new Error(`Pas de rareté suivante pour ${fromRarity}`)
        }
        return {
          fromRarity,
          toRarity,
          cost,
          candidates,
          maxTransmutations: maxTransmutations(candidates, cost),
          suggestedPicks: suggestIngredients(candidates, cost),
          suggestedBatchPicks: suggestIngredients(
            candidates,
            cost * ALCHEMY_BATCH_SIZE,
          ),
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
        card: { select: { rarity: true, element: true } },
      },
    })
    if (userCards.some((u) => isAstralElement(u.card.element))) {
      throw Boom.badRequest(errorMessage('alchemy.astralIngredient'))
    }
    validateIngredients(
      fromRarity,
      picks,
      new Map(userCards.map((u) => [u.id, u])),
      cost,
    )
    const engaged = await this.#duelDomain.listEngagedCardIdsInTx(tx, userId)
    if (userCards.some((u) => engaged.has(u.cardId))) {
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
  ): Promise<GrantedCard> {
    const pool = await tx.card.findMany({
      where: { ...NORMAL_POOL_WHERE, rarity: toRarity },
      select: { id: true, dropWeight: true },
    })
    if (pool.every((c) => c.dropWeight <= 0)) {
      throw Boom.conflict(errorMessage('alchemy.noTargetCard'))
    }
    const target = weightedPick(pool, Math.random)
    // Taux de base, sans VARIANT_LUCK : choix de la spec alchimie, le résultat
    // ne doit pas concurrencer le gacha.
    const variant = pickVariant(toRarity, rates)
    const { wasDuplicate } = await this.#userCardRepository.upsertInTx(
      tx,
      userId,
      target.id,
      variant,
    )
    return { cardId: target.id, variant, isNew: !wasDuplicate }
  }

  transmute(
    userId: string,
    fromRarity: AlchemyFromRarity,
    picks: AlchemyPick[],
    count: number,
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
      const cost = costs[ALCHEMY_COST_KEYS[fromRarity]] * count
      const granted = await this.#postgresOrm.executeWithTransactionClient(
        async (tx) => {
          await this.#consume(tx, userId, fromRarity, picks, cost)
          // Séquentiel : un doublon tiré deux fois dans le lot doit voir le
          // premier exemplaire (isNew, incrément).
          const results: GrantedCard[] = []
          for (let i = 0; i < count; i++) {
            results.push(await this.#grantResult(tx, userId, toRarity, rates))
          }
          const unlockedAchievements = await this.#achievementsDomain.track(
            tx,
            userId,
            { kind: 'CARD_RECYCLED', amount: cost },
          )
          await this.#achievementsDomain.track(tx, userId, {
            kind: 'ALCHEMY_TRANSMUTED',
            amount: count,
          })
          return { results, unlockedAchievements }
        },
        { isolationLevel: 'Serializable' },
      )
      // Lecture hors transaction : noms localisés par le client étendu.
      const cards = await this.#postgresOrm.prisma.card.findMany({
        where: { id: { in: granted.results.map((r) => r.cardId) } },
        include: { set: true },
      })
      const byId = new Map(cards.map((c) => [c.id, c]))
      return {
        results: granted.results.map((r) => {
          const card = byId.get(r.cardId)
          if (!card) {
            throw new Error(`Carte ${r.cardId} introuvable après transmutation`)
          }
          return {
            card: {
              id: card.id,
              name: card.name,
              imageUrl: card.imageUrl,
              rarity: card.rarity as CardRarity,
              element: card.element,
              variant: r.variant,
              set: { id: card.set.id, name: card.set.name },
            },
            isNew: r.isNew,
          }
        }),
        unlockedAchievements: granted.unlockedAchievements,
      }
    })
  }
}
