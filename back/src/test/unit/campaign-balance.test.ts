import {
  bossEnemyTeam,
  bossLoot,
  difficultyMult,
  enemyPower,
  lootTableNormal,
  normalEnemyTeam,
} from '../../../prisma/seed/campaign'

describe('enemyPower — aligné sur le joueur attendu (rareté + niveau + palier ATB)', () => {
  it('stage 1-1 : valeur ancre exacte (scale=1, NORMAL_FACTOR=0.98)', () => {
    // rb = COMMON {105,10,5,92}, scale = levelMult(1)*palierMult(1) = 1
    // hp: 105×0.98×1 = 102.9 → 103 ; atk: 10×0.98 = 9.8 → 10
    // def: 5×0.98 = 4.9 → 5 ; spd: 92×1 = 92 (pas de NORMAL_FACTOR)
    expect(enemyPower(1, 1)).toEqual({
      baseHp: 103,
      baseAtk: 10,
      baseDef: 5,
      baseSpd: 92,
    })
  })

  it('la vitesse SCALE désormais avec le niveau (ATB parity — ancienne valeur fixe éliminée)', () => {
    expect(enemyPower(1, 9).baseSpd).toBeGreaterThan(enemyPower(1, 1).baseSpd)
  })

  it('les PV sont STRICTEMENT croissants sur les 50 stages globaux', () => {
    let prevHp = -1
    for (let n = 1; n <= 50; n++) {
      const chapter = Math.floor((n - 1) / 10) + 1
      const index = ((n - 1) % 10) + 1
      const hp = enemyPower(chapter, index).baseHp
      expect(hp).toBeGreaterThan(prevHp)
      prevHp = hp
    }
  })

  it('est CONTINU au changement de chapitre (2-1 > 1-10, 3-1 > 2-10)', () => {
    expect(enemyPower(2, 1).baseHp).toBeGreaterThan(enemyPower(1, 10).baseHp)
    expect(enemyPower(3, 1).baseHp).toBeGreaterThan(enemyPower(2, 10).baseHp)
  })
})

describe('bossEnemyTeam — solo AOE_3, PV ×BOSS_HP_MULT, vitesse à parité ATB', () => {
  it('le boss 1-10 est un solo AOE dont la vitesse scale (> 100)', () => {
    const team = bossEnemyTeam(1, 10)
    const [boss, ...rest] = team
    expect(rest).toHaveLength(0)
    expect(boss.attackPattern).toBe('AOE_3')
    // Vitesse scaleée — plus de valeur fixe 100
    expect(boss.baseSpd).toBeGreaterThan(100)
  })

  it('pour chaque chapitre (1-5) : solo, AOE_3, PV > ennemi normal du stage 9', () => {
    for (const chapter of [1, 2, 3, 4, 5]) {
      const bosses = bossEnemyTeam(chapter, 10)
      const normals = normalEnemyTeam(chapter, 9)
      expect(bosses).toHaveLength(1)
      expect(bosses[0].attackPattern).toBe('AOE_3')
      expect(bosses[0].baseHp).toBeGreaterThan(normals[0].baseHp)
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
    expect(fc.gold).toBe(1650)
    expect(fc.dust).toBe(1000)
    expect(fc.xp).toBe(200)
    expect(fc.guaranteedEquipment).toEqual({ minRarity: 'RARE' })
    // f4a400f : carte garantie RARE ch.1-3, EPIC ch.4-5
    expect(fc.guaranteedCard).toEqual({ minRarity: 'RARE' })
    expect(bossLoot(4).firstClear.guaranteedCard).toEqual({ minRarity: 'EPIC' })
  })
})
