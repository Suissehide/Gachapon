import { ELEMENTS } from '../../main/domain/combat/element'
import {
  BOSS_ELEMENT_BY_CHAPTER,
  FAMILY_ELEMENTS,
  bossEnemyTeam,
  bossLoot,
  difficultyMult,
  enemyPower,
  enemyScale,
  lootTableNormal,
  normalEnemyTeam,
} from '../../../prisma/seed/campaign'

describe('enemyPower — aligné sur le joueur attendu (rareté + enemyScale)', () => {
  it('stage 1-1 : valeur ancre exacte (scale=1, NORMAL_FACTOR=0.971)', () => {
    // rb = COMMON {105,10,5,92}, scale = enemyScale(1) = 1
    // hp: 105×0.971×1 = 101.955 → 102 ; atk: 10×0.971 = 9.71 → 10
    // def: 5×0.971 = 4.855 → 5 ; spd: 92×1 = 92 (pas de NORMAL_FACTOR)
    expect(enemyPower(1, 1)).toEqual({
      baseHp: 102,
      baseAtk: 10,
      baseDef: 5,
      baseSpd: 92,
    })
  })

  it('la vitesse SCALE désormais avec le niveau (ATB parity — ancienne valeur fixe éliminée)', () => {
    expect(enemyPower(1, 9).baseSpd).toBeGreaterThan(enemyPower(1, 1).baseSpd)
  })

  it('les PV sont STRICTEMENT croissants sur les 90 stages globaux', () => {
    let prevHp = -1
    for (let n = 1; n <= 90; n++) {
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

// Puissance joueur ATTENDUE à un étage donné : le niveau suit l'étage global
// jusqu'au plafond 70, l'ascension se fait EN BLOC au changement de chapitre
// et plafonne au palier 7. Volontairement redéclaré ici plutôt qu'importé :
// c'est le modèle de référence de la spec, et le test doit échouer si la
// production s'en écarte.
const expectedPlayerScale = (chapter: number, index: number): number => {
  const n = (chapter - 1) * 10 + index
  return (1 + 0.06 * (Math.min(n, 70) - 1)) * 1.15 ** (Math.min(chapter, 7) - 1)
}
const gap = (chapter: number, index: number): number =>
  enemyScale((chapter - 1) * 10 + index) / expectedPlayerScale(chapter, index)

describe('enemyScale — courbe continue en deux phases', () => {
  it("l'étage 1 est l'ancre : scale = 1", () => {
    expect(enemyScale(1)).toBeCloseTo(1, 10)
  })

  it("le terme d'ascension sature à l'étage 70 (identique à 70, 80 et 90)", () => {
    // scale = termeNiveau × termeAscension ; le terme de niveau est connu,
    // on isole donc l'ascension par division.
    const levelTerm = (n: number) =>
      1 + 0.06 * (Math.min(n, 70) - 1) + 0.03 * Math.max(0, n - 70)
    const ascension = (n: number) => enemyScale(n) / levelTerm(n)
    expect(ascension(80)).toBeCloseTo(ascension(70), 10)
    expect(ascension(90)).toBeCloseTo(ascension(70), 10)
  })

  it('plus aucune marche : chaque pas entre étages consécutifs reste sous +8 %', () => {
    for (let n = 2; n <= 90; n++) {
      const step = enemyScale(n) / enemyScale(n - 1)
      expect(step).toBeGreaterThan(1)
      expect(step).toBeLessThan(1.08)
    }
  })

  it('le boss est le combat le plus dur de son chapitre, dans les 9 chapitres', () => {
    for (let chapter = 1; chapter <= 9; chapter++) {
      const bossGap = gap(chapter, 10)
      for (let index = 1; index <= 9; index++) {
        expect(gap(chapter, index)).toBeLessThan(bossGap)
      }
    }
  })

  it("phase 2 (ch. 8-9) : l'amplitude par chapitre est au moins deux fois plus faible qu'en phase 1", () => {
    const amplitude = (chapter: number) => gap(chapter, 10) - gap(chapter, 1)
    const minPhase1 = Math.min(
      ...[1, 2, 3, 4, 5, 6, 7].map((c) => amplitude(c)),
    )
    const maxPhase2 = Math.max(amplitude(8), amplitude(9))
    // mesuré : phase 1 ≥ 0.1412, phase 2 = 0.0625
    expect(maxPhase2 * 2).toBeLessThan(minPhase1)
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
    // Ancre exacte (COMMON, étage global 10 → enemyScale(10) = 1.757439) :
    // PV = round(105 × 3.25 × 0.92 × 1.757439) = 552,
    // ATQ = round(10 × 0.92 × 1.757439) = 16,
    // DEF = round(5 × 1.2 × 0.92 × 1.757439) = 10,
    // VIT = round(92 × 1.757439) = 162.
    expect(boss).toMatchObject({
      baseHp: 552,
      baseAtk: 16,
      baseDef: 10,
      baseSpd: 162,
      attackPattern: 'AOE_3',
    })
  })

  it('pour chaque chapitre (1-9) : solo, AOE_3, PV > ennemi normal du stage 9', () => {
    for (let chapter = 1; chapter <= 9; chapter++) {
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
    for (let chapter = 1; chapter <= 9; chapter++) {
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
    // carte garantie : RARE ch.1-3, EPIC ch.4-8, LEGENDARY ch.9
    expect(fc.guaranteedCard).toEqual({ minRarity: 'RARE' })
    expect(bossLoot(4).firstClear.guaranteedCard).toEqual({ minRarity: 'EPIC' })
  })
})

describe('éléments des monstres — un élément par famille de bestiaire', () => {
  it('chaque famille du bestiaire a un élément valide', () => {
    const families = Object.keys(FAMILY_ELEMENTS)
    expect(families.length).toBe(14)
    for (const fam of families) {
      expect(ELEMENTS).toContain(FAMILY_ELEMENTS[fam])
    }
  })

  it('chaque monstre de chaque stage normal porte un élément', () => {
    for (let chapter = 1; chapter <= 9; chapter++) {
      for (let index = 1; index <= 9; index++) {
        const team = normalEnemyTeam(chapter, index)
        expect(team).toHaveLength(3)
        for (const e of team) {
          expect(ELEMENTS).toContain(e.element)
        }
      }
    }
  })

  it('le boss de chaque chapitre porte l’élément de son chapitre', () => {
    for (let chapter = 1; chapter <= 9; chapter++) {
      const [boss] = bossEnemyTeam(chapter, 10)
      expect(boss.element).toBe(BOSS_ELEMENT_BY_CHAPTER[chapter - 1])
    }
  })

  it('les chapitres 1 à 4 présentent 3 éléments DISTINCTS par étage', () => {
    for (let chapter = 1; chapter <= 4; chapter++) {
      for (let index = 1; index <= 9; index++) {
        const els = normalEnemyTeam(chapter, index).map((e) => e.element)
        expect(new Set(els).size).toBe(3)
      }
    }
  })

  it('l’élément d’un monstre correspond à la famille de son sprite', () => {
    // appearance = "monsters/{slug}/{CODE}" ; slug = clé de FAMILY_ELEMENTS.
    for (let chapter = 1; chapter <= 9; chapter++) {
      for (let index = 1; index <= 9; index++) {
        for (const e of normalEnemyTeam(chapter, index)) {
          const slug = e.appearance.split('/')[1]
          expect(e.element).toBe(FAMILY_ELEMENTS[slug])
        }
      }
    }
  })
})

describe('chapitres 6 à 9', () => {
  it('les 9 boss ont un élément absent des mobs de leur chapitre', () => {
    expect(BOSS_ELEMENT_BY_CHAPTER).toHaveLength(9)
    for (let chapter = 1; chapter <= 9; chapter++) {
      const bossElement = BOSS_ELEMENT_BY_CHAPTER[chapter - 1]
      expect(ELEMENTS).toContain(bossElement)
      const mobElements = new Set(
        [1, 2, 3, 4, 5, 6, 7, 8, 9].flatMap((index) =>
          normalEnemyTeam(chapter, index).map((e) => e.element),
        ),
      )
      expect(mobElements.has(bossElement)).toBe(false)
    }
  })

  it('les chapitres 6 à 9 présentent 3 éléments DISTINCTS par étage', () => {
    for (let chapter = 6; chapter <= 9; chapter++) {
      for (let index = 1; index <= 9; index++) {
        const els = normalEnemyTeam(chapter, index).map((e) => e.element)
        expect(new Set(els).size).toBe(3)
      }
    }
  })

  it('les sprites de boss 6 à 9 existent déjà (BOSS-006..009)', () => {
    for (let chapter = 6; chapter <= 9; chapter++) {
      const [boss] = bossEnemyTeam(chapter, 10)
      expect(boss.appearance).toBe(`monsters/bosses/BOSS-00${chapter}`)
    }
  })

  it('la carte garantie des boss : RARE (1-3), EPIC (4-8), LEGENDARY (9)', () => {
    expect(bossLoot(3).firstClear.guaranteedCard).toEqual({
      minRarity: 'RARE',
    })
    expect(bossLoot(8).firstClear.guaranteedCard).toEqual({
      minRarity: 'EPIC',
    })
    expect(bossLoot(9).firstClear.guaranteedCard).toEqual({
      minRarity: 'LEGENDARY',
    })
  })
})
