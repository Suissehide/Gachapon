import { describe, expect, it } from '@jest/globals'

import {
  SET_BONUS_CONFIG_KEYS,
  computeSetBonuses,
  setBonusesFromConfig,
} from '../../main/domain/equipment/set-bonuses'

const CONF = {
  'set.fureurCritDmgPct': 35,
  'set.precisionCritRatePct': 25,
  'set.sangsueLifestealPct': 16,
  'set.perceeArmorPenPct': 20,
  'set.assautAtkPct': 16,
  'set.colosseHpPct': 12,
  'set.celeriteSpdPct': 8,
}
const DEFS = setBonusesFromConfig(CONF)

// n pièces d'un même set — rend les compositions lisibles dans les cas.
const q = (key: string, n: number) => Array(n).fill(key) as string[]

describe('bonus de set', () => {
  it('déclare exactement 7 clés de configuration, une par set', () => {
    expect(SET_BONUS_CONFIG_KEYS).toHaveLength(7)
    for (const k of SET_BONUS_CONFIG_KEYS) {
      // toHaveProperty interprète une clé pointée comme un chemin imbriqué ;
      // nos clés de config sont des chaînes plates avec des points littéraux,
      // donc il faut l'array form pour cibler la clé telle quelle.
      expect(CONF).toHaveProperty([k])
    }
  })

  it('couvre les trois tailles de set', () => {
    const tailles = new Set(Object.values(DEFS).map((d) => d.pieces))
    expect([...tailles].sort()).toEqual([2, 3, 4])
  })

  it('ne donne rien en dessous du seuil du set', () => {
    // Fureur exige 4 pièces : 1, 2 et 3 ne donnent rien.
    for (const n of [1, 2, 3]) {
      expect(computeSetBonuses(q('FUREUR', n), DEFS)).toEqual({})
    }
  })

  it('donne le bonus pile au seuil, pour chacune des trois tailles', () => {
    expect(computeSetBonuses(q('CELERITE', 2), DEFS)).toEqual({ spdPct: 8 })
    expect(computeSetBonuses(q('ASSAUT', 3), DEFS)).toEqual({ atkPct: 16 })
    expect(computeSetBonuses(q('FUREUR', 4), DEFS)).toEqual({ critDmgPct: 35 })
  })

  // Le point que le joueur comprenait mal : il n'y a plus de palier
  // intermédiaire qui s'additionnerait au palier supérieur.
  it('ne donne rien de plus au-delà du seuil', () => {
    const seuil = computeSetBonuses(q('CELERITE', 2), DEFS)
    expect(computeSetBonuses(q('CELERITE', 4), DEFS)).toEqual(seuil)
    expect(computeSetBonuses(q('CELERITE', 7), DEFS)).toEqual(seuil)
    expect(computeSetBonuses(q('FUREUR', 7), DEFS)).toEqual({ critDmgPct: 35 })
  })

  it('combine un 4-set et un 3-set — les 7 emplacements exactement remplis', () => {
    expect(
      computeSetBonuses([...q('FUREUR', 4), ...q('ASSAUT', 3)], DEFS),
    ).toEqual({ critDmgPct: 35, atkPct: 16 })
  })

  it('combine un 4-set et un 2-set, la 7e pièce étant perdue', () => {
    expect(
      computeSetBonuses(
        [...q('PRECISION', 4), ...q('COLOSSE', 2), 'PERCEE'],
        DEFS,
      ),
    ).toEqual({ critRatePct: 25, hpPct: 12 })
  })

  it('combine un 3-set et deux 2-sets', () => {
    expect(
      computeSetBonuses(
        [...q('PERCEE', 3), ...q('COLOSSE', 2), ...q('CELERITE', 2)],
        DEFS,
      ),
    ).toEqual({ armorPenPct: 20, hpPct: 12, spdPct: 8 })
  })

  it('ignore les clés inconnues sans lever', () => {
    expect(computeSetBonuses(q('INCONNU', 4), DEFS)).toEqual({})
  })
})
