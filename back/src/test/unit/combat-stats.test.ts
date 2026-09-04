import { describe, expect, it } from '@jest/globals'

import { computeFinalStats, mitigationRefFor } from '../../main/domain/combat/combat-stats.domain'
import { computeSetBonuses, setBonusesFromConfig } from '../../main/domain/equipment/set-bonuses'

const BASE = {
  baseHp: 200,
  baseAtk: 20,
  baseDef: 10,
  baseSpd: 100,
}

const BASES_COMBAT = { critRate: 5, critDmg: 150, armorPen: 0, lifesteal: 0 }

describe('combat-stats: computeFinalStats', () => {
  it('returns base stats at level 1, palier 1, NORMAL, no equipment', () => {
    const stats = computeFinalStats({
      ...BASE,
      level: 1,
      palier: 1,
      variant: 'NORMAL',
      baseStats: BASES_COMBAT,
    })
    expect(stats).toEqual({
      hp: 200,
      atk: 20,
      def: 10,
      spd: 100,
      critRate: 5,
      critDmg: 150,
      armorPen: 0,
      lifesteal: 0,
    })
  })

  it('applies +9% per level beyond level 1', () => {
    // level 10 = +81 % de croissance (0,09 × 9)
    const stats = computeFinalStats({
      ...BASE,
      level: 10,
      palier: 1,
      variant: 'NORMAL',
      baseStats: BASES_COMBAT,
    })
    // hp 200 × 1.81 = 362
    expect(stats.hp).toBe(362)
    expect(stats.atk).toBe(36) // round(20 × 1.81) = round(36.2)
  })

  it('applies variant multiplier (BRILLIANT ×1.15)', () => {
    const stats = computeFinalStats({
      ...BASE,
      level: 1,
      palier: 1,
      variant: 'BRILLIANT',
      baseStats: BASES_COMBAT,
    })
    expect(stats.hp).toBe(230) // 200 × 1.15
  })

  it('applies HOLOGRAPHIC ×1.30', () => {
    const stats = computeFinalStats({
      ...BASE,
      level: 1,
      palier: 1,
      variant: 'HOLOGRAPHIC',
      baseStats: BASES_COMBAT,
    })
    expect(stats.hp).toBe(260) // 200 × 1.30
  })

  it('compounds palier ascension bonus (+15% per palier)', () => {
    // palier 2 = ×1.15, palier 6 = ×1.15^5 = ×2.011...
    const palier2 = computeFinalStats({
      ...BASE,
      level: 1,
      palier: 2,
      variant: 'NORMAL',
      baseStats: BASES_COMBAT,
    })
    expect(palier2.hp).toBe(230) // 200 × 1.15

    const palier6 = computeFinalStats({
      ...BASE,
      level: 1,
      palier: 6,
      variant: 'NORMAL',
      baseStats: BASES_COMBAT,
    })
    // 200 × 1.15^5 ≈ 402.27
    expect(palier6.hp).toBe(402)
  })

  it('combines level + variant + palier multiplicatively', () => {
    // level 10 (+81 %), HOLOGRAPHIC (×1.30), palier 2 (×1.15)
    // 200 × 1.81 × 1.30 × 1.15 = 541.19 → 541
    const stats = computeFinalStats({
      ...BASE,
      level: 10,
      palier: 2,
      variant: 'HOLOGRAPHIC',
      baseStats: BASES_COMBAT,
    })
    expect(stats.hp).toBe(541)
  })

  it('adds equipment flat bonuses', () => {
    const stats = computeFinalStats({
      ...BASE,
      level: 1,
      palier: 1,
      variant: 'NORMAL',
      baseStats: BASES_COMBAT,
      equipment: [
        { atkFlat: 5 },
        { atkFlat: 8, hpFlat: 10 },
      ],
    })
    expect(stats.atk).toBe(33) // 20 + 5 + 8
    expect(stats.hp).toBe(210) // 200 + 10
  })

  it('applies equipment percent bonuses on top of flat', () => {
    const stats = computeFinalStats({
      ...BASE,
      level: 1,
      palier: 1,
      variant: 'NORMAL',
      baseStats: BASES_COMBAT,
      equipment: [
        { atkFlat: 10, atkPct: 10 },
      ],
    })
    // (20 + 10) × 1.10 = 33
    expect(stats.atk).toBe(33)
  })

  it('sums multiple equipment percent bonuses additively', () => {
    const stats = computeFinalStats({
      ...BASE,
      level: 1,
      palier: 1,
      variant: 'NORMAL',
      baseStats: BASES_COMBAT,
      equipment: [
        { hpPct: 5 },
        { hpPct: 10 },
      ],
    })
    // 200 × (1 + 15/100) = 230
    expect(stats.hp).toBe(230)
  })

  it('handles missing skillModifiers (defaults to {})', () => {
    const stats = computeFinalStats({
      ...BASE,
      level: 1,
      palier: 1,
      variant: 'NORMAL',
      baseStats: BASES_COMBAT,
    })
    expect(stats.hp).toBe(200)
  })

  it('applies skillModifiers percent on top of equipment', () => {
    const stats = computeFinalStats({
      ...BASE,
      level: 1,
      palier: 1,
      variant: 'NORMAL',
      baseStats: BASES_COMBAT,
      equipment: [{ atkFlat: 10 }],
      skillModifiers: { atkPct: 20 },
    })
    // (20 + 10) × (1 + 20/100) = 36
    expect(stats.atk).toBe(36)
  })

  it('treats missing equipment as empty list', () => {
    const stats = computeFinalStats({
      ...BASE,
      level: 1,
      palier: 1,
      variant: 'NORMAL',
      baseStats: BASES_COMBAT,
    })
    expect(stats.atk).toBe(20)
  })

  it('rounds final values to integers', () => {
    const stats = computeFinalStats({
      ...BASE,
      level: 2, // +9 % → 21.8
      palier: 1,
      variant: 'NORMAL',
      baseStats: BASES_COMBAT,
    })
    expect(stats.atk).toBe(22)
    expect(Number.isInteger(stats.atk)).toBe(true)
    expect(Number.isInteger(stats.hp)).toBe(true)
    expect(Number.isInteger(stats.def)).toBe(true)
    expect(Number.isInteger(stats.spd)).toBe(true)
  })
})

