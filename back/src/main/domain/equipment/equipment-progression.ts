// Progression des instances d'équipement : niveau, coût, sous-stats de palier.
// Module pur — le RNG est injecté pour rester testable.

export const EQUIP_MAX_LEVEL = 12
export const EQUIP_SUBSTAT_MILESTONE = 3
export const EQUIP_MAX_SUBSTATS = 4
export const INITIAL_SUBSTATS_BY_RARITY = {
  COMMON: 0,
  UNCOMMON: 1,
  RARE: 2,
  EPIC: 3,
  LEGENDARY: 4,
} as const

export type EquipmentRarity = keyof typeof INITIAL_SUBSTATS_BY_RARITY
export const EQUIP_LEVEL_SCALE = 0.1

export const SUBSTAT_KEYS = [
  'hpFlat',
  'hpPct',
  'atkFlat',
  'atkPct',
  'defFlat',
  'defPct',
  // La vitesse n'existe qu'en valeur plate : sous ATB elle multiplie le
  // rendement de l'unité au lieu de s'y ajouter, donc un pourcentage y serait
  // hors-échelle face aux autres sous-stats. Elle reste disponible en
  // pourcentage via le set Célérité, dont la magnitude est fixe.
  'spdFlat',
  // Stats de stuff — pourcentage uniquement, une valeur plate n'aurait pas de sens.
  'critRatePct',
  'critDmgPct',
  'armorPenPct',
  'lifestealPct',
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
  'equip.substatCritRatePctMin',
  'equip.substatCritRatePctMax',
  'equip.substatCritDmgPctMin',
  'equip.substatCritDmgPctMax',
  'equip.substatArmorPenPctMin',
  'equip.substatArmorPenPctMax',
  'equip.substatLifestealPctMin',
  'equip.substatLifestealPctMax',
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
    critRatePct: {
      min: c['equip.substatCritRatePctMin'],
      max: c['equip.substatCritRatePctMax'],
    },
    critDmgPct: {
      min: c['equip.substatCritDmgPctMin'],
      max: c['equip.substatCritDmgPctMax'],
    },
    armorPenPct: {
      min: c['equip.substatArmorPenPctMin'],
      max: c['equip.substatArmorPenPctMax'],
    },
    lifestealPct: {
      min: c['equip.substatLifestealPctMin'],
      max: c['equip.substatLifestealPctMax'],
    },
  }
}

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

/**
 * Coût d'amélioration APRÈS remise du bonus d'équipe `forge` — multiplicatif
 * sur le résultat déjà arrondi de `upgradeGoldCost`, jamais injecté plus tôt
 * dans le calcul.
 *
 * UNE SEULE fonction pure derrière laquelle deux appelants doivent se
 * ranger : la charge réelle (`equipment.domain.ts#upgrade`) et la
 * prévisualisation renvoyée par `listUserEquipment` pour l'écran d'inventaire.
 * Avant cette extraction, le front recalculait le prix depuis la config
 * publique (qui ne porte aucune donnée de bonus d'équipe) — l'écran
 * affichait le prix plein pendant que le serveur facturait le prix remisé,
 * et un joueur dont l'or tombait entre les deux se voyait refuser une
 * amélioration qu'il pouvait pourtant payer.
 */
export function discountedUpgradeGoldCost(
  currentLevel: number,
  base: number,
  exp: number,
  rarityMult: number,
  forgeBonusPct: number,
): number {
  const rawCost = upgradeGoldCost(currentLevel, base, exp, rarityMult)
  return Math.round(rawCost * (1 - forgeBonusPct / 100))
}

export function isSubstatMilestone(level: number): boolean {
  return level % EQUIP_SUBSTAT_MILESTONE === 0
}

/**
 * Toute valeur de stat est un ENTIER : un « +19,2 % » n'apporte rien au joueur
 * et alourdit chaque ligne d'inventaire. L'arrondi se fait ici, à la source,
 * jamais au rendu — le front recalcule les bonus scalés de son côté, et un
 * arrondi cosmétique ferait diverger l'affichage de ce que le combat calcule.
 */
function rollValue(
  range: { min: number; max: number },
  rng: () => number,
): number {
  return Math.round(range.min + rng() * (range.max - range.min))
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
 * Applique un palier : sous le cap universel de 4 sous-stats → ajout d'une
 * sous-stat aléatoire (clé jamais dupliquée) ; sinon → amélioration additive
 * d'une existante tirée au hasard.
 *
 * @param rng doit retourner un nombre dans [0, 1), comme Math.random.
 */
export function rollMilestone(
  substats: Substat[],
  ranges: SubstatRanges,
  rng: () => number,
): { substats: Substat[]; milestone: MilestoneResult } {
  if (substats.length < EQUIP_MAX_SUBSTATS) {
    const key = pickAvailableKey(substats, rng)
    const rolledValue = rollValue(ranges[key], rng)
    return {
      substats: [...substats, { key, value: rolledValue }],
      milestone: { type: 'added', key, rolledValue, newValue: rolledValue },
    }
  }
  const len = substats.length
  const index = Math.min(Math.floor(rng() * len), len - 1)
  const target = substats[index] as Substat
  const rolledValue = rollValue(ranges[target.key], rng)
  // `Math.round` par sécurité : les pièces d'avant l'arrondi entier portent
  // encore des valeurs décimales tant que la migration n'a pas tourné.
  const newValue = Math.round(target.value + rolledValue)
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
    Object.entries(bonuses).map(([k, v]) => [k, Math.round(v * mult)]),
  )
}

/**
 * Bonus effectifs d'une instance : base du catalogue scalée par le niveau,
 * baseBoost appliqué à la première clé (le bonus de base de l'objet), puis
 * sous-stats sommées par clé.
 *
 * Le résultat est entier : la base scalée l'est déjà, les sous-stats aussi, et
 * le baseBoost (un Float en base) est arrondi avec elle.
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
    acc[baseKey] = Math.round((acc[baseKey] ?? 0) + baseBoost)
  }
  for (const s of substats) {
    acc[s.key] = (acc[s.key] ?? 0) + s.value
  }
  return acc
}
