import { ELEMENTS } from '../../main/domain/combat/element'
import {
  FAMILY_ELEMENTS,
  type FamilySlug,
} from '../../../prisma/seed/bestiary'
import {
  CAMPAIGN_TARGETS,
  campaignWinRate,
} from '../../../prisma/seed/balance-calibration'
import {
  baseEnemyScale,
  BOSS_ELEMENT_BY_CHAPTER,
  bossEnemyTeam,
  bossGearCompensation,
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
    // Propriété de la courbe de BASE (niveau × ascension × durcissement) :
    // depuis l'ajout de la compensation d'équipement, `enemyScale` n'est plus
    // décomposable en ces deux seuls termes, on interroge donc
    // `baseEnemyScale`.
    const levelTerm = (n: number) =>
      1 + 0.09 * (Math.min(n, 70) - 1) + 0.03 * Math.max(0, n - 70)
    const ascension = (n: number) => baseEnemyScale(n) / levelTerm(n)
    expect(ascension(80)).toBeCloseTo(ascension(70), 10)
    expect(ascension(90)).toBeCloseTo(ascension(70), 10)
  })

  it("aucune marche À L'INTÉRIEUR d'un chapitre", () => {
    // Ce que le test protège : la continuité vécue pendant qu'on déroule un
    // chapitre. Il n'y a rien à franchir entre deux étages voisins du même
    // chapitre — le joueur n'y gagne ni palier ni rareté.
    //
    // Seuil 13 % et non 12 % : le maximum est le pas 1-1 → 1-2 (12,55 %), où
    // l'étage d'ancre porte une compensation d'équipement forcée à 1,0 (règle
    // du tutoriel) tandis que le 1-2 amorce déjà la rampe du chapitre. Ce
    // premier pas cumule donc la croissance de base et le début de la
    // compensation. En valeur absolue il reste minuscule : 98 PV → 110.
    for (let n = 2; n <= 90; n++) {
      if (n % 10 === 1) {
        continue // frontière de chapitre, voir le test suivant
      }
      const step = enemyScale(n) / enemyScale(n - 1)
      expect(step).toBeGreaterThan(1)
      expect(step).toBeLessThan(1.13)
    }
  })

  it('les marches de frontière existent, et suivent celles du joueur', () => {
    // Aux frontières de chapitre, le joueur monte EN BLOC : palier (×1,15) et,
    // aux chapitres 2 à 5, rareté de carte (jusqu'à ×1,74 de COMMON à
    // LEGENDARY). La compensation d'équipement suit ces marches plutôt que de
    // les lisser — les lisser rendrait le début de chapitre trivial et sa fin
    // infranchissable, ce que la mesure montrait (0 % de victoire aux étages
    // 4-7 et 4-9 avec une rampe lissée).
    //
    // La plus haute est la frontière 4→5, où le joueur passe en légendaires.
    const marche = (chapitre: number) =>
      enemyScale((chapitre - 1) * 10 + 1) / enemyScale((chapitre - 1) * 10)
    for (let chapitre = 2; chapitre <= 9; chapitre++) {
      expect(marche(chapitre)).toBeGreaterThan(1)
      expect(marche(chapitre)).toBeLessThan(2.2)
    }
    const plusHaute = Math.max(
      ...[2, 3, 4, 5, 6, 7, 8, 9].map((c) => marche(c)),
    )
    expect(marche(5)).toBeCloseTo(plusHaute, 10)
  })

  it('le boss est le combat le plus dur de son chapitre, dans les 9 chapitres', () => {
    for (let chapter = 1; chapter <= 9; chapter++) {
      const bossGap = gap(chapter, 10)
      for (let index = 1; index <= 9; index++) {
        expect(gap(chapter, index)).toBeLessThan(bossGap)
      }
    }
  })

  it("l'écart avec un joueur SANS équipement se creuse sur la campagne", () => {
    // Remplace « en phase 2 l'amplitude par chapitre est plus faible ».
    // Cette propriété-là supposait qu'un joueur plafonné en niveau ne
    // progresse plus ; or la phase 2 est précisément celle où il progresse
    // par l'ÉQUIPEMENT, et la courbe en tient désormais compte.
    //
    // `gap` compare la courbe ennemie à un joueur modélisé par son seul
    // niveau. Il doit donc se creuser : c'est la mesure de ce que la campagne
    // suppose d'équipement, et un joueur qui n'en porte aucun décroche — par
    // construction, pas par accident.
    expect(gap(9, 9)).toBeGreaterThan(gap(5, 9))
    expect(gap(5, 9)).toBeGreaterThan(gap(1, 9))
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
    // Ancre exacte : COMMON {101,20,5,89}, BOSS_FACTOR = 0,92, et l'échelle
    // du boss = enemyScale(10) × bossGearCompensation(1). Le second facteur
    // est celui qui amène CE boss à sa cible de 70 % de victoire face au
    // joueur équipé de référence — les neuf n'y arrivent pas avec le même
    // nombre, leurs multiplicateurs propres (PV ×3.25, AOE_3) ne tombant pas
    // au même endroit selon le chapitre.
    const echelle = enemyScale(10) * bossGearCompensation(1)
    expect(boss).toMatchObject({
      baseHp: Math.round(101 * 3.25 * 0.92 * echelle),
      baseAtk: Math.round(20 * 0.92 * echelle),
      baseDef: Math.round(5 * 1.2 * 0.92 * echelle),
      baseSpd: 89,
      attackPattern: 'AOE_3',
    })
    // …et ces valeurs restent celles d'un boss de tutoriel.
    expect(boss.baseHp).toBeGreaterThan(500)
    expect(boss.baseHp).toBeLessThan(700)
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
    expect(fc.xp).toBe(7)
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
    expect(fc.xp).toBe(65)
    expect(fc.guaranteedEquipment).toEqual({ minRarity: 'RARE' })
    // carte garantie : RARE ch.1-3, EPIC ch.4-8, LEGENDARY ch.9
    expect(fc.guaranteedCard).toEqual({ minRarity: 'RARE' })
    expect(bossLoot(4).firstClear.guaranteedCard).toEqual({ minRarity: 'EPIC' })
  })
})

