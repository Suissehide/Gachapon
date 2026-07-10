import { enemyPower, lootTableNormal } from '../../../prisma/seed/campaign'

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

describe('lootTableNormal — first-clear recalé sur la difficulté', () => {
  it('1-1 : butin réduit, PAS d\'équipement garanti (trivial)', () => {
    const fc = lootTableNormal(1, 1).firstClear
    expect(fc.gold).toBe(120)
    expect(fc.dust).toBe(30)
    expect(fc.xp).toBe(22)
    expect(fc.guaranteedEquipment).toBeUndefined()
  })

  it('1-3 : équipement garanti à partir de 1-3 (COMMON)', () => {
    const fc = lootTableNormal(1, 3).firstClear
    // 120 * 1.18^2 = 167.09 → 167
    expect(fc.gold).toBe(167)
    expect(fc.guaranteedEquipment).toEqual({ minRarity: 'COMMON' })
  })

  it('1-9 : ramp jusqu\'en fin de chapitre', () => {
    const fc = lootTableNormal(1, 9).firstClear
    // 120 * 1.18^8 = 451.1 → 451 ; 30 * 3.759 = 112.8 → 113
    expect(fc.gold).toBe(451)
    expect(fc.dust).toBe(113)
    expect(fc.guaranteedEquipment).toEqual({ minRarity: 'UNCOMMON' })
  })

  it('le farm reste inchangé (base 40 + 10*stage)', () => {
    expect(lootTableNormal(1, 1).farm.gold).toBe(50)
  })
})
