import { describe, expect, it } from '@jest/globals'

import {
  effectiveEquipmentBonuses,
  EQUIP_MAX_SUBSTATS,
  INITIAL_SUBSTATS_BY_RARITY,
  isSubstatMilestone,
  rollInitialSubstats,
  rollMilestone,
  scaleBaseBonuses,
  SUBSTAT_KEYS,
  SUBSTAT_RANGE_CONFIG_KEYS,
  substatRangesFromConfig,
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
  critRatePct: { min: 2, max: 5 },
  critDmgPct: { min: 4, max: 10 },
  armorPenPct: { min: 2, max: 6 },
  lifestealPct: { min: 1, max: 4 },
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

describe('equipment-progression: INITIAL_SUBSTATS_BY_RARITY', () => {
  it('suit le barème initial C0/U1/R2/E3/L4', () => {
    expect(INITIAL_SUBSTATS_BY_RARITY).toEqual({
      COMMON: 0,
      UNCOMMON: 1,
      RARE: 2,
      EPIC: 3,
      LEGENDARY: 4,
    })
  })

  it('le cap universel est de 4 sous-stats', () => {
    expect(EQUIP_MAX_SUBSTATS).toBe(4)
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
    expect(scaled.atkFlat).toBe(21) // ×2.1
    expect(scaled.hpPct).toBe(8) // 4 × 2.1 = 8.4, arrondi
  })

  it('arrondit chaque bonus scalé à l entier', () => {
    const scaled = scaleBaseBonuses({ hpPct: 12 }, 7)
    // 12 × 1.6 = 19.2 : c'est le « 19,2 % » qu'on ne veut plus voir.
    expect(scaled.hpPct).toBe(19)
    for (const v of Object.values(scaleBaseBonuses({ hpPct: 4.5 }, 5))) {
      expect(Number.isInteger(v)).toBe(true)
    }
  })
})

describe('equipment-progression: rollMilestone', () => {
  it('ajoute une sous-stat sous le cap de 4 (même pour une commune vide)', () => {
    // rng: 0 → première clé du pool (hpFlat), 0.5 → milieu de range 20–60 = 40
    const result = rollMilestone([], RANGES, rngFrom([0, 0.5]))
    expect(result.substats).toEqual([{ key: 'hpFlat', value: 40 }])
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
    const result = rollMilestone(existing, RANGES, rngFrom([0, 0]))
    expect(result.milestone.type).toBe('added')
    expect(result.milestone.key).toBe('atkPct')
    expect(result.substats).toHaveLength(4)
  })

  it('améliore une existante quand les 4 emplacements sont pleins', () => {
    const full: Substat[] = [
      { key: 'hpFlat', value: 30 },
      { key: 'atkPct', value: 5 },
      { key: 'defFlat', value: 8 },
      { key: 'spdFlat', value: 4 },
    ]
    // rng 0.25 → index floor(0.25×4)=1 (atkPct), rng 0 → min de range 3–8 = 3
    const result = rollMilestone(full, RANGES, rngFrom([0.25, 0]))
    expect(result.milestone).toEqual({
      type: 'improved',
      key: 'atkPct',
      rolledValue: 3,
      newValue: 8,
    })
    expect(result.substats[1]).toEqual({ key: 'atkPct', value: 8 })
    expect(result.substats).toHaveLength(4)
  })

  it('arrondit les tirages à l entier', () => {
    const result = rollMilestone([], RANGES, rngFrom([0, 1 / 3]))
    // 20 + (1/3)×40 = 33.333… → 33
    expect(result.milestone.rolledValue).toBe(33)
  })

  it('garde une valeur entière en améliorant une sous-stat décimale héritée', () => {
    const legacy: Substat[] = [
      { key: 'hpFlat', value: 30 },
      { key: 'atkPct', value: 5.3 },
      { key: 'defFlat', value: 8 },
      { key: 'spdFlat', value: 4 },
    ]
    const result = rollMilestone(legacy, RANGES, rngFrom([0.25, 0]))
    expect(result.milestone.newValue).toBe(8) // 5.3 + 3 = 8.3 → 8
  })
})

describe('equipment-progression: effectiveEquipmentBonuses', () => {
  it('somme base scalée et sous-stats par clé', () => {
    const result = effectiveEquipmentBonuses({ atkFlat: 10 }, 4, [
      { key: 'atkFlat', value: 5 },
      { key: 'hpPct', value: 4 },
    ])
    expect(result.atkFlat).toBe(18) // round(10 × 1.3) + 5
    expect(result.hpPct).toBe(4)
  })

  it('applique le baseBoost à la première clé du bonus de base', () => {
    const result = effectiveEquipmentBonuses(
      { atkFlat: 10 },
      4,
      [{ key: 'hpPct', value: 4 }],
      7,
    )
    expect(result.atkFlat).toBe(20) // round(10 × 1.3) + 7
    expect(result.hpPct).toBe(4)
  })

  it('arrondit le bonus de base même avec un baseBoost décimal hérité', () => {
    const result = effectiveEquipmentBonuses({ atkFlat: 10 }, 4, [], 7.4)
    expect(result.atkFlat).toBe(20) // round(13) + 7.4 = 20.4 → 20
  })

  it('ne booste que la première clé pour un objet legacy multi-bonus', () => {
    const result = effectiveEquipmentBonuses(
      { atkFlat: 10, spdFlat: 4 },
      1,
      [],
      5,
    )
    expect(result.atkFlat).toBe(15)
    expect(result.spdFlat).toBe(4)
  })
})

describe('equipment-progression: substatRangesFromConfig', () => {
  it('construit les ranges depuis les 18 valeurs de config', () => {
    const ranges = substatRangesFromConfig({
      'equip.substatHpFlatMin': 20,
      'equip.substatHpFlatMax': 60,
      'equip.substatAtkFlatMin': 5,
      'equip.substatAtkFlatMax': 15,
      'equip.substatDefFlatMin': 5,
      'equip.substatDefFlatMax': 15,
      'equip.substatSpdFlatMin': 3,
      'equip.substatSpdFlatMax': 9,
      'equip.substatPctMin': 3,
      'equip.substatPctMax': 8,
      'equip.substatCritRatePctMin': 2,
      'equip.substatCritRatePctMax': 5,
      'equip.substatCritDmgPctMin': 4,
      'equip.substatCritDmgPctMax': 10,
      'equip.substatArmorPenPctMin': 2,
      'equip.substatArmorPenPctMax': 6,
      'equip.substatLifestealPctMin': 1,
      'equip.substatLifestealPctMax': 4,
    })
    expect(ranges).toEqual(RANGES)
  })
})

describe('equipment-progression: rollInitialSubstats', () => {
  it('retourne un tableau vide pour 0 emplacement (commune)', () => {
    expect(rollInitialSubstats(0, RANGES, rngFrom([0.5]))).toEqual([])
  })

  it('tire le bon nombre de sous-stats à clés distinctes', () => {
    const substats = rollInitialSubstats(4, RANGES, rngFrom([0, 0.5]))
    expect(substats).toHaveLength(4)
    expect(new Set(substats.map((s) => s.key)).size).toBe(4)
  })

  it('est déterministe au RNG injecté', () => {
    // Séquence [0, 0.5] : clé = première disponible, valeur = milieu de range.
    const substats = rollInitialSubstats(2, RANGES, rngFrom([0, 0.5]))
    expect(substats).toEqual([
      { key: 'hpFlat', value: 40 }, // 20 + 0.5 × 40
      { key: 'hpPct', value: 6 }, // hpFlat pris → hpPct ; 3 + 0.5 × 5 = 5.5 → 6
    ])
  })

  it('tire chaque valeur dans la range de sa clé', () => {
    const substats = rollInitialSubstats(8, RANGES, rngFrom([0.99, 0.01, 0.37]))
    expect(substats).toHaveLength(8)
    for (const s of substats) {
      expect(Number.isInteger(s.value)).toBe(true)
      expect(s.value).toBeGreaterThanOrEqual(RANGES[s.key].min)
      expect(s.value).toBeLessThanOrEqual(RANGES[s.key].max)
    }
  })

  it('plafonne au nombre de clés du pool', () => {
    expect(rollInitialSubstats(20, RANGES, rngFrom([0.2, 0.6]))).toHaveLength(
      11,
    )
  })
})

describe('substats étendues', () => {
  it('expose 11 clés', () => {
    expect(SUBSTAT_KEYS).toHaveLength(11)
    for (const k of ['critRatePct', 'critDmgPct', 'armorPenPct', 'lifestealPct']) {
      expect(SUBSTAT_KEYS).toContain(k)
    }
  })

  // La vitesse n'existe qu'en valeur plate : sous ATB elle multiplie le
  // rendement de l'unité au lieu de s'y ajouter, donc un pourcentage y serait
  // hors-échelle face aux autres sous-stats. Elle reste disponible en
  // pourcentage via le set Célérité, dont la magnitude est fixe.
  it('ne propose pas de vitesse en pourcentage', () => {
    expect(SUBSTAT_KEYS).not.toContain('spdPct')
    expect(SUBSTAT_KEYS).toContain('spdFlat')
  })

  it('aucune nouvelle stat n a de version plate', () => {
    for (const k of SUBSTAT_KEYS) {
      if (/^(critRate|critDmg|armorPen|lifesteal)/.test(k)) {
        expect(k.endsWith('Pct')).toBe(true)
      }
    }
  })

  it('construit une plage pour chacune des 11 clés', () => {
    const conf = Object.fromEntries(
      SUBSTAT_RANGE_CONFIG_KEYS.map((k) => [k, k.endsWith('Max') ? 10 : 1]),
    ) as Parameters<typeof substatRangesFromConfig>[0]
    const plages = substatRangesFromConfig(conf)
    for (const k of SUBSTAT_KEYS) {
      expect(plages[k]).toBeDefined()
      expect(plages[k].min).toBeLessThanOrEqual(plages[k].max)
    }
  })
})