describe('combat-stats: nouvelles stats', () => {
  it('retourne les valeurs de base sans équipement', () => {
    const s = computeFinalStats({
      ...BASE, level: 1, palier: 1, variant: 'NORMAL', baseStats: BASES_COMBAT,
    })
    expect(s.critRate).toBe(5)
    expect(s.critDmg).toBe(150)
    expect(s.armorPen).toBe(0)
    expect(s.lifesteal).toBe(0)
  })

  it('ne les multiplie NI par le niveau NI par le palier NI par la variante', () => {
    const s = computeFinalStats({
      ...BASE, level: 70, palier: 7, variant: 'HOLOGRAPHIC', baseStats: BASES_COMBAT,
    })
    expect(s.critRate).toBe(5)
    expect(s.critDmg).toBe(150)
  })

  it('additionne les bonus d équipement en points de pourcentage', () => {
    const s = computeFinalStats({
      ...BASE, level: 1, palier: 1, variant: 'NORMAL', baseStats: BASES_COMBAT,
      equipment: [{ critRatePct: 12 }, { critRatePct: 8, critDmgPct: 25 }],
    })
    expect(s.critRate).toBe(25) // 5 + 12 + 8
    expect(s.critDmg).toBe(175) // 150 + 25
  })

  it('cape critRate à 100', () => {
    const s = computeFinalStats({
      ...BASE, level: 1, palier: 1, variant: 'NORMAL', baseStats: BASES_COMBAT,
      equipment: [{ critRatePct: 200 }],
    })
    expect(s.critRate).toBe(100)
  })

  it('ne cape ni critDmg ni armorPen ni lifesteal', () => {
    const s = computeFinalStats({
      ...BASE, level: 1, palier: 1, variant: 'NORMAL', baseStats: BASES_COMBAT,
      equipment: [{ critDmgPct: 500, armorPenPct: 150, lifestealPct: 120 }],
    })
    expect(s.critDmg).toBe(650)
    expect(s.armorPen).toBe(150)
    expect(s.lifesteal).toBe(120)
  })
})

