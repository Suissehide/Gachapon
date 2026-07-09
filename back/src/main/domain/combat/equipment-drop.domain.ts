type Rarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'

const RARITY_ORDER: Rarity[] = [
  'COMMON',
  'UNCOMMON',
  'RARE',
  'EPIC',
  'LEGENDARY',
]

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
 * Base rarity weights for guaranteed first-clear drops. `minRarity` is only a
 * floor: once the pool is filtered to rarities >= minRarity, these weights make
 * each higher tier progressively rarer (steep decay) instead of uniform — so a
 * LEGENDARY guaranteed drop stays a real event. Farm drops carry their own
 * per-stage `equipmentWeights`; this table applies to first-clear rolls only.
 */
const FIRST_CLEAR_RARITY_WEIGHTS: Record<Rarity, number> = {
  COMMON: 100,
  UNCOMMON: 40,
  RARE: 12,
  EPIC: 3,
  LEGENDARY: 0.5,
}

/**
 * Weighted pick among rarities >= minRarity using FIRST_CLEAR_RARITY_WEIGHTS.
 * Returns null when minRarity is unknown (no allowed tiers).
 */
function pickFirstClearRarity(minRarity: Rarity, prng: PRNG): Rarity | null {
  const start = RARITY_ORDER.indexOf(minRarity)
  if (start < 0) {
    return null
  }
  const weights: Partial<Record<Rarity, number>> = {}
  for (const rarity of RARITY_ORDER.slice(start)) {
    weights[rarity] = FIRST_CLEAR_RARITY_WEIGHTS[rarity]
  }
  return pickWeightedRarity(weights, prng)
}

/**
 * Roll for an equipment drop in farm mode.
 * Returns the dropped rarity, or null if no drop.
 */
export function rollFarmEquipmentDrop(
  loot: FarmLoot,
  prng: PRNG,
): Rarity | null {
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
export function rollFirstClearEquipmentRarity(
  firstClear: FirstClearLoot,
  prng: PRNG,
): Rarity | null {
  if (!firstClear.guaranteedEquipment) {
    return null
  }
  return pickFirstClearRarity(firstClear.guaranteedEquipment.minRarity, prng)
}

/**
 * Same idea for first-clear card.
 */
export function rollFirstClearCardRarity(
  firstClear: FirstClearLoot,
  prng: PRNG,
): Rarity | null {
  if (!firstClear.guaranteedCard) {
    return null
  }
  return pickFirstClearRarity(firstClear.guaranteedCard.minRarity, prng)
}

/**
 * Pick a piece from a list of {id, dropWeight, rarity} entries filtered to the chosen rarity.
 * Returns the picked id (uniform weighted by dropWeight). Returns null if none match.
 */
export function pickEquipmentForRarity<
  T extends { id: string; dropWeight: number; rarity: Rarity },
>(candidates: T[], rarity: Rarity, prng: PRNG): T | null {
  const matching = candidates.filter((c) => c.rarity === rarity)
  if (matching.length === 0) {
    return null
  }
  const totalWeight = matching.reduce((acc, c) => acc + c.dropWeight, 0)
  if (totalWeight <= 0) {
    return null
  }
  let r = prng() * totalWeight
  for (const c of matching) {
    r -= c.dropWeight
    if (r <= 0) {
      return c
    }
  }
  return matching[matching.length - 1]!
}

function pickWeightedRarity(
  weights: Partial<Record<Rarity, number>>,
  prng: PRNG,
): Rarity {
  const entries = Object.entries(weights) as [Rarity, number][]
  const total = entries.reduce((acc, [, w]) => acc + w, 0)
  if (total <= 0) {
    // Defensive fallback
    return 'COMMON'
  }
  let r = prng() * total
  for (const [rar, w] of entries) {
    r -= w
    if (r <= 0) {
      return rar
    }
  }
  return entries[entries.length - 1]?.[0] ?? 'COMMON'
}

export const __test__ = { pickWeightedRarity }
