import { describe, expect, it } from '@jest/globals'

import {
  SET_BONUS_CONFIG_KEYS,
  computeSetBonuses,
  setBonusesFromConfig,
} from '../../main/domain/equipment/set-bonuses'

const CONF = {
  'set.fureur2AtkPct': 10,
  'set.fureur4CritDmgPct': 25,
  'set.precision2SpdPct': 8,
  'set.precision4CritRatePct': 20,
  'set.percee2DefPct': 10,
  'set.percee4ArmorPenPct': 25,
  'set.sangsue2HpPct': 12,
  'set.sangsue4LifestealPct': 12,
}
const DEFS = setBonusesFromConfig(CONF)

describe('bonus de set', () => {
  it('déclare exactement 8 clés de configuration', () => {
    expect(SET_BONUS_CONFIG_KEYS).toHaveLength(8)
    for (const k of SET_BONUS_CONFIG_KEYS) {
      // toHaveProperty interprète une clé pointée comme un chemin imbriqué ;
      // nos clés de config sont des chaînes plates avec des points littéraux,
      // donc il faut l'array form pour cibler la clé telle quelle.
      expect(CONF).toHaveProperty([k])
    }
  })

  it('ne donne rien en dessous de 2 pièces', () => {
    expect(computeSetBonuses(['FUREUR'], DEFS)).toEqual({})
  })

  it('donne le palier 2 à partir de 2 pièces', () => {
    expect(computeSetBonuses(['FUREUR', 'FUREUR'], DEFS)).toEqual({ atkPct: 10 })
  })

  it('donne encore le palier 2 seulement à 3 pièces', () => {
    expect(computeSetBonuses(['FUREUR', 'FUREUR', 'FUREUR'], DEFS)).toEqual({
      atkPct: 10,
    })
  })

  it('cumule les paliers 2 et 4 à partir de 4 pièces', () => {
    expect(
      computeSetBonuses(['FUREUR', 'FUREUR', 'FUREUR', 'FUREUR'], DEFS),
    ).toEqual({ atkPct: 10, critDmgPct: 25 })
  })

  it('ne donne rien de plus au-delà de 4 pièces', () => {
    const quatre = computeSetBonuses(Array(4).fill('FUREUR'), DEFS)
    const sept = computeSetBonuses(Array(7).fill('FUREUR'), DEFS)
    expect(sept).toEqual(quatre)
  })

  it('combine un 4-set et un 2-set — le cas nominal sur 7 slots', () => {
    const bonus = computeSetBonuses(
      ['FUREUR', 'FUREUR', 'FUREUR', 'FUREUR', 'PRECISION', 'PRECISION', 'PERCEE'],
      DEFS,
    )
    expect(bonus).toEqual({ atkPct: 10, critDmgPct: 25, spdPct: 8 })
  })

  it('additionne trois 2-sets', () => {
    const bonus = computeSetBonuses(
      ['FUREUR', 'FUREUR', 'PRECISION', 'PRECISION', 'PERCEE', 'PERCEE', 'SANGSUE'],
      DEFS,
    )
    expect(bonus).toEqual({ atkPct: 10, spdPct: 8, defPct: 10 })
  })

  it('ignore les clés inconnues sans lever', () => {
    expect(computeSetBonuses(['INCONNU', 'INCONNU'], DEFS)).toEqual({})
  })
})
