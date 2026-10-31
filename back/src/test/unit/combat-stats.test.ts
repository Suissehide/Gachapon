import { describe, expect, it } from '@jest/globals'

import { computeFinalStats, damageReduction, stackArmorPen } from '../../main/domain/combat/combat-stats.domain'
import { buildEquipmentCatalog } from '../../main/domain/content/equipment.definitions'
import {
  EQUIP_MAX_LEVEL,
  effectiveEquipmentBonuses,
} from '../../main/domain/equipment/equipment-progression'
import { computeSetBonuses, setBonusesFromConfig } from '../../main/domain/equipment/set-bonuses'
import { PROFILS } from '../helpers/passive-power'

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

  it('ne cape ni critDmg ni lifesteal', () => {
    const s = computeFinalStats({
      ...BASE, level: 1, palier: 1, variant: 'NORMAL', baseStats: BASES_COMBAT,
      equipment: [{ critDmgPct: 500, lifestealPct: 120 }],
    })
    expect(s.critDmg).toBe(650)
    expect(s.lifesteal).toBe(120)
  })

  it('cumule armorPen par source, sur la DEF restante', () => {
    const s = computeFinalStats({
      ...BASE, level: 1, palier: 1, variant: 'NORMAL', baseStats: BASES_COMBAT,
      equipment: [{ armorPenPct: 60 }, { armorPenPct: 60 }],
    })
    expect(s.armorPen).toBeCloseTo(stackArmorPen([BASES_COMBAT.armorPen, 60, 60]))
    expect(s.armorPen).toBeLessThan(100)
  })
})

describe('combat-stats: damageReduction', () => {
  it('vaut DEF / (K + DEF)', () => {
    expect(damageReduction(1000, 1000)).toBeCloseTo(0.5)
    expect(damageReduction(0, 1000)).toBe(0)
    expect(damageReduction(-50, 1000)).toBe(0)
  })

  it('est strictement croissante en DEF', () => {
    for (let d = 0; d < 5000; d += 50) {
      expect(damageReduction(d + 1, 1000)).toBeGreaterThan(damageReduction(d, 1000))
    }
  })
})

describe('bonus de set appliqués aux stats finales', () => {
  const defs = setBonusesFromConfig({
    'set.fureurCritDmgPct': 35,
    'set.affutCritRatePct': 25,
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

describe('défense : repères de fin de jeu', () => {
  const DEFENSE_K = 1000
  const defTank = (variant: 'NORMAL' | 'HOLOGRAPHIC', equipment = [{}]) =>
    computeFinalStats({
      ...PROFILS.Tank, level: 70, palier: 7, variant, equipment, baseStats: BASES_COMBAT,
    }).def
  const mainStat = (stat: 'defFlat' | 'defPct', rarity: string) => {
    const piece = buildEquipmentCatalog().find(
      (r) => r.mainStat === stat && r.rarity === rarity,
    )
    if (!piece) {
      throw new Error(`pas de pièce ${stat} ${rarity}`)
    }
    return piece.bonuses as Record<string, number>
  }

  it('DEF % bat DEF plate en fin de jeu, pour chaque rareté', () => {
    const nue = damageReduction(defTank('NORMAL'), DEFENSE_K)
    for (const rarity of ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY']) {
      const gainPct =
        damageReduction(defTank('NORMAL', [mainStat('defPct', rarity)]), DEFENSE_K) - nue
      const gainFlat =
        damageReduction(defTank('NORMAL', [mainStat('defFlat', rarity)]), DEFENSE_K) - nue
      expect(gainPct).toBeGreaterThanOrEqual(2 * gainFlat)
    }
  })

  it('un Tank réaliste reste sous 80 % de réduction hors FORTIFY', () => {
    // DEF % en stat principale sur les trois emplacements qui l'autorisent
    // (plastron, gants, ceinture), légendaires au niveau max, et sur chacune
    // des 7 pièces une sous-stat DEF % de 12 (tirage moyen de 3-8 % plus un
    // palier). Mesuré à ~79,9 % au seuil K = 1 000 : le plafond se règle par
    // K (GlobalConfig `combat.defMitigationRef`), pas en touchant ce test.
    const principale = () =>
      effectiveEquipmentBonuses(
        mainStat('defPct', 'LEGENDARY'), EQUIP_MAX_LEVEL, [{ key: 'defPct', value: 12 }],
      )
    const autres = Array.from({ length: 4 }, () => ({ defPct: 12 }))
    const def = defTank('HOLOGRAPHIC', [principale(), principale(), principale(), ...autres])
    expect(damageReduction(def, DEFENSE_K)).toBeLessThanOrEqual(0.8)
  })
})

describe('stackArmorPen', () => {
  it('cumule chaque source sur la DEF restante, sans jamais dépasser 100', () => {
    expect(stackArmorPen([])).toBe(0)
    expect(stackArmorPen([40])).toBeCloseTo(40)
    expect(stackArmorPen([40, 25])).toBeCloseTo(55)
    expect(stackArmorPen(Array.from({ length: 10 }, () => 40))).toBeLessThan(100)
  })
})
