import type {
  EquipmentInstance,
  EquipmentSetDefinition,
} from '../api/equipment.api'
import type { Card, CardVariant } from '../constants/card.constant'
import {
  aggregateEquipmentBonuses,
  cardStuffStats,
  computePower,
  displayStatBases,
  displayStats,
  type StuffStatBonuses,
} from './cardStats'

/**
 * Logique de l'atelier « Équiper » : stats d'une carte pour un équipement
 * SIMULÉ (aperçu avant d'équiper), tri des pièces selon les stats visées et
 * conseil de stats par carte. Pur — tout ce qui vient du serveur (sets,
 * baseline, échelle de niveau) est passé en argument.
 */

export type LabStat =
  | 'hp'
  | 'atk'
  | 'def'
  | 'spd'
  | 'critRate'
  | 'critDmg'
  | 'armorPen'
  | 'lifesteal'

export const LAB_STATS: LabStat[] = [
  'hp',
  'atk',
  'def',
  'spd',
  'critRate',
  'critDmg',
  'armorPen',
  'lifesteal',
]

/** PV/ATQ/DEF/VIT sont des valeurs brutes, le reste des points de %. */
export const PCT_STATS = new Set<LabStat>([
  'critRate',
  'critDmg',
  'armorPen',
  'lifesteal',
])

export type LabTotals = Record<LabStat, number> & { power: number }

export type LabContext = {
  card: Card
  level: number
  variant: CardVariant
  palier: number
  userCardId: string
  levelScale: number
  setDefs: EquipmentSetDefinition[]
  baseline: StuffStatBonuses
}

/** Stats finales de la carte pour l'inventaire donné — même chemin que `CombatPanel`. */
export function labTotals(
  items: EquipmentInstance[],
  ctx: LabContext,
): LabTotals {
  const bonuses = aggregateEquipmentBonuses(
    items,
    ctx.userCardId,
    ctx.levelScale,
    ctx.setDefs,
  )
  const s = displayStats(ctx.card, ctx.level, ctx.variant, ctx.palier, bonuses)
  const stuff = cardStuffStats(
    items,
    ctx.userCardId,
    ctx.levelScale,
    ctx.setDefs,
    ctx.baseline,
  )
  const classic = { hp: s.pv, atk: s.atq, def: s.def, spd: s.vit }
  return { ...classic, ...stuff, power: computePower(classic) }
}

/** Stats de la carte sans aucun équipement (colonne « Base »). */
export function labBase(ctx: LabContext): LabTotals {
  const b = displayStatBases(ctx.card, ctx.level, ctx.variant, ctx.palier)
  const classic = { hp: b.pv, atk: b.atq, def: b.def, spd: b.vit }
  return { ...classic, ...ctx.baseline, power: computePower(classic) }
}

/**
 * Inventaire tel qu'il serait si `piece` passait sur la carte : l'occupant
 * actuel de son emplacement est retiré, la pièce quitte la carte qui la
 * portait (le serveur fait de même à l'équipement).
 */
export function withPiece(
  items: EquipmentInstance[],
  piece: EquipmentInstance,
  userCardId: string,
): EquipmentInstance[] {
  return items.map((i) => {
    if (i.id === piece.id) {
      return { ...i, equippedOnId: userCardId }
    }
    if (i.slot === piece.slot && i.equippedOnId === userCardId) {
      return { ...i, equippedOnId: null }
    }
    return i
  })
}

const PRIO_WEIGHTS = [3, 2, 1]

/**
 * Gain d'un changement selon les stats visées, pondérées 3/2/1. PV/ATQ/DEF/VIT
 * comptent en % de gain (une ATQ de 40 et des PV de 600 n'ont pas la même
 * échelle) ; les stats de stuff sont déjà des points de %.
 */
export function prioScore(
  next: LabTotals,
  cur: LabTotals,
  prio: LabStat[],
): number {
  return prio.reduce((sum, k, i) => {
    const d = next[k] - cur[k]
    const rel = PCT_STATS.has(k) ? d : (d / Math.max(cur[k], 1)) * 100
    return sum + PRIO_WEIGHTS[i] * rel
  }, 0)
}

/** Ajoute une stat visée : jusqu'à 3, la 4e remplace la 3e. */
export function togglePrio(prio: LabStat[], k: LabStat): LabStat[] {
  if (prio.includes(k)) {
    return prio.filter((x) => x !== k)
  }
  return prio.length >= 3 ? [...prio.slice(0, 2), k] : [...prio, k]
}

export type AdviceRole = 'fast' | 'striker' | 'tank' | 'balanced'

/**
 * Conseil de stats à viser, tiré du profil de base de la carte. Seuils posés
 * sur le catalogue : les VIT vont de 72 à 135 (au-delà de 110, la carte joue
 * nettement plus souvent), le ratio ATQ/PV de ~0,11 (gardes) à ~0,36
 * (frappeurs).
 */
export function adviceFor(card: Card): { role: AdviceRole; prio: LabStat[] } {
  const ratio = card.baseAtk / Math.max(card.baseHp, 1)
  if (card.baseSpd >= 110) {
    return { role: 'fast', prio: ['spd', 'critRate', 'critDmg'] }
  }
  if (ratio >= 0.25) {
    return { role: 'striker', prio: ['atk', 'critRate', 'critDmg'] }
  }
  if (ratio <= 0.15) {
    return { role: 'tank', prio: ['hp', 'def', 'spd'] }
  }
  return { role: 'balanced', prio: ['atk', 'spd', 'critRate'] }
}
