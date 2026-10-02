import Boom from '@hapi/boom'

import type { CardRarity, Prisma } from '../../../generated/client'
import { errorMessage } from '../../infra/i18n/error-messages'
import type { IocContainer } from '../../types/application/ioc'
import type {
  DeliveryPick,
  DuplicateStack,
  IOrdersDomain,
  MatchableUserCard,
  OrderLine,
  OrderReward,
  OrderRewardConfig,
  OrderSlotView,
  OrdersBoard,
  PoolCard,
} from '../../types/domain/orders/orders.domain.interface'
import type { IDuelDomain } from '../../types/domain/wagers/wagers.domain.interface'
import type { ConfigServiceInterface } from '../../types/infra/config/config.service.interface'
import type {
  PostgresORMInterface,
  PrimaTransactionClient,
} from '../../types/infra/orm/client'
import {
  calculateTokens,
  effectiveRegenInterval,
  overflowDust,
} from '../economy/economy.domain'
import { retryOnSerialization } from '../shared/retry-serialization'
import { RARITY_ORDER } from '../wagers/wager-rules'
import { generateOrderLines, pickClient } from './order-generation'
import {
  cardMatchesLine,
  suggestPicks,
  validateDelivery,
} from './order-matching'
import {
  computeOrderReward,
  REWARD_CONFIG_KEYS,
  type RewardConfigKey,
  rewardConfigFrom,
} from './order-rewards'

const BOARD_KEYS = [
  'orders.slots',
  'orders.feasibleSlots',
  'orders.cooldownMinutes',
  'orders.dailyCap',
  'orders.freeDismissPerDay',
] as const

function startOfUtcDay(now: Date): Date {
  const d = new Date(now)
  d.setUTCHours(0, 0, 0, 0)
  return d
}

export class OrdersDomain implements IOrdersDomain {
  readonly #postgresOrm: PostgresORMInterface
  readonly #configService: ConfigServiceInterface
  readonly #skillTreeRepository: IocContainer['skillTreeRepository']
  readonly #teamProgressionDomain: IocContainer['teamProgressionDomain']
  readonly #duelDomain: IDuelDomain

  constructor({
    postgresOrm,
    configService,
    skillTreeRepository,
    teamProgressionDomain,
    duelDomain,
  }: Omit<IocContainer, 'duelDomain'> & { duelDomain: IDuelDomain }) {
    this.#postgresOrm = postgresOrm
    this.#configService = configService
    this.#skillTreeRepository = skillTreeRepository
    this.#teamProgressionDomain = teamProgressionDomain
    this.#duelDomain = duelDomain
  }

  async list(userId: string): Promise<OrdersBoard> {
    const cfg = await this.#configService.getMany(
      ...BOARD_KEYS,
      ...REWARD_CONFIG_KEYS,
    )
    const now = new Date()
    const dayStart = startOfUtcDay(now)
    const cooldownMs = cfg['orders.cooldownMinutes'] * 60_000

