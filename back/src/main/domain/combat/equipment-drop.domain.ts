type Rarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'

const RARITY_ORDER: Rarity[] = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY']

export interface FarmLoot {
  gold: number
  dust: number
  xp: number
  equipmentDropChance: number
  equipmentWeights: Partial<Record<Rarity, number>>
  cardChance: number
}

export interface FirstClearLoot {
  gold: number
  dust: number
  xp: number
  guaranteedEquipment?: { minRarity: Rarity } | null
  guaranteedCard?: { minRarity: Rarity } | null
}

export interface PRNG {
  (): number // 0..1
}

/**
 * Roll for an equipment drop in farm mode.
 * Returns the dropped rarity, or null if no drop.
 */
export function rollFarmEquipmentDrop(loot: FarmLoot, prng: PRNG): Rarity | null {
  if (prng() >= loot.equipmentDropChance) {
    return null
  }
  return pickWeightedRarity(loot.equipmentWeights, prng)
}

/**
 * Roll for a card drop in farm mode.
 */
export function rollFarmCardDrop(loot: FarmLoot, prng: PRNG): boolean {
  return prng() < loot.cardChance
}

/**
 * Determine the rarity to roll for a guaranteed first-clear equipment drop.
 * Picks uniformly among rarities >= minRarity.
 */
export function rollFirstClearEquipmentRarity(firstClear: FirstClearLoot, prng: PRNG): Rarity | null {
  if (!firstClear.guaranteedEquipment) return null
  const min = firstClear.guaranteedEquipment.minRarity
  const allowed = RARITY_ORDER.slice(RARITY_ORDER.indexOf(min))
  if (allowed.length === 0) return null
  const idx = Math.floor(prng() * allowed.length)
  return allowed[Math.min(idx, allowed.length - 1)]!
}

/**
 * Same idea for first-clear card.
 */
export function rollFirstClearCardRarity(firstClear: FirstClearLoot, prng: PRNG): Rarity | null {
  if (!firstClear.guaranteedCard) return null
  const min = firstClear.guaranteedCard.minRarity
  const allowed = RARITY_ORDER.slice(RARITY_ORDER.indexOf(min))
  if (allowed.length === 0) return null
  const idx = Math.floor(prng() * allowed.length)
  return allowed[Math.min(idx, allowed.length - 1)]!
}

/**
 * Pick a piece from a list of {id, dropWeight, rarity} entries filtered to the chosen rarity.
 * Returns the picked id (uniform weighted by dropWeight). Returns null if none match.
 */
export function pickEquipmentForRarity<T extends { id: string; dropWeight: number; rarity: Rarity }>(
  candidates: T[],
  rarity: Rarity,
  prng: PRNG,
): T | null {
  const matching = candidates.filter((c) => c.rarity === rarity)
  if (matching.length === 0) return null
  const totalWeight = matching.reduce((acc, c) => acc + c.dropWeight, 0)
  if (totalWeight <= 0) return null
  let r = prng() * totalWeight
  for (const c of matching) {
    r -= c.dropWeight
    if (r <= 0) return c
  }
  return matching[matching.length - 1]!
}

function pickWeightedRarity(weights: Partial<Record<Rarity, number>>, prng: PRNG): Rarity {
  const entries = Object.entries(weights) as [Rarity, number][]
  const total = entries.reduce((acc, [, w]) => acc + w, 0)
  if (total <= 0) {
    // Defensive fallback
    return 'COMMON'
  }
  let r = prng() * total
  for (const [rar, w] of entries) {
    r -= w
    if (r <= 0) return rar
  }
  return entries[entries.length - 1]![0]
}

export const __test__ = { pickWeightedRarity }