describe('éléments des monstres — un élément par famille de bestiaire', () => {
  it('chaque famille du bestiaire a un élément valide', () => {
    const families = Object.keys(FAMILY_ELEMENTS) as FamilySlug[]
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
      if (!bossElement) {
        throw new Error(`Pas d'élément de boss pour le chapitre ${chapter}`)
      }
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

  it('les boss aussi, facteur de boss compris', () => {
    const boss = bossEnemyTeam(9, 10)[0]
    expect(boss.mitigationScale).toBeCloseTo(
      enemyScale(90) * bossGearCompensation(9),
      6,
    )
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

describe("compensation d'équipement — la campagne mesurée contre un joueur équipé", () => {
  it('chaque chapitre tient sa cible sur les étages normaux', () => {
    // LE test qui manquait. La campagne était calibrée avec `GEAR_PROFILES`
    // (`scripts/balance-sim.ts`), qui réduit l'équipement à trois
    // pourcentages et ignore le bloc crit / pénétration — lequel ne dépend ni
    // du niveau ni du palier. Mesurée avec le vrai catalogue, la campagne
    // ENTIÈRE se gagnait à 100 %, boss 9-10 compris, avec sept pièces rares
    // niveau 3.
    //
    // Bande large (±18 points) : le taux de victoire est une fonction
    // quasi binaire des stats (23 % d'écart entre 90 % et 10 % de victoire),
    // et ce test doit signaler une DÉRIVE, pas du bruit d'échantillonnage.
    // Le chapitre 1 est exclu : c'est un tutoriel, volontairement gagné.
    for (let chapitre = 2; chapitre <= 9; chapitre++) {
      for (const index of [1, 5, 9]) {
        const mesure = campaignWinRate({ chapter: chapitre, index, runs: 60 })
        expect(mesure).toBeGreaterThanOrEqual(CAMPAIGN_TARGETS.normal - 0.18)
        expect(mesure).toBeLessThanOrEqual(CAMPAIGN_TARGETS.normal + 0.12)
      }
    }
  })

  it('chaque boss tient la sienne', () => {
    for (let chapitre = 1; chapitre <= 9; chapitre++) {
      const mesure = campaignWinRate({ chapter: chapitre, index: 10, runs: 60 })
      expect(mesure).toBeGreaterThanOrEqual(CAMPAIGN_TARGETS.boss - 0.18)
      expect(mesure).toBeLessThanOrEqual(CAMPAIGN_TARGETS.boss + 0.18)
    }
  })

  it('le chapitre 1 reste un tutoriel : on le gagne', () => {
    for (const index of [1, 5, 9]) {
      expect(campaignWinRate({ chapter: 1, index, runs: 60 })).toBeGreaterThan(
        0.85,
      )
    }
  })

  it("durcir la difficulté n'a pas déplacé le butin", () => {
    // Le butin de campagne passe par `difficultyMult` (CURVE_A/CURVE_B), une
    // courbe INDÉPENDANTE de `enemyScale`. C'est ce qui a permis de recalibrer
    // la difficulté sans toucher à l'économie — contrairement aux tours, où
    // les deux lisaient la même constante et où il a fallu les séparer.
    // Valeurs relevées AVANT l'ajout de la compensation d'équipement.
    expect(lootTableNormal(1, 1).farm.gold).toBe(50)
    expect(lootTableNormal(5, 5).farm.gold).toBe(454)
    expect(lootTableNormal(9, 9).farm.gold).toBe(1054)
    expect(bossLoot(9).firstClear.gold).toBe(42288)
  })

  it('la compensation ne touche pas la courbe de base', () => {
    // `baseEnemyScale` doit rester exactement ce qu'elle était : c'est elle
    // qui porte la progression en NIVEAU du joueur, et la compensation
    // d'équipement se pose par-dessus sans la réécrire.
    expect(baseEnemyScale(1)).toBeCloseTo(1, 10)
    expect(baseEnemyScale(10)).toBeCloseTo(2.0655612, 6)
  })
})
