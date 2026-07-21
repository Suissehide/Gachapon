import { describe, expect, it } from '@jest/globals'

import {
  effectiveEquipmentBonuses,
  isSubstatMilestone,
  MAX_SUBSTATS_BY_RARITY,
  rollMilestone,
  scaleBaseBonuses,
  type Substat,
  type SubstatRanges,
  upgradeGoldCost,
} from '../../main/domain/equipment/equipment-progression'

const RANGES: SubstatRanges = {
  hpFlat: { min: 20, max: 60 },
  hpPct: { min: 3, max: 8 },
  atkFlat: { min: 5, max: 15 },
  atkPct: { min: 3, max: 8 },
  defFlat: { min: 5, max: 15 },
  defPct: { min: 3, max: 8 },
  spdFlat: { min: 3, max: 9 },
  spdPct: { min: 3, max: 8 },
}

// RNG déterministe : rejoue la séquence donnée.
function rngFrom(values: number[]): () => number {
  let i = 0
  return () => values[i++ % values.length] as number
}

describe('equipment-progression: upgradeGoldCost', () => {
  it('coûte base × rarityMult au niveau 1', () => {
    // 25 × 1.35^0 × 1.7 = 42.5 → 43
    expect(upgradeGoldCost(1, 25, 1.35, 1.7)).toBe(43)
  })

  it('croît exponentiellement avec le niveau', () => {
    // 25 × 1.35^10 × 1.7 ≈ 854.5 → 855
    expect(upgradeGoldCost(11, 25, 1.35, 1.7)).toBe(855)
  })
})

describe('equipment-progression: isSubstatMilestone', () => {
  it('vrai aux multiples de 3, faux ailleurs', () => {
    expect(isSubstatMilestone(3)).toBe(true)
    expect(isSubstatMilestone(6)).toBe(true)
    expect(isSubstatMilestone(9)).toBe(true)
    expect(isSubstatMilestone(12)).toBe(true)
    expect(isSubstatMilestone(1)).toBe(false)
    expect(isSubstatMilestone(2)).toBe(false)
    expect(isSubstatMilestone(4)).toBe(false)
  })
})

describe('equipment-progression: MAX_SUBSTATS_BY_RARITY', () => {
  it('suit le barème C0/U1/R2/E3/L4', () => {
    expect(MAX_SUBSTATS_BY_RARITY).toEqual({
      COMMON: 0,
      UNCOMMON: 1,
      RARE: 2,
      EPIC: 3,
      LEGENDARY: 4,
    })
  })
})

describe('equipment-progression: scaleBaseBonuses', () => {
  it('ne change rien au niveau 1', () => {
    expect(scaleBaseBonuses({ atkFlat: 10, hpPct: 4 }, 1)).toEqual({
      atkFlat: 10,
      hpPct: 4,
    })
  })

  it('applique 1 + 0.1 × (niveau − 1)', () => {
    const scaled = scaleBaseBonuses({ atkFlat: 10, hpPct: 4 }, 12)
    expect(scaled.atkFlat).toBeCloseTo(21) // ×2.1
    expect(scaled.hpPct).toBeCloseTo(8.4)
  })
})

