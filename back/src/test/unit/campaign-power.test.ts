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
})
