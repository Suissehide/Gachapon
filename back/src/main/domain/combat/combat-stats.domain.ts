import type { CardVariant } from '../../types/domain/gacha/gacha.types'

const VARIANT_MULT: Record<CardVariant, number> = {
  NORMAL: 1.0,
  BRILLIANT: 1.15,
  HOLOGRAPHIC: 1.3,
}

const STAT_GROWTH_PER_LEVEL = 0.06
export const ASCENSION_STAT_BONUS = 0.15

export interface CombatStats {
  hp: number
  atk: number
  def: number
  spd: number
}

export interface EquipmentBonuses {
  hpFlat?: number
  hpPct?: number
  atkFlat?: number
  atkPct?: number
  defFlat?: number
  defPct?: number
  spdFlat?: number
  spdPct?: number
}

export interface SkillModifiers {
  hpPct?: number
  atkPct?: number
  defPct?: number
  spdPct?: number
  // Reserved for Phase 2 extensions:
  goldFindPct?: number
  dustFindPct?: number
  bossDamagePct?: number
}

export interface CombatStatsInput {
  baseHp: number
  baseAtk: number
  baseDef: number
  baseSpd: number
  level: number
  palier: number
  variant: CardVariant
  /** Optional list of equipped pieces. */
  equipment?: EquipmentBonuses[]
  /** Phase 2 hook — empty object in Phase 1. */
  skillModifiers?: SkillModifiers
}

function sum(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0)
}

function levelMultiplier(level: number): number {
  return 1 + STAT_GROWTH_PER_LEVEL * (level - 1)
}

function palierMultiplier(palier: number): number {
  return (1 + ASCENSION_STAT_BONUS) ** (palier - 1)
}

/**
 * Référence de mitigation d'une unité : reproduit exactement le facteur d'échelle
 * appliqué à la DEF de base par `computeStat` (niveau, variante, palier), mais
 * PAS les bonus d'équipement.
 *
 * C'est volontaire : la DEF de base devient invariante en progression (un Tank
 * réduit autant les dégâts au niveau 1 qu'au niveau 70), tandis que l'équipement
 * apporte un gain de mitigation réel. Sans ça, la constante fixe de l'ancienne
 * formule faisait passer un Tank épique de 15 % à 73 % de réduction par simple
 * montée en niveau.
 */
export function mitigationRefFor(input: {
  level: number
  palier: number
  variant: CardVariant
  defMitigationRef: number
}): number {
  const { level, palier, variant, defMitigationRef } = input
  return (
    defMitigationRef *
    levelMultiplier(level) *
    VARIANT_MULT[variant] *
    palierMultiplier(palier)
  )
}

/**
 * Computes one stat's final value with: base growth, variant, palier,
 * equipment flat + percent bonuses, and skill modifier percent.
 */
function computeStat(
  baseStat: number,
  level: number,
  palier: number,
  variantMult: number,
  flatBonuses: number[],
  pctBonuses: number[],
  skillModPct: number,
): number {
  const raw =
    baseStat * levelMultiplier(level) * variantMult * palierMultiplier(palier)
  const withFlat = raw + sum(flatBonuses)
  const totalPct = sum(pctBonuses) + skillModPct
  return withFlat * (1 + totalPct / 100)
}

/**
 * Compute the four combat stats for a unit. Pure function.
 */
export function computeFinalStats(input: CombatStatsInput): CombatStats {
  const {
    baseHp,
    baseAtk,
    baseDef,
    baseSpd,
    level,
    palier,
    variant,
    equipment = [],
    skillModifiers = {},
  } = input

  const variantMult = VARIANT_MULT[variant]

  const hp = computeStat(
    baseHp,
    level,
    palier,
    variantMult,
    equipment.map((e) => e.hpFlat ?? 0),
    equipment.map((e) => e.hpPct ?? 0),
    skillModifiers.hpPct ?? 0,
  )
  const atk = computeStat(
    baseAtk,
    level,
    palier,
    variantMult,
    equipment.map((e) => e.atkFlat ?? 0),
    equipment.map((e) => e.atkPct ?? 0),
    skillModifiers.atkPct ?? 0,
  )
  const def = computeStat(
    baseDef,
    level,
    palier,
    variantMult,
    equipment.map((e) => e.defFlat ?? 0),
    equipment.map((e) => e.defPct ?? 0),
    skillModifiers.defPct ?? 0,
  )
  const spd = computeStat(
    baseSpd,
    level,
    palier,
    variantMult,
    equipment.map((e) => e.spdFlat ?? 0),
    equipment.map((e) => e.spdPct ?? 0),
    skillModifiers.spdPct ?? 0,
  )

  return {
    hp: Math.round(hp),
    atk: Math.round(atk),
    def: Math.round(def),
    spd: Math.round(spd),
  }
}
