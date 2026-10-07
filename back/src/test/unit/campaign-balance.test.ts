import { ELEMENTS } from '../../main/domain/combat/element'
import {
  FAMILY_ELEMENTS,
  type FamilySlug,
} from '../../main/domain/content/bestiary.definitions'
import {
  CAMPAIGN_TARGETS,
  campaignProfile,
  campaignWinRate,
} from '../../../prisma/seed/balance-calibration'
import {
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
} from '../../main/domain/content/campaign.definitions'

describe('enemyPower — aligné sur le joueur attendu (rareté + enemyScale)', () => {
  it('stage 1-1 : valeur ancre exacte (ancre 134 PV, NORMAL_FACTOR=0.971)', () => {
    // rb = COMMON {124,24,14,89}, scale = 134 / 124 (première ancre de PV,
    // fittée le 2026-10-08 sur un joueur SANS équipement : la première pièce
    // garantie tombe à l'étage 3), NORMAL_FACTOR = 0,971.
    // hp: 134×0.971 = 130.1 → 130 ; atk: 24×0.971×1.0806 = 25.2 → 25
    // def: 14×0.971×1.0806 = 14.7 → 15 ; spd: 89 tel quel — la vitesse
    // échappe au facteur ET à l'échelle, elle reste la base de rareté.
    expect(enemyPower(1, 1)).toEqual({
      baseHp: 130,
      baseAtk: 25,
      baseDef: 15,
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
    expect(enemyPower(9, 9).baseSpd).toBe(RARITY_BASE.EPIC.spd)
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

describe('enemyScale — courbe à ancres, sans marche', () => {
  it("l'étage 1 est l'ancre : scale = PV de l'ancre / PV de base COMMON", () => {
    expect(enemyScale(1)).toBeCloseTo(134 / RARITY_BASE.COMMON.hp, 10)
  })

  it('aucune marche : PV des étages normaux, frontières de chapitre comprises', () => {
    // Ce que le test protège (2026-10-07) : la courbe ne saute plus au
    // changement de chapitre. Avant, 4-9 → 5-1 faisait ×3,6 en PV, et un
    // joueur resté en épiques y passait de 88 % à 0 % de victoire.
    //
    // Pas maximal par étage : 1,22, atteint dans la rampe du tutoriel
    // (chapitre 1) — 98 PV à 1-1 → 118 à 1-2. Une frontière franchit DEUX
    // étages (le boss est entre les deux) : ×1,35 au plus, soit ~1,16 par
    // étage, le rythme d'un chapitre.
    const hp = (n: number) =>
      enemyPower(Math.ceil(n / 10), ((n - 1) % 10) + 1).baseHp
    for (let n = 2; n <= 90; n++) {
      if (n % 10 === 0) {
        continue // boss
      }
      const precedent = n % 10 === 1 ? n - 2 : n - 1
      const pas = hp(n) / hp(precedent)
      expect(pas).toBeGreaterThan(1)
      expect(pas).toBeLessThan(n % 10 === 1 ? 1.35 : 1.22)
    }
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
    // Ancre exacte : base COMMON, BOSS_FACTOR = 0,92, et l'échelle du boss =
    // enemyScale(10) × bossGearCompensation(1). Pour ce boss-là, le second
    // facteur le cale sur la cible du tutoriel (~95 %), au-dessus des 70 %
    // des huit autres.
    const rb = RARITY_BASE.COMMON
    const echelle = enemyScale(10) * bossGearCompensation(1)
    expect(boss).toMatchObject({
      baseHp: Math.round(rb.hp * 3.25 * 0.92 * echelle),
      baseAtk: Math.round(rb.atk * 0.92 * echelle),
      baseDef: Math.round(rb.def * 1.2 * 0.92 * echelle),
      baseSpd: 89,
      attackPattern: 'AOE_3',
    })
    // …et ces valeurs restent celles d'un boss de tutoriel : ~1 700 PV
    // depuis le refit du 2026-10-07 (645 avant), pour des cartes communes
    // aux PV et à l'équipement relevés.
    expect(boss.baseHp).toBeGreaterThan(1400)
    expect(boss.baseHp).toBeLessThan(2000)
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
    // Chapitres 5 et 9 sont tous deux EPIC (RARITY_BY_CHAPTER) : à
    // rareté égale, la réduction ne doit pas dériver avec l'étage global
    // malgré la DEF ×3 du chapitre 9. NB : chapitre 1 (COMMON) n'est PAS
    // comparable ici, sa DEF de base (5) n'est pas sur la même échelle que
    // celle d'un EPIC (17) — ce n'est pas le même monstre, la
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
    //
    // Trois étages sont PLUS FACILES que la cible par construction, et
    // documentés comme tels sur NORMAL_HP_ANCHORS : le chapitre 5 (deux
    // familles seulement, la mesure y réclame ×1,8 d'un coup que le
    // plafond de pas refuse) et celui du 6 (joueur qui stagne, mesure
    // décroissante). Le plafond haut ne s'y applique pas ; le plancher, si.
    const plusFaciles = new Set(['5-1', '5-5', '5-9', '6-1'])
    for (let chapitre = 2; chapitre <= 9; chapitre++) {
      for (const index of [1, 5, 9]) {
        const mesure = campaignWinRate({ chapter: chapitre, index, runs: 60 })
        expect(mesure).toBeGreaterThanOrEqual(CAMPAIGN_TARGETS.normal - 0.18)
        if (!plusFaciles.has(`${chapitre}-${index}`)) {
          expect(mesure).toBeLessThanOrEqual(CAMPAIGN_TARGETS.normal + 0.12)
        }
      }
    }
  })

  it('chaque boss tient la sienne', () => {
    // Le boss 1-10 est exclu : boss de tutoriel, volontairement gagné.
    for (let chapitre = 2; chapitre <= 9; chapitre++) {
      const mesure = campaignWinRate({ chapter: chapitre, index: 10, runs: 60 })
      expect(mesure).toBeGreaterThanOrEqual(CAMPAIGN_TARGETS.boss - 0.18)
      expect(mesure).toBeLessThanOrEqual(CAMPAIGN_TARGETS.boss + 0.18)
    }
  })

  it('le chapitre 1 reste un tutoriel : on le gagne', () => {
    // 1-1 et 1-2 sont mesurés SANS équipement : un nouveau joueur n'a aucune
    // pièce avant le premier passage de l'étage 3. Supposé équipé, 1-1 était
    // tombé à 2 % pour lui (2026-10-08).
    expect(campaignProfile(1, 1).pieces).toEqual([])
    expect(campaignProfile(1, 2).pieces).toEqual([])
    for (const index of [1, 2, 5, 9]) {
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

})
