// Progression des instances d'équipement : niveau, coût, sous-stats de palier.
// Module pur — le RNG est injecté pour rester testable.

export const EQUIP_MAX_LEVEL = 12
export const EQUIP_SUBSTAT_MILESTONE = 3
export const EQUIP_MAX_SUBSTATS = 4
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

export interface MilestoneResult {
  type: 'added' | 'improved'
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

/**
 * Applique un palier : ajoute une sous-stat aléatoire tant qu'il reste des
 * emplacements (clé jamais dupliquée), sinon améliore une sous-stat existante
 * en lui ajoutant un nouveau tirage dans sa range.
 */
export function rollMilestone(
  substats: Substat[],
  ranges: SubstatRanges,
  rng: () => number,
): { substats: Substat[]; milestone: MilestoneResult } {
  if (substats.length < EQUIP_MAX_SUBSTATS) {
    const available = SUBSTAT_KEYS.filter(
      (k) => !substats.some((s) => s.key === k),
    )
    const key = available[Math.floor(rng() * available.length)] as SubstatKey
    const rolledValue = rollValue(ranges[key], rng)
    return {
      substats: [...substats, { key, value: rolledValue }],
      milestone: { type: 'added', key, rolledValue, newValue: rolledValue },
    }
  }
  const index = Math.floor(rng() * substats.length)
  const target = substats[index] as Substat
  const rolledValue = rollValue(ranges[target.key], rng)
  const newValue = Math.round((target.value + rolledValue) * 10) / 10
  return {
    substats: substats.map((s, i) =>
      i === index ? { ...s, value: newValue } : s,
    ),
    milestone: { type: 'improved', key: target.key, rolledValue, newValue },
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
 * plus les sous-stats sommées par clé.
 */
export function effectiveEquipmentBonuses(
  catalogBonuses: Record<string, number>,
  level: number,
  substats: Substat[],
): Record<string, number> {
  const acc = scaleBaseBonuses(catalogBonuses, level)
  for (const s of substats) {
    acc[s.key] = (acc[s.key] ?? 0) + s.value
  }
  return acc
}
