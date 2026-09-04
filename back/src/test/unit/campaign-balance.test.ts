import { ELEMENTS } from '../../main/domain/combat/element'
import {
  BOSS_ELEMENT_BY_CHAPTER,
  FAMILY_ELEMENTS,
  bossEnemyTeam,
  bossLoot,
  difficultyMult,
  enemyPower,
  RARITY_BASE,
  enemyScale,
  lootTableNormal,
  normalEnemyTeam,
} from '../../../prisma/seed/campaign'

describe('enemyPower — aligné sur le joueur attendu (rareté + enemyScale)', () => {
  it('stage 1-1 : valeur ancre exacte (scale=1, NORMAL_FACTOR=0.971)', () => {
    // rb = COMMON {101,20,5,89}, scale = 1, NORMAL_FACTOR = 0,971.
    // hp: 101×0.971 = 98.07 → 98 ; atk: 20×0.971 = 19.42 → 19
    // def: 5×0.971 = 4.855 → 5 ; spd: 89 tel quel — la vitesse échappe au
    // facteur ET à l'échelle, elle reste la base de rareté.
    //
    // Le durcissement (et la compensation du gel de la vitesse) passent par la
    // MONTÉE progressive, neutre jusqu'à l'étage 10 : le tout premier combat
    // garde donc ses valeurs d'origine. Appliqués à plat, ils le rendaient
    // ingagnable avec trois communes médiocres.
    expect(enemyPower(1, 1)).toEqual({
      baseHp: 98,
      baseAtk: 19,
      baseDef: 5,
      baseSpd: 89,
    })
  })

  it("la vitesse NE suit PLUS l'échelle d'étage : elle reste la base de rareté", () => {
    // Renversement assumé de l'ancienne règle « la vitesse scale avec le
    // niveau (ATB parity) ». Sous ATB, seul le RAPPORT de vitesse entre les
    // deux camps compte : la faire croître des deux côtés ne changeait rien au
    // combat, rendait l'équilibrage mouvant, et gonflait la jauge de puissance
    // — un boss d'étage 80 y paraissait 23 fois plus fort qu'il ne l'est.
    // Elle est désormais figée des deux côtés, et seul l'équipement la bouge.
    expect(enemyPower(1, 9).baseSpd).toBe(enemyPower(1, 1).baseSpd)
    expect(enemyPower(9, 9).baseSpd).toBe(RARITY_BASE.LEGENDARY.spd)
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
      1 + 0.09 * (Math.min(n, 70) - 1) + 0.03 * Math.max(0, n - 70)
    const ascension = (n: number) => enemyScale(n) / levelTerm(n)
    expect(ascension(80)).toBeCloseTo(ascension(70), 10)
    expect(ascension(90)).toBeCloseTo(ascension(70), 10)
  })

  it('plus aucune marche : chaque pas entre étages consécutifs reste sous +12 %', () => {
    // Seuil relevé de 8 % à 12 % avec la croissance passée de 0,06 à 0,09 par
    // niveau. Les deux camps montent ensemble — le rapport joueur/ennemi est
    // INCHANGÉ (0,876 à l'étage 10, 0,840 au 70, identique aux deux taux) —
    // mais chaque étage franchit mécaniquement une marche plus haute : 10,6 %
    // au maximum, en tout début de campagne. Ce que le test protège reste la
    // continuité : aucune marche franche, pas de mur.
    for (let n = 2; n <= 90; n++) {
      const step = enemyScale(n) / enemyScale(n - 1)
      expect(step).toBeGreaterThan(1)
      expect(step).toBeLessThan(1.12)
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
  it('le boss 1-10 est un solo AOE dont la vitesse reste celle de sa rareté', () => {
    const team = bossEnemyTeam(1, 10)
    const [boss, ...rest] = team
    expect(rest).toHaveLength(0)
    expect(boss.attackPattern).toBe('AOE_3')
    // La vitesse ne suit plus l'échelle : elle vaut la base de rareté.
    expect(boss.baseSpd).toBe(RARITY_BASE.COMMON.spd)
    // Ancre exacte (COMMON {101,20,5,89}, enemyScale(10) = 2.065561,
    // BOSS_FACTOR = 0,92) :
    // PV = round(101 × 3.25 × 0.92 × 2.065561) = 624,
    // ATQ = round(20 × 0.92 × 2.065561) = 38,
    // DEF = round(5 × 1.2 × 0.92 × 2.065561) = 11,
    // VIT = 89, inchangée par l'échelle.
    expect(boss).toMatchObject({
      baseHp: 624,
      baseAtk: 38,
      baseDef: 11,
      baseSpd: 89,
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
    // Le plancher suit l'avancement GLOBAL, pas l'index dans le chapitre :
    // 1-9 n'est qu'au dixième de la campagne, il reste donc en COMMON.
    expect(fc.guaranteedEquipment).toEqual({ minRarity: 'COMMON' })
  })

  // Le défaut que la linéarisation corrige : tout dépendait de `stageIndex`,
  // donc se réinitialisait à chaque chapitre — 9-3 lâchait le même butin que
  // 1-3, et le plancher COMMON ne tombait que sur l'index 3.
  it('le plancher de premier passage progresse sur la campagne entière', () => {
    const plancher = (c: number, i: number) =>
      lootTableNormal(c, i).firstClear.guaranteedEquipment?.minRarity
    expect(plancher(1, 3)).toBe('COMMON')
    expect(plancher(3, 5)).toBe('UNCOMMON')
    expect(plancher(6, 5)).toBe('RARE')
    expect(plancher(9, 5)).toBe('EPIC')
    // Un même index ne donne plus le même plancher d'un chapitre à l'autre.
    expect(plancher(9, 3)).not.toBe(plancher(1, 3))
  })

  it('équipement garanti partout sauf sur les deux premiers étages de la campagne', () => {
    const garanti = (c: number, i: number) =>
      lootTableNormal(c, i).firstClear.guaranteedEquipment !== undefined
    expect(garanti(1, 1)).toBe(false)
    expect(garanti(1, 2)).toBe(false)
    expect(garanti(1, 3)).toBe(true)
    // C'était « index >= 3 », donc 9-1 et 9-2 ne donnaient rien non plus.
    expect(garanti(9, 1)).toBe(true)
  })

  it('les communes décroissent strictement du début à la fin de la campagne', () => {
    const communes: number[] = []
    for (let c = 1; c <= 9; c++) {
      for (let i = 1; i <= 9; i++) {
        communes.push(lootTableNormal(c, i).farm.equipmentWeights.COMMON ?? 0)
      }
    }
    for (let n = 1; n < communes.length; n++) {
      expect(communes[n]).toBeLessThan(communes[n - 1])
    }
    expect(communes[0]).toBe(90)
    // Le dernier étage normal (9-9) est à 1 %, et la courbe atteint zéro au
    // bout de la campagne — les communes s'éteignent au lieu de se réarmer à
    // chaque chapitre.
    expect(communes[communes.length - 1]).toBe(1)
    expect(lootTableNormal(9, 10).farm.equipmentWeights.COMMON ?? 0).toBe(0)
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

describe('mitigation des ennemis', () => {
  it('chaque ennemi porte un mitigationScale égal à son enemyScale', () => {
    for (const [chapitre, etage] of [[1, 1], [5, 5], [9, 9]] as const) {
      const global = (chapitre - 1) * 10 + etage
      for (const e of normalEnemyTeam(chapitre, etage)) {
        expect(e.mitigationScale).toBeCloseTo(enemyScale(global), 6)
      }
    }
  })

  it('les boss aussi', () => {
    const boss = bossEnemyTeam(9, 10)[0]
    expect(boss.mitigationScale).toBeCloseTo(enemyScale(90), 6)
  })

  it('la réduction de dégâts d un ennemi ne dérive pas avec le chapitre', () => {
    const reduction = (chapitre: number, etage: number) => {
      const e = normalEnemyTeam(chapitre, etage)[0]
      const k = 100 * e.mitigationScale
      return 1 - k / (k + e.baseDef)
    }
    // Chapitres 5 et 9 sont tous deux LEGENDARY (RARITY_BY_CHAPTER) : à
    // rareté égale, la réduction ne doit pas dériver avec l'étage global
    // malgré la DEF ×15,8 du chapitre 9. NB : chapitre 1 (COMMON) n'est PAS
    // comparable ici, sa DEF de base (5) n'est pas sur la même échelle que
    // celle d'un LEGENDARY (29) — ce n'est pas le même monstre, la
    // différence de réduction entre paliers de rareté est voulue.
    // Sans correction, le chapitre 9 dérivait jusqu'à 82 % de réduction.
    expect(reduction(9, 9)).toBeCloseTo(reduction(5, 5), 2)
  })
})
