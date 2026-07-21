// Progression des instances d'équipement : niveau, coût, sous-stats de palier.
// Module pur — le RNG est injecté pour rester testable.

export const EQUIP_MAX_LEVEL = 12
export const EQUIP_SUBSTAT_MILESTONE = 3
export const MAX_SUBSTATS_BY_RARITY = {
  COMMON: 0,
  UNCOMMON: 1,
  RARE: 2,
  EPIC: 3,
  LEGENDARY: 4,
} as const

export type EquipmentRarity = keyof typeof MAX_SUBSTATS_BY_RARITY
export const EQUIP_LEVEL_SCALE = 0.1

export const SUBSTAT_KEYS = [
  'hpFlat',
  'hpPct',
  'atkFlat',
  'atkPct',
  'defFlat',
  'defPct',
  'spdFlat',
  'spdPct',
] as const

export type SubstatKey = (typeof SUBSTAT_KEYS)[number]

export interface Substat {
  key: SubstatKey
  value: number
}

export type SubstatRanges = Record<SubstatKey, { min: number; max: number }>

export const SUBSTAT_RANGE_CONFIG_KEYS = [
  'equip.substatHpFlatMin',
  'equip.substatHpFlatMax',
  'equip.substatAtkFlatMin',
  'equip.substatAtkFlatMax',
  'equip.substatDefFlatMin',
  'equip.substatDefFlatMax',
  'equip.substatSpdFlatMin',
  'equip.substatSpdFlatMax',
  'equip.substatPctMin',
  'equip.substatPctMax',
] as const

export type SubstatRangeConfigKey = (typeof SUBSTAT_RANGE_CONFIG_KEYS)[number]

/**
 * Construit les ranges de tirage depuis les valeurs de GlobalConfig.
 * Pur : reçoit les valeurs, ne lit pas la config.
 */
export function substatRangesFromConfig(
  c: Record<SubstatRangeConfigKey, number>,
): SubstatRanges {
  const pct = { min: c['equip.substatPctMin'], max: c['equip.substatPctMax'] }
  return {
    hpFlat: {
      min: c['equip.substatHpFlatMin'],
      max: c['equip.substatHpFlatMax'],
    },
    atkFlat: {
      min: c['equip.substatAtkFlatMin'],
      max: c['equip.substatAtkFlatMax'],
    },
    defFlat: {
      min: c['equip.substatDefFlatMin'],
      max: c['equip.substatDefFlatMax'],
    },
    spdFlat: {
      min: c['equip.substatSpdFlatMin'],
      max: c['equip.substatSpdFlatMax'],
    },
    hpPct: { ...pct },
    atkPct: { ...pct },
    defPct: { ...pct },
    spdPct: { ...pct },
  }
}

export interface MilestoneResult {
  type: 'added' | 'improved' | 'base'
  key: SubstatKey
  rolledValue: number
  newValue: number
}

export function upgradeGoldCost(
  currentLevel: number,
  base: number,
  exp: number,
  rarityMult: number,
): number {
  return Math.round(base * exp ** (currentLevel - 1) * rarityMult)
}

export function isSubstatMilestone(level: number): boolean {
  return level % EQUIP_SUBSTAT_MILESTONE === 0
}

function rollValue(
  range: { min: number; max: number },
  rng: () => number,
): number {
  return Math.round((range.min + rng() * (range.max - range.min)) * 10) / 10
}

function pickAvailableKey(substats: Substat[], rng: () => number): SubstatKey {
  const available = SUBSTAT_KEYS.filter(
    (k) => !substats.some((s) => s.key === k),
  )
  const len = available.length
  return available[Math.min(Math.floor(rng() * len), len - 1)] as SubstatKey
}

/**
 * Tire les sous-stats initiales d'une instance à l'obtention : clés
 * distinctes du pool, valeurs uniformes dans leurs ranges.
 *
 * @param rng doit retourner un nombre dans [0, 1), comme Math.random.
 */
export function rollInitialSubstats(
  maxSubstats: number,
  ranges: SubstatRanges,
  rng: () => number,
): Substat[] {
  const count = Math.min(maxSubstats, SUBSTAT_KEYS.length)
  const substats: Substat[] = []
  for (let i = 0; i < count; i++) {
    const key = pickAvailableKey(substats, rng)
    substats.push({ key, value: rollValue(ranges[key], rng) })
  }
  return substats
}

/**
 * Applique un palier, en cascade :
 * 1. s'il reste un emplacement de sous-stat pour la rareté → ajout d'une
 *    sous-stat aléatoire (clé jamais dupliquée) ;
 * 2. sinon, s'il existe au moins une sous-stat → amélioration additive
 *    d'une existante ;
 * 3. sinon (aucun emplacement, ex. commune) → renforcement du bonus de
 *    base : le tirage s'ajoute au baseBoost de l'instance.
 *
 * @param rng doit retourner un nombre dans [0, 1), comme Math.random.
 */
export function rollMilestone(
  substats: Substat[],
  maxSubstats: number,
  baseKey: SubstatKey,
  baseBoost: number,
  ranges: SubstatRanges,
  rng: () => number,
): { substats: Substat[]; baseBoost: number; milestone: MilestoneResult } {
  if (substats.length < maxSubstats) {
    const key = pickAvailableKey(substats, rng)
    const rolledValue = rollValue(ranges[key], rng)
    return {
      substats: [...substats, { key, value: rolledValue }],
      baseBoost,
      milestone: { type: 'added', key, rolledValue, newValue: rolledValue },
    }
  }
  if (substats.length > 0) {
    const len = substats.length
    const index = Math.min(Math.floor(rng() * len), len - 1)
    const target = substats[index] as Substat
    const rolledValue = rollValue(ranges[target.key], rng)
    const newValue = Math.round((target.value + rolledValue) * 10) / 10
    return {
      substats: substats.map((s, i) =>
        i === index ? { ...s, value: newValue } : s,
      ),
      baseBoost,
      milestone: { type: 'improved', key: target.key, rolledValue, newValue },
    }
  }
  const rolledValue = rollValue(ranges[baseKey], rng)
  const newBoost = Math.round((baseBoost + rolledValue) * 10) / 10
  return {
    substats,
    baseBoost: newBoost,
    milestone: { type: 'base', key: baseKey, rolledValue, newValue: newBoost },
  }
}

export function scaleBaseBonuses(
  bonuses: Record<string, number>,
  level: number,
): Record<string, number> {
  const mult = 1 + EQUIP_LEVEL_SCALE * (level - 1)
  return Object.fromEntries(
    Object.entries(bonuses).map(([k, v]) => [k, v * mult]),
  )
}

/**
 * Bonus effectifs d'une instance : base du catalogue scalée par le niveau,
 * baseBoost appliqué à la première clé (le bonus de base de l'objet), puis
 * sous-stats sommées par clé.
 */
export function effectiveEquipmentBonuses(
  catalogBonuses: Record<string, number>,
  level: number,
  substats: Substat[],
  baseBoost = 0,
): Record<string, number> {
  const acc = scaleBaseBonuses(catalogBonuses, level)
  const baseKey = Object.keys(catalogBonuses)[0]
  if (baseKey !== undefined && baseBoost !== 0) {
    acc[baseKey] = (acc[baseKey] ?? 0) + baseBoost
  }
  for (const s of substats) {
    acc[s.key] = (acc[s.key] ?? 0) + s.value
  }
  return acc
}
