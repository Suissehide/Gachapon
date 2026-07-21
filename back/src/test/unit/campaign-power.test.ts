import { describe, expect, it } from '@jest/globals'

import { computeTeamPower } from '../../main/domain/campaign/campaign-power'

describe('computeTeamPower', () => {
  it('sums (hp/2 + atk×1.5 + def) × (spd/SPD_REF) per enemy (BASIC par défaut)', () => {
    const team = [
      { baseHp: 80, baseAtk: 8, baseDef: 4, baseSpd: 85 },
      { baseHp: 80, baseAtk: 8, baseDef: 4, baseSpd: 85 },
    ]
    // (80/2 + 12 + 4) × (85/100) = 56 × 0.85 = 47.6 → 48 par ennemi
    expect(computeTeamPower(team)).toBe(96)
  })

  it('applique une prime de menace AOE_3 (×7 sur le terme atk, calibrée sim)', () => {
    const boss = { baseHp: 976, baseAtk: 35, baseDef: 22, baseSpd: 100 }
    // BASIC : (488 + 35×1.5×1 + 22) × (100/100) = 562.5 → 563
    expect(computeTeamPower([{ ...boss, attackPattern: 'BASIC' }])).toBe(563)
    // AOE_3 : (488 + 35×1.5×7 + 22) × (100/100) = 877.5 → 878 (≈ seuil de victoire réel)
    expect(computeTeamPower([{ ...boss, attackPattern: 'AOE_3' }])).toBe(878)
  })

  it('rounds per enemy, not the total', () => {
    // (5/2 + 0 + 0) × (100/100) = 2.5 → round(2.5) = 3 par ennemi, donc 3+3 = 6.
    // Un arrondi de la somme donnerait round(5.0) = 5 → l'écart prouve
    // l'arrondi PAR ennemi.
    const team = [
      { baseHp: 5, baseAtk: 0, baseDef: 0, baseSpd: 100 },
      { baseHp: 5, baseAtk: 0, baseDef: 0, baseSpd: 100 },
    ]
    expect(computeTeamPower(team)).toBe(6)
  })

  it('returns 0 for an empty team', () => {
    expect(computeTeamPower([])).toBe(0)
  })
})
