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

export type PRNG = () => number // 0..1

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
 * Butin d'une victoire de farm (campagne et tours) : UN lot et un seul parmi
 * une pièce d'équipement, de la poussière ou de l'énergie. Or et XP tombent à
 * chaque victoire, en dehors de ce tirage.
 */
export const VICTORY_DROP_CONFIG_KEYS = [
  'loot.equipmentPct',
  'loot.dustPct',
  'loot.dustMult',
  'loot.energyAmount',
] as const

export interface VictoryDrop {
  equipment: boolean
  dust: number
  energy: number
}

export type SweepRunOutcome = 'WIN' | 'LOSS' | 'SKIPPED'

/**
 * Ce qu'un passage de balayage a rapporté, dans l'ordre des passages : de quoi
 * afficher le détail combat par combat. Les gains eux-mêmes restent dans les
 * listes du résultat ; les index pointent dedans.
 */
export interface SweepRunLot {
  /**
   * Issue du passage. Le balayage ne simule pas encore les combats : tout
   * passage joué est une victoire. Les défaites (et l'arrêt du balayage après
   * plusieurs d'entre elles, passages restants `SKIPPED`) viendront avec la
   * simulation ; le contrat est prêt pour elles.
   */
  outcome: SweepRunOutcome
  dust: number
  energy: number
  /** Index dans `equipmentDrops`, `null` quand le lot n'était pas une pièce. */
  equipmentIndex: number | null
  /** Index dans `cardDrops` (campagne seulement), `null` sans carte. */
  cardIndex: number | null
}

/**
 * Les trois parts sont fixes : la part d'énergie est le reste après équipement
 * et poussière. Le bonus de drop de l'arbre n'y touche pas, il relève la
 * rareté des pièces (`boostRarityWeights`).
 */
type VictoryDropConfig = Record<
  (typeof VICTORY_DROP_CONFIG_KEYS)[number],
  number
>

function victoryEnergyPct(cfg: VictoryDropConfig): number {
  return Math.max(0, 100 - cfg['loot.equipmentPct'] - cfg['loot.dustPct'])
}

/** Poids de rareté ramenés à des parts en %, au dixième près. */
export function rarityShares(
  weights: Record<string, number | undefined>,
): Record<string, number> {
  const entries = Object.entries(weights).filter(
    (entry): entry is [string, number] => (entry[1] ?? 0) > 0,
  )
  const total = entries.reduce((acc, [, w]) => acc + w, 0)
  return Object.fromEntries(
    entries.map(([rarity, w]) => [rarity, Math.round((w / total) * 1000) / 10]),
  )
}

/** Part d'équipement du tirage, en %. */
export function victoryEquipmentPct(cfg: VictoryDropConfig): number {
  return Math.min(100 - victoryEnergyPct(cfg), cfg['loot.equipmentPct'])
}

/**
 * Bonus de drop de l'arbre de compétences : il relève la RARETÉ des pièces,
 * pas leur nombre. La plus haute rareté de l'étage voit son poids multiplié
 * par (1 + bonus), la plus basse ne bouge pas, les autres s'échelonnent entre
 * les deux. Une rareté absente de l'étage le reste : le bonus ne fait pas
 * apparaître de légendaire là où il n'y en a pas.
 */
export function boostRarityWeights<
  T extends Record<string, number | undefined>,
>(weights: T, dropBonusPct: number): T {
  const present = RARITY_ORDER.filter((r) => (weights[r] ?? 0) > 0)
  if (dropBonusPct <= 0 || present.length < 2) {
    return weights
  }
  const boosted: Record<string, number | undefined> = { ...weights }
  present.forEach((rarity, rank) => {
    const share = rank / (present.length - 1)
    boosted[rarity] =
      (weights[rarity] ?? 0) * (1 + (dropBonusPct / 100) * share)
  })
  return boosted as T
}

/**
 * Le lot unique tel qu'il s'annonce avant le combat : les trois parts (en %)
 * et les montants de poussière et d'énergie quand ce sont eux qui tombent.
 */
export interface VictoryDropPreview {
  equipmentPct: number
  dustPct: number
  dustAmount: number
  energyPct: number
  energyAmount: number
}

export function victoryDropPreview(
  baseDust: number,
  cfg: VictoryDropConfig,
): VictoryDropPreview {
  const energyPct = victoryEnergyPct(cfg)
  const equipmentPct = victoryEquipmentPct(cfg)
  return {
    equipmentPct,
    dustPct: 100 - energyPct - equipmentPct,
    dustAmount: victoryDustAmount(baseDust, cfg),
    energyPct,
    energyAmount: cfg['loot.energyAmount'],
  }
}

function victoryDustAmount(baseDust: number, cfg: VictoryDropConfig): number {
  return Math.round(baseDust * cfg['loot.dustMult'])
}

export function rollVictoryDrop(
  baseDust: number,
  cfg: VictoryDropConfig,
  prng: PRNG,
): VictoryDrop {
  const energyPct = victoryEnergyPct(cfg)
  const equipmentPct = victoryEquipmentPct(cfg)
  const roll = prng() * 100
  if (roll < equipmentPct) {
    return { equipment: true, dust: 0, energy: 0 }
  }
  if (roll >= 100 - energyPct) {
    return { equipment: false, dust: 0, energy: cfg['loot.energyAmount'] }
  }
  return {
    equipment: false,
    dust: victoryDustAmount(baseDust, cfg),
    energy: 0,
  }
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
  return matching.at(-1) ?? null
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
