// Bonus de set d'équipement. Module pur : reçoit les valeurs de configuration,
// ne lit jamais la config lui-même.
//
// Règle mnémotechnique du système : le 2-pièces donne une stat classique,
// le 4-pièces donne une stat de stuff. Les quatre sets couvrent ainsi
// exactement les quatre anciennes stats et les quatre nouvelles.

import type { EquipmentBonuses } from '../combat/combat-stats.domain'

export const SET_KEYS = ['FUREUR', 'PRECISION', 'PERCEE', 'SANGSUE'] as const
export type SetKey = (typeof SET_KEYS)[number]

/** Paliers du système. Ne pas ajouter de palier sans refaire le calcul du farm. */
export const SET_TIER_TWO = 2
export const SET_TIER_FOUR = 4

export const SET_BONUS_CONFIG_KEYS = [
  'set.fureur2AtkPct',
  'set.fureur4CritDmgPct',
  'set.precision2SpdPct',
  'set.precision4CritRatePct',
  'set.percee2DefPct',
  'set.percee4ArmorPenPct',
  'set.sangsue2HpPct',
  'set.sangsue4LifestealPct',
] as const

export type SetBonusConfigKey = (typeof SET_BONUS_CONFIG_KEYS)[number]

export interface SetDefinition {
  two: EquipmentBonuses
  four: EquipmentBonuses
}

export function setBonusesFromConfig(
  c: Record<SetBonusConfigKey, number>,
): Record<SetKey, SetDefinition> {
  return {
    FUREUR: {
      two: { atkPct: c['set.fureur2AtkPct'] },
      four: { critDmgPct: c['set.fureur4CritDmgPct'] },
    },
    PRECISION: {
      two: { spdPct: c['set.precision2SpdPct'] },
      four: { critRatePct: c['set.precision4CritRatePct'] },
    },
    PERCEE: {
      two: { defPct: c['set.percee2DefPct'] },
      four: { armorPenPct: c['set.percee4ArmorPenPct'] },
    },
    SANGSUE: {
      two: { hpPct: c['set.sangsue2HpPct'] },
      four: { lifestealPct: c['set.sangsue4LifestealPct'] },
    },
  }
}

function accumulate(cible: EquipmentBonuses, ajout: EquipmentBonuses): void {
  for (const [cle, valeur] of Object.entries(ajout) as [
    keyof EquipmentBonuses,
    number,
  ][]) {
    cible[cle] = (cible[cle] ?? 0) + valeur
  }
}

/**
 * Agrège les bonus de set pour UNE carte, à partir des clés de set des pièces
 * qu'elle porte. Le comptage est par carte : deux cartes qui portent chacune
 * 2 pièces de Fureur ont chacune leur palier 2, elles ne cumulent pas à 4.
 */
export function computeSetBonuses(
  setKeys: readonly string[],
  defs: Record<SetKey, SetDefinition>,
): EquipmentBonuses {
  const comptes = new Map<string, number>()
  for (const cle of setKeys) {
    comptes.set(cle, (comptes.get(cle) ?? 0) + 1)
  }
  const total: EquipmentBonuses = {}
  for (const [cle, n] of comptes) {
    const def = defs[cle as SetKey]
    if (!def) {
      continue
    }
    if (n >= SET_TIER_TWO) {
      accumulate(total, def.two)
    }
    if (n >= SET_TIER_FOUR) {
      accumulate(total, def.four)
    }
  }
  return total
}
