// Bonus de set d'équipement. Module pur : reçoit les valeurs de configuration,
// ne lit jamais la config lui-même.
//
// Un set = UNE taille et UN bonus.
//
// Il n'y a plus de paliers cumulés (2 pièces puis 4) : on lisait mal qu'à
// 4 pièces le bonus de 2 s'ajoutait à celui de 4. Chaque set annonce
// désormais son nombre de pièces requis, atteint ou non — rien à additionner
// de tête.
//
// Les tailles sont réparties sur 2, 3 et 4 pièces pour que les 7
// emplacements d'une carte se composent : 4+3, 4+2, 3+2+2, etc. Plus un set
// est grand, plus il mobilise d'emplacements, donc plus son bonus est fort.
//
// Chaque set porte la stat qui fait son identité. La défense en pourcentage
// n'a volontairement pas de set — sept sets pour huit stats candidates — mais
// elle reste disponible en stat principale (armure, gants, ceinture) et en
// sous-stat.

import type { EquipmentBonuses } from '../combat/combat-stats.domain'

export const SET_KEYS = [
  'FUREUR',
  'PRECISION',
  'PERCEE',
  'SANGSUE',
  'ASSAUT',
  'COLOSSE',
  'CELERITE',
] as const
export type SetKey = (typeof SET_KEYS)[number]

/** Tailles autorisées. Une carte a 7 emplacements : 4+3 et 4+2 tiennent. */
export type SetSize = 2 | 3 | 4

export const SET_BONUS_CONFIG_KEYS = [
  'set.fureurCritDmgPct',
  'set.precisionCritRatePct',
  'set.perceeArmorPenPct',
  'set.sangsueLifestealPct',
  'set.assautAtkPct',
  'set.colosseHpPct',
  'set.celeriteSpdPct',
] as const

export type SetBonusConfigKey = (typeof SET_BONUS_CONFIG_KEYS)[number]

export interface SetDefinition {
  /** Nombre de pièces à porter SUR LA MÊME CARTE pour activer le bonus. */
  pieces: SetSize
  bonuses: EquipmentBonuses
}

/**
 * La taille est une donnée de conception (elle structure les combinaisons
 * possibles sur 7 emplacements), la magnitude est un réglage d'économie —
 * d'où l'une en dur ici et l'autre dans GlobalConfig.
 */
export function setBonusesFromConfig(
  c: Record<SetBonusConfigKey, number>,
): Record<SetKey, SetDefinition> {
  return {
    // 4 pièces — le plus fort engagement, les bonus les plus marqués.
    FUREUR: {
      pieces: 4,
      bonuses: { critDmgPct: c['set.fureurCritDmgPct'] },
    },
    PRECISION: {
      pieces: 4,
      bonuses: { critRatePct: c['set.precisionCritRatePct'] },
    },
    SANGSUE: {
      pieces: 4,
      bonuses: { lifestealPct: c['set.sangsueLifestealPct'] },
    },
    // 3 pièces — laissent 4 emplacements libres pour un second set.
    PERCEE: {
      pieces: 3,
      bonuses: { armorPenPct: c['set.perceeArmorPenPct'] },
    },
    ASSAUT: {
      pieces: 3,
      bonuses: { atkPct: c['set.assautAtkPct'] },
    },
    // 2 pièces — le complément qu'on case à côté d'un set de 4.
    COLOSSE: {
      pieces: 2,
      bonuses: { hpPct: c['set.colosseHpPct'] },
    },
    CELERITE: {
      pieces: 2,
      bonuses: { spdPct: c['set.celeriteSpdPct'] },
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
    // Un seul seuil par set, et rien au-delà : porter 4 pièces d'un set de 2
    // ne donne pas plus que 2. Les emplacements en trop sont du gaspillage,
    // c'est ce qui rend le choix de composition intéressant.
    if (def && n >= def.pieces) {
      accumulate(total, def.bonuses)
    }
  }
  return total
}