describe('combat-stats: mitigationRefFor', () => {
  it('vaut la référence brute au niveau 1, palier 1, NORMAL', () => {
    expect(
      mitigationRefFor({ level: 1, palier: 1, variant: 'NORMAL', defMitigationRef: 100 }),
    ).toBe(100)
  })

  it('suit exactement le facteur d échelle appliqué à la DEF de base', () => {
    // Le contrat : DEF finale / DEF de base === mitigationRef / defMitigationRef.
    // C est ce qui rend la réduction de dégâts invariante en progression.
    const base = { baseHp: 200, baseAtk: 20, baseDef: 10, baseSpd: 100 }
    for (const [level, palier, variant] of [
      [70, 7, 'NORMAL'],
      [35, 4, 'BRILLIANT'],
      [12, 2, 'HOLOGRAPHIC'],
    ] as const) {
      const stats = computeFinalStats({
        ...base, level, palier, variant, baseStats: BASES_COMBAT,
      })
      const ref = mitigationRefFor({ level, palier, variant, defMitigationRef: 100 })
      // arrondi de computeFinalStats -> tolérance
      expect(ref / 100).toBeCloseTo(stats.def / base.baseDef, 1)
    }
  })

  it('la réduction de dégâts d une même carte ne dépend plus du niveau', () => {
    const baseDef = 14
    const reduction = (level: number, palier: number) => {
      const stats = computeFinalStats({
        baseHp: 200, baseAtk: 20, baseDef, baseSpd: 100, level, palier, variant: 'NORMAL',
        baseStats: BASES_COMBAT,
      })
      const ref = mitigationRefFor({ level, palier, variant: 'NORMAL', defMitigationRef: 100 })
      return 1 - ref / (ref + stats.def)
    }
    expect(reduction(70, 7)).toBeCloseTo(reduction(1, 1), 2)
  })
})

describe('bonus de set appliqués aux stats finales', () => {
  const defs = setBonusesFromConfig({
    'set.fureurCritDmgPct': 35,
    'set.precisionCritRatePct': 25,
    'set.sangsueLifestealPct': 16,
    'set.perceeArmorPenPct': 20,
    'set.assautAtkPct': 16,
    'set.colosseHpPct': 12,
    'set.celeriteSpdPct': 8,
  })

  it('un set complet de 4 (Fureur) augmente le critDmg de la carte', () => {
    const setBonus = computeSetBonuses(Array(4).fill('FUREUR'), defs)
    const sans = computeFinalStats({
      ...BASE, level: 1, palier: 1, variant: 'NORMAL', baseStats: BASES_COMBAT,
    })
    const avec = computeFinalStats({
      ...BASE, level: 1, palier: 1, variant: 'NORMAL', baseStats: BASES_COMBAT,
      equipment: [setBonus],
    })
    expect(avec.critDmg).toBe(sans.critDmg + 35)
  })

  it('un set complet de 3 (Assaut) augmente l ATQ de la carte', () => {
    const setBonus = computeSetBonuses(Array(3).fill('ASSAUT'), defs)
    const avec = computeFinalStats({
      ...BASE, level: 1, palier: 1, variant: 'NORMAL', baseStats: BASES_COMBAT,
      equipment: [setBonus],
    })
    expect(avec.atk).toBe(23) // 20 × (1 + 16/100) = 23.2
  })

  it('un set incomplet ne donne rien du tout', () => {
    // Fureur exige 4 pièces : 3 ne déclenchent aucun palier intermédiaire.
    const setBonus = computeSetBonuses(Array(3).fill('FUREUR'), defs)
    const avec = computeFinalStats({
      ...BASE, level: 1, palier: 1, variant: 'NORMAL', baseStats: BASES_COMBAT,
      equipment: [setBonus],
    })
    expect(avec.atk).toBe(20)
    expect(avec.critDmg).toBe(BASES_COMBAT.critDmg)
  })

  it('deux cartes portant chacune 2 pièces d un set de 4 n activent rien', () => {
    // Comptage par carte : deux fois 2 pièces ne font pas un 4-set.
    const bonusCarteA = computeSetBonuses(['FUREUR', 'FUREUR'], defs)
    const bonusCarteB = computeSetBonuses(['FUREUR', 'FUREUR'], defs)
    for (const bonus of [bonusCarteA, bonusCarteB]) {
      const stats = computeFinalStats({
        ...BASE, level: 1, palier: 1, variant: 'NORMAL', baseStats: BASES_COMBAT,
        equipment: [bonus],
      })
      expect(stats.critDmg).toBe(BASES_COMBAT.critDmg)
    }
  })
})
