import { describe, expect, it } from '@jest/globals'

import {
  effectiveEquipmentBonuses,
  isSubstatMilestone,
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
  it('ajoute une sous-stat quand il reste des emplacements', () => {
    // rng: 0 → première clé du pool (hpFlat), 0.5 → milieu de range 20–60 = 40
    const { substats, milestone } = rollMilestone([], RANGES, rngFrom([0, 0.5]))
    expect(substats).toEqual([{ key: 'hpFlat', value: 40 }])
    expect(milestone).toEqual({
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
    const { substats, milestone } = rollMilestone(
      existing,
      RANGES,
      rngFrom([0, 0]),
    )
    expect(milestone.type).toBe('added')
    expect(milestone.key).toBe('atkPct')
    expect(substats).toHaveLength(4)
  })

  it('améliore une sous-stat existante quand les 4 sont remplies', () => {
    const full: Substat[] = [
      { key: 'hpFlat', value: 30 },
      { key: 'atkPct', value: 5 },
      { key: 'defFlat', value: 8 },
      { key: 'spdFlat', value: 4 },
    ]
    // rng 0.5 → index floor(0.5×4)=2 (defFlat), rng 0 → min de range 5–15 = 5
    const { substats, milestone } = rollMilestone(full, RANGES, rngFrom([0.5, 0]))
    expect(milestone).toEqual({
      type: 'improved',
      key: 'defFlat',
      rolledValue: 5,
      newValue: 13,
    })
    expect(substats[2]).toEqual({ key: 'defFlat', value: 13 })
    expect(substats).toHaveLength(4)
  })

  it('arrondit les tirages à 1 décimale', () => {
    const { milestone } = rollMilestone([], RANGES, rngFrom([0, 1 / 3]))
    // 20 + (1/3)×40 = 33.333… → 33.3
    expect(milestone.rolledValue).toBe(33.3)
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
})