describe('equipment-progression: rollMilestone', () => {
  it("ajoute une sous-stat quand il reste des emplacements pour la rareté", () => {
    // rng: 0 → première clé du pool (hpFlat), 0.5 → milieu de range 20–60 = 40
    const result = rollMilestone([], 4, 'atkFlat', 0, RANGES, rngFrom([0, 0.5]))
    expect(result.substats).toEqual([{ key: 'hpFlat', value: 40 }])
    expect(result.baseBoost).toBe(0)
    expect(result.milestone).toEqual({
      type: 'added',
      key: 'hpFlat',
      rolledValue: 40,
      newValue: 40,
    })
  })

  it("n'ajoute jamais une clé déjà présente", () => {
    const existing: Substat[] = [
      { key: 'hpFlat', value: 30 },
      { key: 'hpPct', value: 5 },
      { key: 'atkFlat', value: 10 },
    ]
    // rng 0 → première clé DISPONIBLE (atkPct, car hpFlat/hpPct/atkFlat pris)
    const result = rollMilestone(
      existing,
      4,
      'atkFlat',
      0,
      RANGES,
      rngFrom([0, 0]),
    )
    expect(result.milestone.type).toBe('added')
    expect(result.milestone.key).toBe('atkPct')
    expect(result.substats).toHaveLength(4)
  })

  it('améliore une existante quand les emplacements de la rareté sont pleins', () => {
    // EPIC : max 3 — plein avec 3 sous-stats.
    const full: Substat[] = [
      { key: 'hpFlat', value: 30 },
      { key: 'atkPct', value: 5 },
      { key: 'defFlat', value: 8 },
    ]
    // rng 0.5 → index floor(0.5×3)=1 (atkPct), rng 0 → min de range 3–8 = 3
    const result = rollMilestone(full, 3, 'atkFlat', 0, RANGES, rngFrom([0.5, 0]))
    expect(result.milestone).toEqual({
      type: 'improved',
      key: 'atkPct',
      rolledValue: 3,
      newValue: 8,
    })
    expect(result.substats[1]).toEqual({ key: 'atkPct', value: 8 })
    expect(result.substats).toHaveLength(3)
    expect(result.baseBoost).toBe(0)
  })

  it('arrondit les tirages à 1 décimale', () => {
    const result = rollMilestone([], 4, 'atkFlat', 0, RANGES, rngFrom([0, 1 / 3]))
    // 20 + (1/3)×40 = 33.333… → 33.3
    expect(result.milestone.rolledValue).toBe(33.3)
  })

  it("renforce le bonus de base quand la rareté n'a aucun emplacement", () => {
    // COMMON : max 0. rng 0.5 → milieu de range atkFlat 5–15 = 10
    const result = rollMilestone([], 0, 'atkFlat', 0, RANGES, rngFrom([0.5]))
    expect(result.substats).toEqual([])
    expect(result.baseBoost).toBe(10)
    expect(result.milestone).toEqual({
      type: 'base',
      key: 'atkFlat',
      rolledValue: 10,
      newValue: 10,
    })
  })

  it('cumule le baseBoost sur plusieurs paliers', () => {
    // rng 0 → min de range atkFlat = 5, cumulé sur un boost existant de 10
    const result = rollMilestone([], 0, 'atkFlat', 10, RANGES, rngFrom([0]))
    expect(result.baseBoost).toBe(15)
    expect(result.milestone).toEqual({
      type: 'base',
      key: 'atkFlat',
      rolledValue: 5,
      newValue: 15,
    })
  })
})

describe('equipment-progression: effectiveEquipmentBonuses', () => {
  it('somme base scalée et sous-stats par clé', () => {
    const result = effectiveEquipmentBonuses({ atkFlat: 10 }, 4, [
      { key: 'atkFlat', value: 5 },
      { key: 'hpPct', value: 4.5 },
    ])
    expect(result.atkFlat).toBeCloseTo(18) // 10 × 1.3 + 5
    expect(result.hpPct).toBeCloseTo(4.5)
  })

  it('applique le baseBoost à la première clé du bonus de base', () => {
    const result = effectiveEquipmentBonuses(
      { atkFlat: 10 },
      4,
      [{ key: 'hpPct', value: 4.5 }],
      7,
    )
    expect(result.atkFlat).toBeCloseTo(20) // 10 × 1.3 + 7
    expect(result.hpPct).toBeCloseTo(4.5)
  })

  it('ne booste que la première clé pour un objet legacy multi-bonus', () => {
    const result = effectiveEquipmentBonuses(
      { atkFlat: 10, spdFlat: 4 },
      1,
      [],
      5,
    )
    expect(result.atkFlat).toBeCloseTo(15)
    expect(result.spdFlat).toBeCloseTo(4)
  })
})
