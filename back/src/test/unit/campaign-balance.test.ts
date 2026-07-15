import {
  bossEnemyTeam,
  enemyPower,
  lootTableNormal,
} from '../../../prisma/seed/campaign'

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

describe('bossEnemyTeam — boss adouci (PV ×2.75, atk ×1.0, AOE_3)', () => {
  it('le boss 1-10 est un solo AOE tank calibré par simulation', () => {
    const [boss, ...rest] = bossEnemyTeam(1, 10)
    // un seul ennemi (solo boss)
    expect(rest).toHaveLength(0)
    // enemyPower(1,10) = { hp 355, atk 35, def 18, spd 85 }
    // boss = hp ×2.75 → 976, atk ×1.0 → 35, def ×1.2 → 22, spd 100
    expect(boss).toMatchObject({
      baseHp: 976,
      baseAtk: 35,
      baseDef: 22,
      baseSpd: 100,
      attackPattern: 'AOE_3',
    })
  })

  it('les boss de TOUS les chapitres (1-5) suivent la même courbe', () => {
    // Attendus dérivés d'enemyPower pour éviter tout calcul à la main : la
    // même recette softenée (PV ×2.75, atk ×1.0, def ×1.2, AOE_3) s'applique
    // aux chapitres 4 et 5 nouvellement ajoutés comme aux ch. 1-3.
    for (const chapter of [1, 2, 3, 4, 5]) {
      const p = enemyPower(chapter, 10)
      const team = bossEnemyTeam(chapter, 10)
      expect(team).toHaveLength(1)
      expect(team[0]).toMatchObject({
        baseHp: Math.round(p.baseHp * 2.75),
        baseAtk: Math.round(p.baseAtk * 1.0),
        baseDef: Math.round(p.baseDef * 1.2),
        baseSpd: 100,
        attackPattern: 'AOE_3',
      })
    }
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
