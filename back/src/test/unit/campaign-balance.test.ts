import {
  bossEnemyTeam,
  bossLoot,
  difficultyMult,
  enemyPower,
  lootTableNormal,
} from '../../../prisma/seed/campaign'

describe('enemyPower — courbe concave continue', () => {
  it('laisse le stage 1-1 au plancher (tuto)', () => {
    expect(enemyPower(1, 1)).toEqual({
      baseHp: 80,
      baseAtk: 8,
      baseDef: 4,
      baseSpd: 85,
    })
  })

  it('monte fort en début de jeu (1-9 : mult ≈ 3.44)', () => {
    // mult = (1 + 0.08×8)^2.5 ≈ 3.444 → 80→276, 8→28, 4→14
    expect(enemyPower(1, 9)).toEqual({
      baseHp: 276,
      baseAtk: 28,
      baseDef: 14,
      baseSpd: 85,
    })
  })

  it('est CONTINUE au changement de chapitre (2-1 > 1-10, plus de dent de scie)', () => {
    // Ancienne courbe : 3-1 retombait sous 2-6. Désormais le stage global
    // n = (chapitre-1)×10 + index est seul maître de la difficulté.
    expect(enemyPower(2, 1)).toEqual({
      baseHp: 348,
      baseAtk: 35,
      baseDef: 17,
      baseSpd: 85,
    })
    expect(enemyPower(2, 1).baseHp).toBeGreaterThan(enemyPower(1, 10).baseHp)
    expect(enemyPower(3, 1).baseHp).toBeGreaterThan(enemyPower(2, 9).baseHp)
  })

  it('croît de moins en moins vite (concave : lvl-up bon marché au début, cher ensuite)', () => {
    // Croissance relative par stage strictement décroissante : ≈ +21 % au
    // stage 2, ≈ +4 % au stage 50.
    let prevGrowth = Number.POSITIVE_INFINITY
    for (let n = 2; n <= 50; n++) {
      const chapter = Math.floor((n - 1) / 10) + 1
      const index = ((n - 1) % 10) + 1
      const prevChapter = Math.floor((n - 2) / 10) + 1
      const prevIndex = ((n - 2) % 10) + 1
      const growth =
        difficultyMult(chapter, index) / difficultyMult(prevChapter, prevIndex)
      expect(growth).toBeGreaterThan(1)
      expect(growth).toBeLessThan(prevGrowth)
      prevGrowth = growth
    }
    expect(difficultyMult(1, 2)).toBeCloseTo(1.212, 2)
    expect(difficultyMult(5, 10) / difficultyMult(5, 9)).toBeCloseTo(1.043, 2)
  })
})

describe('bossEnemyTeam — check de build (PV ×3.25, atk ×1.0, AOE_3)', () => {
  it('le boss 1-10 est un solo AOE tank calibré par simulation', () => {
    const [boss, ...rest] = bossEnemyTeam(1, 10)
    // un seul ennemi (solo boss)
    expect(rest).toHaveLength(0)
    // enemyPower(1,10) = { hp 310, atk 31, def 16, spd 85 }
    // boss = hp ×3.25 → 1008, atk ×1.0 → 31, def ×1.2 → 19, spd 100
    expect(boss).toMatchObject({
      baseHp: 1008,
      baseAtk: 31,
      baseDef: 19,
      baseSpd: 100,
      attackPattern: 'AOE_3',
    })
  })

  it('les boss de TOUS les chapitres (1-5) suivent la même recette', () => {
    // Attendus dérivés d'enemyPower pour éviter tout calcul à la main : la
    // même recette (PV ×3.25, atk ×1.0, def ×1.2, AOE_3) s'applique partout.
    for (const chapter of [1, 2, 3, 4, 5]) {
      const p = enemyPower(chapter, 10)
      const team = bossEnemyTeam(chapter, 10)
      expect(team).toHaveLength(1)
      expect(team[0]).toMatchObject({
        baseHp: Math.round(p.baseHp * 3.25),
        baseAtk: Math.round(p.baseAtk * 1.0),
        baseDef: Math.round(p.baseDef * 1.2),
        baseSpd: 100,
        attackPattern: 'AOE_3',
      })
    }
  })
})

describe('lootTableNormal — butin lissé sur la difficulté', () => {
  it("1-1 : butin réduit, PAS d'équipement garanti (trivial)", () => {
    const fc = lootTableNormal(1, 1).firstClear
    expect(fc.gold).toBe(120)
    expect(fc.dust).toBe(30)
    expect(fc.xp).toBe(22)
    expect(fc.guaranteedEquipment).toBeUndefined()
  })

  it('1-3 : équipement garanti à partir de 1-3 (COMMON)', () => {
    const fc = lootTableNormal(1, 3).firstClear
    // 120 × (1.16^2.5)^0.75 ≈ 159
    expect(fc.gold).toBe(159)
    expect(fc.guaranteedEquipment).toEqual({ minRarity: 'COMMON' })
  })

  it("1-9 : ramp jusqu'en fin de chapitre", () => {
    const fc = lootTableNormal(1, 9).firstClear
    // 120 × 3.444^0.75 ≈ 303 ; 30 × 3.444^0.75 ≈ 76
    expect(fc.gold).toBe(303)
    expect(fc.dust).toBe(76)
    expect(fc.guaranteedEquipment).toEqual({ minRarity: 'UNCOMMON' })
  })

  it('le farm 1-1 reste au plancher historique (50 gold / 4 dust / 6 xp)', () => {
    const farm = lootTableNormal(1, 1).farm
    expect(farm.gold).toBe(50)
    expect(farm.dust).toBe(4)
    expect(farm.xp).toBe(6)
  })

  it('le farm est CONTINU au changement de chapitre (3-1 > 2-9)', () => {
    // Ancienne courbe : 3-1 rapportait 9 dust contre 18 pour 2-9.
    expect(lootTableNormal(3, 1).farm.dust).toBeGreaterThan(
      lootTableNormal(2, 9).farm.dust,
    )
  })
})

describe('bossLoot — prime de farm alignée sur la difficulté réelle', () => {
  it('farm boss = farm du stage de même position ×1.25', () => {
    for (const chapter of [1, 2, 3, 4, 5]) {
      const atBossStage = lootTableNormal(chapter, 10).farm
      const boss = bossLoot(chapter).farm
      expect(boss.gold).toBe(Math.round(atBossStage.gold * 1.25))
      expect(boss.dust).toBe(Math.round(atBossStage.dust * 1.25))
      expect(boss.xp).toBe(Math.round(atBossStage.xp * 1.25))
    }
  })

  it("le boss 2-10 ne domine plus le farm du chapitre 3 (régression de l'exploit)", () => {
    // Ancien ×2.5 : boss 2-10 = 45 dust, mieux que TOUT le chapitre 3 (max 27).
    // Désormais la progression le rattrape en quelques stages.
    const bossDust = bossLoot(2).farm.dust
    expect(lootTableNormal(3, 5).farm.dust).toBeGreaterThanOrEqual(bossDust)
    expect(lootTableNormal(3, 7).farm.dust).toBeGreaterThan(bossDust)
  })

  it('le first-clear boss reste un jackpot chapitre-based', () => {
    const fc = bossLoot(1).firstClear
    expect(fc.gold).toBe(5000)
    expect(fc.dust).toBe(1000)
    expect(fc.xp).toBe(200)
    expect(fc.guaranteedEquipment).toEqual({ minRarity: 'RARE' })
    expect(fc.guaranteedCard).toEqual({ minRarity: 'EPIC' })
  })
})
