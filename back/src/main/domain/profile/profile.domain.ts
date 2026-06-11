// back/src/main/domain/profile/profile.domain.ts

const RARITY_ORDER = ['LEGENDARY', 'EPIC', 'RARE', 'UNCOMMON', 'COMMON'] as const

type OwnedCardLike = { id: string; rarity: string }

/** Returns up to 5 owned cards: 1 per rarity (LEGENDARY→COMMON), filling missing
 *  slots with extras from rarer tiers first. */
export function pickTopByRarity<T extends OwnedCardLike>(ownedCards: T[]): T[] {
  if (ownedCards.length === 0) {
    return []
  }
  const byRarity = new Map<string, T[]>()
  for (const card of ownedCards) {
    const arr = byRarity.get(card.rarity) ?? []
    arr.push(card)
    byRarity.set(card.rarity, arr)
  }
  const picked: T[] = []
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
  for (let i = 0; i < RARITY_ORDER.length; i += 1) {
    const rarity = RARITY_ORDER[i]!
    let card = takeNext(rarity)
    if (!card) {
      for (let j = i - 1; j >= 0 && !card; j -= 1) {
        card = takeNext(RARITY_ORDER[j]!)
      }
    }
    if (!card) {
      for (let j = i + 1; j < RARITY_ORDER.length && !card; j += 1) {
        card = takeNext(RARITY_ORDER[j]!)
      }
    }
    if (card) {
      picked.push(card)
    }
    if (picked.length === 5) {
      return picked
    }
  }
  return picked
}