    // 1. Génération des emplacements dus — Serializable : deux GET
    //    simultanés ne créent pas deux commandes sur le même emplacement,
    //    le second rejoue et voit la première.
    await retryOnSerialization(() =>
      this.#postgresOrm.executeWithTransactionClient(
        (tx) =>
          this.#generateDueOrders(tx, userId, cfg, now, dayStart, cooldownMs),
        { isolationLevel: 'Serializable' },
      ),
    )

    // 2. Lecture hors transaction : le client Prisma étendu fournit les noms
    //    localisés (card.name, set.name).
    return this.#buildBoard(userId, cfg, now, dayStart, cooldownMs)
  }

  /** Vrai si l'emplacement n'a jamais eu de commande, ou si la dernière est
   *  close (congé gratuit, ou cooldown écoulé depuis sa clôture). */
  #slotIsDue(
    last: {
      status: string
      freeDismiss: boolean
      closedAt: Date | null
    } | null,
    cooldownMs: number,
    now: Date,
  ): boolean {
    if (!last) {
      return true
    }
    if (last.status === 'OPEN') {
      return false
    }
    return (
      last.freeDismiss ||
      (last.closedAt?.getTime() ?? 0) + cooldownMs <= now.getTime()
    )
  }

  async #dueSlots(
    tx: PrimaTransactionClient,
    userId: string,
    cfg: Record<(typeof BOARD_KEYS)[number], number>,
    cooldownMs: number,
    now: Date,
  ): Promise<number[]> {
    const due: number[] = []
    for (let slot = 0; slot < cfg['orders.slots']; slot++) {
      const last = await tx.customerOrder.findFirst({
        where: { userId, slot },
        orderBy: { createdAt: 'desc' },
      })
      if (this.#slotIsDue(last, cooldownMs, now)) {
        due.push(slot)
      }
    }
    return due
  }

  async #createOrderForSlot(
    tx: PrimaTransactionClient,
    userId: string,
    slot: number,
    feasible: boolean,
    duplicates: DuplicateStack[],
    pool: PoolCard[],
    maxOwnedRarity: CardRarity,
    rewardCfg: OrderRewardConfig,
  ): Promise<void> {
    const lines = generateOrderLines({
      duplicates,
      pool,
      maxOwnedRarity,
      feasible,
      rng: Math.random,
    })
    if (lines.length === 0) {
      return
    }
    const reward = computeOrderReward(lines, rewardCfg)
    await tx.customerOrder.create({
      data: {
        userId,
        slot,
        clientCardId: pickClient(pool, Math.random),
        lines: lines as unknown as Prisma.InputJsonValue,
        rewardDust: reward.dust,
        rewardGold: reward.gold,
        rewardTokens: reward.tokens,
      },
    })
  }

  /** Génère, dans la transaction, les commandes dues pour chaque emplacement
   *  en retard — no-op si le plafond du jour est atteint ou si aucun
   *  emplacement n'est dû. */
  async #generateDueOrders(
    tx: PrimaTransactionClient,
    userId: string,
    cfg: Record<(typeof BOARD_KEYS)[number], number> &
      Record<RewardConfigKey, number>,
    now: Date,
    dayStart: Date,
    cooldownMs: number,
  ): Promise<void> {
    const delivered = await tx.customerOrder.count({
      where: { userId, status: 'DELIVERED', closedAt: { gte: dayStart } },
    })
    if (delivered >= cfg['orders.dailyCap']) {
      return
    }
    const due = await this.#dueSlots(tx, userId, cfg, cooldownMs, now)
    if (due.length === 0) {
      return
    }
    const [owned, pool] = await Promise.all([
      tx.userCard.findMany({
        where: { userId },
        select: {
          id: true,
          cardId: true,
          quantity: true,
          variant: true,
          card: {
            select: {
              rarity: true,
              element: true,
              setId: true,
              dropWeight: true,
            },
          },
        },
      }),
      tx.card.findMany({
        where: { set: { isActive: true } },
        select: {
          id: true,
          rarity: true,
          element: true,
          setId: true,
          dropWeight: true,
        },
      }),
    ])
    if (pool.length === 0) {
      return
    }
    // Une carte engagée dans un duel actif n'est jamais livrable : elle ne
    // sert donc pas de graine à une commande « faisable ».
    const engaged = await this.#duelDomain.listEngagedCardKeysInTx(tx, userId)
    const duplicates: DuplicateStack[] = owned
      .filter(
        (u) =>
          u.variant === 'NORMAL' &&
          u.quantity > 1 &&
          !engaged.has(`${u.cardId}:${u.variant}`),
      )
      .map((u) => ({
        userCardId: u.id,
        cardId: u.cardId,
        available: u.quantity - 1,
        ...u.card,
      }))
    const maxOwnedRarity = owned.reduce<CardRarity>(
      (max, u) =>
        RARITY_ORDER.indexOf(u.card.rarity) > RARITY_ORDER.indexOf(max)
          ? u.card.rarity
          : max,
      'COMMON',
    )
    const rewardCfg = rewardConfigFrom(cfg)
    for (const slot of due) {
      await this.#createOrderForSlot(
        tx,
        userId,
        slot,
        slot < cfg['orders.feasibleSlots'],
        duplicates,
        pool as PoolCard[],
        maxOwnedRarity,
        rewardCfg,
      )
    }
  }

  async #buildBoard(
    userId: string,
    cfg: Record<(typeof BOARD_KEYS)[number], number>,
    now: Date,
    dayStart: Date,
    cooldownMs: number,
  ): Promise<OrdersBoard> {
    const prisma = this.#postgresOrm.prisma
    const [delivered, freeUsed, owned, lastBySlot, engaged] = await Promise.all(
      [
        prisma.customerOrder.count({
          where: { userId, status: 'DELIVERED', closedAt: { gte: dayStart } },
        }),
        prisma.customerOrder.count({
          where: {
            userId,
            status: 'DISMISSED',
            freeDismiss: true,
            closedAt: { gte: dayStart },
          },
        }),
        prisma.userCard.findMany({
          where: { userId, variant: 'NORMAL', quantity: { gt: 1 } },
          include: { card: true },
        }),
        Promise.all(
          Array.from({ length: cfg['orders.slots'] }, (_, slot) =>
            prisma.customerOrder.findFirst({
              where: { userId, slot },
              orderBy: { createdAt: 'desc' },
              include: { clientCard: true },
            }),
          ),
        ),
        this.#duelDomain.listEngagedCardKeysInTx(prisma, userId),
      ],
    )
    const deliveriesLeft = Math.max(0, cfg['orders.dailyCap'] - delivered)
    const stacks = owned
      .filter((u) => !engaged.has(`${u.cardId}:${u.variant}`))
      .map((u) => ({
        userCardId: u.id,
        cardId: u.cardId,
        available: u.quantity - 1,
        rarity: u.card.rarity,
        element: u.card.element,
        setId: u.card.setId,
        name: u.card.name,
        imageUrl: u.card.imageUrl,
      }))
    const setIds = lastBySlot.flatMap((o) =>
      o?.status === 'OPEN'
        ? [
            ...(o.lines as OrderLine[]).flatMap((l) =>
              l.setId ? [l.setId] : [],
            ),
            o.clientCard.setId,
          ]
        : [],
    )
    const sets = await prisma.cardSet.findMany({
      where: { id: { in: setIds } },
    })
    const setName = new Map(sets.map((s) => [s.id, s.name]))

    const slots: OrderSlotView[] = lastBySlot.map((o, slot) => {
      if (o?.status === 'OPEN') {
        const lines = o.lines as OrderLine[]
        const suggestedPicks = suggestPicks(lines, stacks)
        return {
          slot,
          nextAt: null,
          order: {
            id: o.id,
            client: {
              id: o.clientCard.id,
              name: o.clientCard.name,
              imageUrl: o.clientCard.imageUrl,
              rarity: o.clientCard.rarity,
              element: o.clientCard.element,
              setName: setName.get(o.clientCard.setId) ?? o.clientCard.setId,
            },
            reward: {
              dust: o.rewardDust,
              gold: o.rewardGold,
              tokens: o.rewardTokens,
            },
            suggestedPicks,
            deliverable: suggestedPicks !== null,
            lines: lines.map((l) => ({
              ...l,
              setName: l.setId ? (setName.get(l.setId) ?? null) : null,
              candidates: stacks
                .filter((s) => cardMatchesLine(s, l))
                .map(({ setId: _s, ...c }) => c),
            })),
          },
        }
      }
      const nextAt =
        deliveriesLeft === 0 || !o || o.freeDismiss || !o.closedAt
          ? null
          : new Date(
              Math.max(now.getTime(), o.closedAt.getTime() + cooldownMs),
            ).toISOString()
      return { slot, order: null, nextAt }
    })

    return {
      slots,
      deliveriesLeft,
      freeDismissAvailable: freeUsed < cfg['orders.freeDismissPerDay'],
    }
  }

  /** Charge la commande et vérifie qu'elle appartient au joueur et qu'elle
   *  est encore ouverte — partagé par `deliver` et `dismiss`. */
  async #loadOpenOrder(
    tx: PrimaTransactionClient,
    userId: string,
    orderId: string,
  ) {
    const order = await tx.customerOrder.findUnique({
      where: { id: orderId },
    })
    if (!order || order.userId !== userId) {
      throw Boom.notFound(errorMessage('orders.notFound'))
    }
    if (order.status !== 'OPEN') {
      throw Boom.conflict(errorMessage('orders.alreadyClosed'))
    }
    return order
  }

  async #assertUnderDailyCap(
    tx: PrimaTransactionClient,
    userId: string,
    cap: number,
  ): Promise<void> {
    const delivered = await tx.customerOrder.count({
      where: {
        userId,
        status: 'DELIVERED',
        closedAt: { gte: startOfUtcDay(new Date()) },
      },
    })
    if (delivered >= cap) {
      throw Boom.conflict(errorMessage('orders.dailyCapReached', { cap }))
    }
  }

  async #applyDelivery(
    tx: PrimaTransactionClient,
    userId: string,
    order: {
      id: string
      rewardDust: number
      rewardGold: number
      rewardTokens: number
    },
    picks: DeliveryPick[],
  ): Promise<void> {
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
    // Régénération matérialisée AVANT le crédit (même calcul que
    // rewards.claimOne) : sinon calculateTokens plafonnerait plus tard
    // `stock + regen` à maxStock et avalerait les jetons livrés.
    const [user, upgrades, cfg, teamEffects] = await Promise.all([
      tx.user.findUniqueOrThrow({
        where: { id: userId },
        select: { tokens: true, lastTokenAt: true },
      }),
      this.#skillTreeRepository.getEffectsForUser(userId),
      this.#configService.getMany('tokenRegenIntervalMinutes', 'tokenMaxStock'),
      this.#teamProgressionDomain.effectsForUser(userId),
    ])
    const { tokens, newLastTokenAt, overflow } = calculateTokens(
      user.lastTokenAt,
      user.tokens,
      effectiveRegenInterval({
        intervalMinutes: cfg.tokenRegenIntervalMinutes,
        reductionMinutes: upgrades.regenReductionMinutes,
        lootBonusPct: teamEffects.loot,
      }),
      cfg.tokenMaxStock + upgrades.tokenVaultBonus,
      upgrades.multiTokenChance,
    )
    await tx.user.update({
      where: { id: userId },
      data: {
        dust: {
          increment:
            order.rewardDust +
            overflowDust(overflow, upgrades.tokenOverflowDust),
        },
        dustGenerated: { increment: order.rewardDust },
        gold: { increment: order.rewardGold },
        tokens: tokens + order.rewardTokens,
        lastTokenAt: newLastTokenAt ?? undefined,
      },
    })
    await tx.customerOrder.update({
      where: { id: order.id },
      data: { status: 'DELIVERED', closedAt: new Date() },
    })
  }

  deliver(
    userId: string,
    orderId: string,
    picks: DeliveryPick[],
  ): Promise<{ reward: OrderReward }> {
    return retryOnSerialization(async () => {
      const cap = await this.#configService.get('orders.dailyCap')
      return this.#postgresOrm.executeWithTransactionClient(
        async (tx) => {
          const order = await this.#loadOpenOrder(tx, userId, orderId)
          await this.#assertUnderDailyCap(tx, userId, cap)
          const userCards = await tx.userCard.findMany({
            where: { userId, id: { in: picks.map((p) => p.userCardId) } },
            select: {
              id: true,
              cardId: true,
              quantity: true,
              variant: true,
              card: { select: { rarity: true, element: true, setId: true } },
            },
          })
          validateDelivery(
            order.lines as OrderLine[],
            picks,
            new Map(userCards.map((u) => [u.id, u as MatchableUserCard])),
          )
          const engaged = await this.#duelDomain.listEngagedCardKeysInTx(
            tx,
            userId,
          )
          if (userCards.some((u) => engaged.has(`${u.cardId}:${u.variant}`))) {
            throw Boom.conflict(errorMessage('wagers.cardEngagedInActiveDuel'))
          }
          await this.#applyDelivery(tx, userId, order, picks)
          return {
            reward: {
              dust: order.rewardDust,
              gold: order.rewardGold,
              tokens: order.rewardTokens,
            },
          }
        },
        { isolationLevel: 'Serializable' },
      )
    })
  }

  dismiss(userId: string, orderId: string): Promise<{ free: boolean }> {
    return retryOnSerialization(async () => {
      const freePerDay = await this.#configService.get(
        'orders.freeDismissPerDay',
      )
      return this.#postgresOrm.executeWithTransactionClient(
        async (tx) => {
          const order = await this.#loadOpenOrder(tx, userId, orderId)
          const freeUsed = await tx.customerOrder.count({
            where: {
              userId,
              status: 'DISMISSED',
              freeDismiss: true,
              closedAt: { gte: startOfUtcDay(new Date()) },
            },
          })
          const free = freeUsed < freePerDay
          await tx.customerOrder.update({
            where: { id: order.id },
            data: {
              status: 'DISMISSED',
              closedAt: new Date(),
              freeDismiss: free,
            },
          })
          return { free }
        },
        { isolationLevel: 'Serializable' },
      )
    })
  }
}
