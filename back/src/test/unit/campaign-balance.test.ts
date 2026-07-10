import { enemyPower } from '../../../prisma/seed/campaign'

describe('enemyPower — courbe durcie', () => {
  it('laisse le stage 1-1 au plancher (tuto)', () => {
    expect(enemyPower(1, 1)).toEqual({
      baseHp: 80,
      baseAtk: 8,
      baseDef: 4,
      baseSpd: 85,
    })
  })

  it('monte fort en fin de chapitre (1-9)', () => {
    // mult = 1.18^8 ≈ 3.759 → 80*→301, 8*→30, 4*→15
    expect(enemyPower(1, 9)).toEqual({
      baseHp: 301,
      baseAtk: 30,
      baseDef: 15,
      baseSpd: 85,
    })
  })

  it('adoucit le saut inter-chapitre (2-1 = ×2.0)', () => {
    expect(enemyPower(2, 1)).toEqual({
      baseHp: 160,
      baseAtk: 16,
      baseDef: 8,
      baseSpd: 85,
    })
  })
})
