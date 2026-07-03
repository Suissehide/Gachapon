import { describe, expect, it } from '@jest/globals'

import { computeTeamPower } from '../../main/domain/campaign/campaign-power'

describe('computeTeamPower', () => {
  it('sums hp/4 + atk×1.5 + def + spd per enemy', () => {
    const team = [
      { baseHp: 80, baseAtk: 8, baseDef: 4, baseSpd: 85 },
      { baseHp: 80, baseAtk: 8, baseDef: 4, baseSpd: 85 },
    ]
    // 80/4 + 12 + 4 + 85 = 121 par ennemi
    expect(computeTeamPower(team)).toBe(242)
  })

  it('rounds per enemy, not the total', () => {
    // 6/4 = 1.5 → round(1.5) = 2 par ennemi, donc 2+2 = 4
    // un arrondi de la somme donnerait round(3.0) = 3
    const team = [
      { baseHp: 6, baseAtk: 0, baseDef: 0, baseSpd: 0 },
      { baseHp: 6, baseAtk: 0, baseDef: 0, baseSpd: 0 },
    ]
    expect(computeTeamPower(team)).toBe(4)
  })

  it('returns 0 for an empty team', () => {
    expect(computeTeamPower([])).toBe(0)
  })
})
