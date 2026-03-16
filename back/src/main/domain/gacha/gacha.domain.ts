import Boom from '@hapi/boom'

import { calculateTokens } from '../economy/economy.domain'
import type { Config } from '../../application/config'
import type { IocContainer } from '../../types/application/ioc'
import type { GachaDomainInterface } from '../../types/domain/gacha/gacha.domain.interface'
import { DUST_BY_RARITY } from '../../types/domain/gacha/gacha.types'
import type { CardWithSet, PullResult } from '../../types/domain/gacha/gacha.types'
import type { PostgresORMInterface, PrimaTransactionClient } from '../../types/infra/orm/client'

export function pickWeightedRandom(cards: CardWithSet[]): CardWithSet {
  if (cards.length === 0) { throw new Error('No cards to pick from') }
  const total = cards.reduce((sum, c) => sum + c.dropWeight, 0)
  if (total === 0) { throw new Error('All cards have zero weight') }
  let roll = Math.random() * total
  for (const card of cards) {
    roll -= card.dropWeight
    if (roll <= 0) { return card }
  }
  // biome-ignore lint/style/noNonNullAssertion: cards.length > 0 is guaranteed by the guard above
  return cards[cards.length - 1]!
}

function isPrismaSerializationError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === 'P2034'
  )
}

export class GachaDomain implements GachaDomainInterface {
  readonly #postgresOrm: PostgresORMInterface
  readonly #config: Config

  constructor({ postgresOrm, config }: IocContainer) {
    this.#postgresOrm = postgresOrm
    this.#config = config
  }

  async #executePullTx(tx: PrimaTransactionClient, userId: string): Promise<PullResult> {
    // 1. Lire l'utilisateur
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } })

    // 2. Calculer les tokens
    const { tokens, newLastTokenAt } = calculateTokens(
      user.lastTokenAt,
      user.tokens,
      this.#config.tokenRegenIntervalHours,
      this.#config.tokenMaxStock,
    )

    if (tokens < 1) {
      throw Boom.paymentRequired('Not enough tokens')
    }

    // 3. Charger les cartes (pity : forcer LEGENDARY si seuil atteint)
    const activeCards = await tx.card.findMany({
      where: {
        set: { isActive: true },
        ...(user.pityCurrent >= this.#config.pityThreshold
          ? { rarity: 'LEGENDARY' }
          : {}),
      },
      include: { set: true },
    }) as CardWithSet[]

    if (activeCards.length === 0) {
      throw Boom.internal('No active cards in any set')
    }

    // 4. Tirage pondéré
    const card = pickWeightedRandom(activeCards)

    // 5. Doublon ?
    const existing = await tx.userCard.findUnique({
      where: { userId_cardId: { userId, cardId: card.id } },
    })
    const wasDuplicate = existing !== null
    const dustEarned = wasDuplicate ? DUST_BY_RARITY[card.rarity] : 0

    // 6. Upsert UserCard
    if (existing) {
      await tx.userCard.update({
        where: { userId_cardId: { userId, cardId: card.id } },
        data: { quantity: { increment: 1 } },
      })
    } else {
      await tx.userCard.create({
        data: { userId, cardId: card.id, quantity: 1, obtainedAt: new Date() },
      })
    }

    // 7. Créer GachaPull
    const pull = await tx.gachaPull.create({
      data: { userId, cardId: card.id, wasDuplicate, dustEarned },
    })

    // 8. Mettre à jour l'utilisateur
    const isLegendary = card.rarity === 'LEGENDARY'
    const newPityCurrent = isLegendary ? 0 : user.pityCurrent + 1
    await tx.user.update({
      where: { id: userId },
      data: {
        tokens: tokens - 1,
        dust: { increment: dustEarned },
        pityCurrent: newPityCurrent,
        lastTokenAt: newLastTokenAt,
      },
    })

    return {
      pull,
      card,
      wasDuplicate,
      dustEarned,
      tokensRemaining: tokens - 1,
      pityCurrent: newPityCurrent,
    }
  }

  pull(userId: string): Promise<PullResult> {
    const attempt = (): Promise<PullResult> =>
      this.#postgresOrm.executeWithTransactionClient(
        (tx) => this.#executePullTx(tx, userId),
        { isolationLevel: 'Serializable', maxWait: 5000, timeout: 10000 },
      )

    const MAX_RETRIES = 3
    const run = async (retriesLeft: number): Promise<PullResult> => {
      try {
        return await attempt()
      } catch (err: unknown) {
        if (retriesLeft > 0 && isPrismaSerializationError(err)) {
          return run(retriesLeft - 1)
        }
        throw err
      }
    }

    return run(MAX_RETRIES)
  }
}
