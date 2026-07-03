// back/src/main/domain/profile/profile.domain.ts

import Boom from '@hapi/boom'

import type { IocContainer } from '../../types/application/ioc'
import type { ProfileDomainInterface } from '../../types/domain/profile/profile.domain.interface'
import type {
  FeaturedCardDto,
  SetProgressionDto,
} from '../../types/domain/profile/profile.types'

const RARITY_ORDER = [
  'LEGENDARY',
  'EPIC',
  'RARE',
  'UNCOMMON',
  'COMMON',
] as const

type OwnedCardLike = { id: string; rarity: string }

/** Returns up to 5 owned cards: 1 per rarity (LEGENDARY→COMMON), filling missing
 *  slots with extras from rarer tiers first. */
export function pickTopByRarity<T extends OwnedCardLike>(ownedCards: T[]): T[] {
  if (ownedCards.length === 0) {
    return []
  }
  const byRarity = groupByRarity(ownedCards)
  const usedIndex = new Map<string, number>()
  const takeNext = (rarity: string): T | undefined => {
    const arr = byRarity.get(rarity)
    if (!arr) {
      return undefined
    }
    const start = usedIndex.get(rarity) ?? 0
    if (start >= arr.length) {
      return undefined
    }
    usedIndex.set(rarity, start + 1)
    return arr[start]
  }
  const picked: T[] = []
  for (const [i, rarity] of RARITY_ORDER.entries()) {
    const card =
      takeNext(rarity) ??
      findInRarerTiers(i, takeNext) ??
      findInLessRareTiers(i, takeNext)
    if (card) {
      picked.push(card)
    }
    if (picked.length === 5) {
      return picked
    }
  }
  return picked
}

function groupByRarity<T extends OwnedCardLike>(cards: T[]): Map<string, T[]> {
  const byRarity = new Map<string, T[]>()
  for (const card of cards) {
    const arr = byRarity.get(card.rarity) ?? []
    arr.push(card)
    byRarity.set(card.rarity, arr)
  }
  return byRarity
}

function findInRarerTiers<T>(
  currentIndex: number,
  take: (rarity: string) => T | undefined,
): T | undefined {
  for (let j = currentIndex - 1; j >= 0; j -= 1) {
    const rarity = RARITY_ORDER[j]
    if (rarity === undefined) {
      continue
    }
    const card = take(rarity)
    if (card) {
      return card
    }
  }
  return undefined
}

function findInLessRareTiers<T>(
  currentIndex: number,
  take: (rarity: string) => T | undefined,
): T | undefined {
  for (let j = currentIndex + 1; j < RARITY_ORDER.length; j += 1) {
    const rarity = RARITY_ORDER[j]
    if (rarity === undefined) {
      continue
    }
    const card = take(rarity)
    if (card) {
      return card
    }
  }
  return undefined
}

/** Returns the user's featured cards, falling back to pickTopByRarity when
 *  the manual selection is empty or all selected ids have been recycled. */
export function resolveFeaturedCards<T extends OwnedCardLike>(
  featuredIds: string[],
  ownedCards: T[],
): T[] {
  if (featuredIds.length === 0) {
    return pickTopByRarity(ownedCards)
  }
  const byId = new Map(ownedCards.map((c) => [c.id, c]))
  const resolved = featuredIds
    .map((id) => byId.get(id))
    .filter((c): c is T => c !== undefined)
  if (resolved.length === 0) {
    return pickTopByRarity(ownedCards)
  }
  return resolved
}

/** Stable hue 0–359 derived from a string (FNV-1a). */
export function hashHue(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h) % 360
}

/** First 3 letters of the first word, ASCII-folded and uppercase. */
export function deriveShort(name: string): string {
  const folded =
    name
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z]/g, ' ')
      .trim()
      .split(/\s+/)[0] ?? ''
  return folded.slice(0, 3).toUpperCase()
}

export class ProfileDomain implements ProfileDomainInterface {
  readonly #userRepository: IocContainer['userRepository']
  readonly #userCardRepository: IocContainer['userCardRepository']
  readonly #cardRepository: IocContainer['cardRepository']

  constructor({
    userRepository,
    userCardRepository,
    cardRepository,
  }: IocContainer) {
    this.#userRepository = userRepository
    this.#userCardRepository = userCardRepository
    this.#cardRepository = cardRepository
  }

  async getFeaturedCards(username: string): Promise<FeaturedCardDto[]> {
    const user = await this.#userRepository.findByUsername(username)
    if (!user) {
      throw Boom.notFound('User not found')
    }
    const owned = await this.#userCardRepository.findByUser(user.id)
    // Prefer the rarer variant when the same cardId is owned in multiple variants.
    const variantPriority: Record<string, number> = {
      HOLOGRAPHIC: 2,
      BRILLIANT: 1,
      NORMAL: 0,
    }
    const byCardId = new Map<string, (typeof owned)[number]>()
    for (const uc of owned) {
      const current = byCardId.get(uc.card.id)
      if (
        !current ||
        (variantPriority[uc.variant] ?? 0) >
          (variantPriority[current.variant] ?? 0)
      ) {
        byCardId.set(uc.card.id, uc)
      }
    }
    const uniqueOwned = Array.from(byCardId.values()).map((uc) => ({
      id: uc.card.id,
      name: uc.card.name,
      imageUrl: uc.card.imageUrl,
      rarity: uc.card.rarity,
      variant: uc.variant,
      setId: uc.card.set.id,
      setName: uc.card.set.name,
    }))
    const resolved = resolveFeaturedCards(user.featuredCardIds, uniqueOwned)
    return resolved
  }

  async getSetsProgression(username: string): Promise<SetProgressionDto[]> {
    const user = await this.#userRepository.findByUsername(username)
    if (!user) {
      throw Boom.notFound('User not found')
    }
    const [sets, counts, allActiveCards] = await Promise.all([
      this.#cardRepository.findActiveSets(),
      this.#userCardRepository.countUniqueBySet(user.id),
      this.#cardRepository.findAllActive(),
    ])
    const totalsBySet = new Map<string, number>()
    for (const c of allActiveCards) {
      totalsBySet.set(c.setId, (totalsBySet.get(c.setId) ?? 0) + 1)
    }
    const progression: SetProgressionDto[] = sets.map((s) => {
      const owned = counts.get(s.id) ?? 0
      const total = totalsBySet.get(s.id) ?? 0
      const percent = total === 0 ? 0 : Math.round((owned / total) * 1000) / 10
      return {
        id: s.id,
        name: s.name,
        short: deriveShort(s.name),
        hue: s.hue ?? hashHue(s.name),
        owned,
        total,
        percent,
      }
    })
    progression.sort((a, b) => b.percent - a.percent)
    return progression
  }

  async setFeaturedCards(userId: string, cardIds: string[]): Promise<string[]> {
    const deduped = Array.from(new Set(cardIds))
    if (deduped.length === 0) {
      await this.#userRepository.updateFeaturedCardIds(userId, [])
      return []
    }
    const owned = await this.#userCardRepository.findByUser(userId)
    const ownedIds = new Set(owned.map((uc) => uc.card.id))
    const invalidIds = deduped.filter((id) => !ownedIds.has(id))
    if (invalidIds.length > 0) {
      throw Boom.badData('Card not in your collection', { invalidIds })
    }
    await this.#userRepository.updateFeaturedCardIds(userId, deduped)
    return deduped
  }
}
