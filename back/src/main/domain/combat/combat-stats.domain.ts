import type { CardVariant } from '../../types/domain/gacha/gacha.types'

const VARIANT_MULT: Record<CardVariant, number> = {
  NORMAL: 1.0,
  BRILLIANT: 1.15,
  HOLOGRAPHIC: 1.3,
}

const STAT_GROWTH_PER_LEVEL = 0.09
export const ASCENSION_STAT_BONUS = 0.15

export interface CombatStats {
  hp: number
  atk: number
  def: number
  spd: number
  /** Chance de coup critique, en points de pourcentage. Capé à 100. */
  critRate: number
  /** Multiplicateur de coup critique, en points de pourcentage (150 = x1,5). */
  critDmg: number
  /** Part de la DEF de la cible ignorée, en points de pourcentage. */
  armorPen: number
  /** Part des dégâts infligés rendue en soin, en points de pourcentage. */
  lifesteal: number
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
  // Stats de stuff : additives en points de pourcentage, jamais mises à
  // l'échelle par la progression de la carte.
  critRatePct?: number
  critDmgPct?: number
  armorPenPct?: number
  lifestealPct?: number
}

/** Valeurs de base des quatre stats de stuff, communes alliés/ennemis (GlobalConfig). */
export interface CombatStatsBaseline {
  critRate: number
  critDmg: number
  armorPen: number
  lifesteal: number
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
  /** Valeurs de base des stats de stuff (GlobalConfig), non mises à l'échelle. */
  baseStats: CombatStatsBaseline
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
 *
 * Même remarque pour `skillModifiers.defPct` : `computeStat` l'agrège dans la
 * DEF finale au même titre que l'équipement (voir `computeFinalStats`), mais
 * cette référence ne le reproduit pas non plus. Un futur skill accordant de la
 * DEF en pourcentage casserait donc l'invariance exactement comme le ferait
 * l'équipement — c'est délibéré, pas un oubli.
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
 * Compute the eight combat stats for a unit. Pure function.
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
    baseStats,
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
  // La VITESSE ne suit ni le niveau, ni le palier, ni la variante : elle reste
  // la valeur de base de la carte, que seul l'équipement fait bouger.
  //
  // Sous ATB, la fréquence de tour est proportionnelle à la vitesse : ce qui
  // compte est le RAPPORT entre les deux camps, jamais la valeur absolue. La
  // faire croître des deux côtés ne changeait donc rien au combat, mais
  // rendait l'équilibrage mouvant (le rapport dérivait avec la progression) et
  // gonflait la jauge de puissance, qui multiplie tout par la vitesse — un
  // boss d'étage 80 y paraissait 23 fois plus fort qu'il ne l'est.
  //
  // Figée, la vitesse devient une décision de build : une carte est rapide ou
  // lente par archétype, et l'équipement décide du reste.
  const spd = computeStat(
    baseSpd,
    1,
    1,
    1,
    equipment.map((e) => e.spdFlat ?? 0),
    equipment.map((e) => e.spdPct ?? 0),
    skillModifiers.spdPct ?? 0,
  )

  // Stats de stuff : purement additives en points de pourcentage, jamais
  // multipliées par le niveau/palier/variante — seul l'équipement les fait
  // bouger, contrairement à hp/atk/def/spd ci-dessus.
  const somme = (cle: keyof EquipmentBonuses) =>
    equipment.reduce((acc, e) => acc + (e[cle] ?? 0), 0)

  return {
    hp: Math.round(hp),
    atk: Math.round(atk),
    def: Math.round(def),
    spd: Math.round(spd),
    critRate: Math.min(100, baseStats.critRate + somme('critRatePct')),
    critDmg: baseStats.critDmg + somme('critDmgPct'),
    armorPen: baseStats.armorPen + somme('armorPenPct'),
    lifesteal: baseStats.lifesteal + somme('lifestealPct'),
  }
}
