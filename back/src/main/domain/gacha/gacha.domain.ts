import Boom from '@hapi/boom'

import { calculateTokens } from '../economy/economy.domain'
import type { IocContainer } from '../../types/application/ioc'
import type { GachaDomainInterface } from '../../types/domain/gacha/gacha.domain.interface'
import type { CardWithSet, PullResult } from '../../types/domain/gacha/gacha.types'
import type { ConfigServiceInterface } from '../../types/infra/config/config.service.interface'
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

type VariantRates = {
  brilliantRateRare: number
  brilliantRateEpic: number
  brilliantRateLegendary: number
  holoRateRare: number
  holoRateEpic: number
  holoRateLegendary: number
}

const VARIANT_ELIGIBLE = ['RARE', 'EPIC', 'LEGENDARY'] as const
type VariantEligibleRarity = (typeof VARIANT_ELIGIBLE)[number]

function rarityKey(rarity: VariantEligibleRarity): 'Rare' | 'Epic' | 'Legendary' {
  const map = { RARE: 'Rare', EPIC: 'Epic', LEGENDARY: 'Legendary' } as const
  return map[rarity]
}

export function pickVariant(rarity: string, rates: VariantRates): 'BRILLIANT' | 'HOLOGRAPHIC' | null {
  if (!(VARIANT_ELIGIBLE as readonly string[]).includes(rarity)) return null
  const key = rarityKey(rarity as VariantEligibleRarity)
  const brilliantRate = rates[`brilliantRate${key}`] ?? 0
  const holoRate = rates[`holoRate${key}`] ?? 0
  const roll = Math.random() * 100
  if (roll < brilliantRate) return 'BRILLIANT'
  if (roll < brilliantRate + holoRate) return 'HOLOGRAPHIC'
  return null
}

function isPrismaSerializationError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === 'P2034'
  )
}

type PullCfg = {
  tokenRegenIntervalHours: number
  tokenMaxStock: number
  pityThreshold: number
  dustByRarity: Record<string, number>
  variantRates: VariantRates
}

export class GachaDomain implements GachaDomainInterface {
  readonly #postgresOrm: PostgresORMInterface
  readonly #configService: ConfigServiceInterface

  constructor({ postgresOrm, configService }: IocContainer) {
    this.#postgresOrm = postgresOrm
    this.#configService = configService
  }

  async #executePullTx(tx: PrimaTransactionClient, userId: string, cfg: PullCfg): Promise<PullResult> {
    // 1. Lire l'utilisateur
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } })

    // 2. Calculer les tokens
    const { tokens, newLastTokenAt } = calculateTokens(
      user.lastTokenAt,
      user.tokens,
      cfg.tokenRegenIntervalHours,
      cfg.tokenMaxStock,
    )

    if (tokens < 1) {
      throw Boom.paymentRequired('Not enough tokens')
    }

    // 3. Charger les cartes (pity : forcer LEGENDARY si seuil atteint)
    const activeCards = await tx.card.findMany({
      where: {
        set: { isActive: true },
        ...(user.pityCurrent >= cfg.pityThreshold
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

    // 4b. Roll variant
    const rolledVariant = pickVariant(card.rarity, cfg.variantRates)

    // 5. Doublon ?
    const existing = await tx.userCard.findUnique({
      where: { userId_cardId: { userId, cardId: card.id } },
    })
    const wasDuplicate = existing !== null
    const dustEarned = wasDuplicate ? (cfg.dustByRarity[card.rarity] ?? 0) : 0

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
      data: { userId, cardId: card.id, variant: rolledVariant, wasDuplicate, dustEarned },
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
    const attempt = async (): Promise<PullResult> => {
      // Lire la config AVANT la transaction (pas d'I/O async dans le tx serializable)
      const [
        tokenRegenIntervalHours, tokenMaxStock, pityThreshold,
        dustCommon, dustUncommon, dustRare, dustEpic, dustLegendary,
        brilliantRateRare, brilliantRateEpic, brilliantRateLegendary,
        holoRateRare, holoRateEpic, holoRateLegendary,
      ] = await Promise.all([
        this.#configService.get('tokenRegenIntervalHours'),
        this.#configService.get('tokenMaxStock'),
        this.#configService.get('pityThreshold'),
        this.#configService.get('dustCommon'),
        this.#configService.get('dustUncommon'),
        this.#configService.get('dustRare'),
        this.#configService.get('dustEpic'),
        this.#configService.get('dustLegendary'),
        this.#configService.get('brilliantRateRare'),
        this.#configService.get('brilliantRateEpic'),
        this.#configService.get('brilliantRateLegendary'),
        this.#configService.get('holoRateRare'),
        this.#configService.get('holoRateEpic'),
        this.#configService.get('holoRateLegendary'),
      ])
      const cfg: PullCfg = {
        tokenRegenIntervalHours,
        tokenMaxStock,
        pityThreshold,
        dustByRarity: { COMMON: dustCommon, UNCOMMON: dustUncommon, RARE: dustRare, EPIC: dustEpic, LEGENDARY: dustLegendary },
        variantRates: {
          brilliantRateRare, brilliantRateEpic, brilliantRateLegendary,
          holoRateRare, holoRateEpic, holoRateLegendary,
        },
      }
      return this.#postgresOrm.executeWithTransactionClient(
        (tx) => this.#executePullTx(tx, userId, cfg),
        { isolationLevel: 'Serializable', maxWait: 5000, timeout: 10000 },
      )
    }

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
