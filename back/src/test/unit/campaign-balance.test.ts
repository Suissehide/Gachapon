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
  CHAPTER_COUNT,
  curvePosition,
  difficultyMult,
  enemyPower,
  RARITY_BASE,
  enemyScale,
  lootTableNormal,
  normalEnemyTeam,
  referenceChapter,
  STAGES_PER_CHAPTER,
} from '../../main/domain/content/campaign.definitions'

const TOTAL_STAGES = CHAPTER_COUNT * STAGES_PER_CHAPTER
const chapitres = Array.from({ length: CHAPTER_COUNT }, (_, i) => i + 1)
const etagesNormaux = [1, 2, 3, 4, 5, 6, 7, 8, 9]
/** Chapitre et étage d'un numéro d'étage global. */
const coord = (n: number) =>
  [
    Math.ceil(n / STAGES_PER_CHAPTER),
    ((n - 1) % STAGES_PER_CHAPTER) + 1,
  ] as const

describe('enemyPower — aligné sur le joueur attendu (rareté + enemyScale)', () => {
  it('stage 1-1 : valeur ancre exacte (ancre 133 PV, NORMAL_FACTOR=0.971)', () => {
    // rb = COMMON {124,24,14,89}, scale = 133 / 124 (première ancre de PV,
    // fittée sur un joueur SANS équipement), NORMAL_FACTOR = 0,971.
    // hp: 133×0.971 = 129.1 → 129 ; atk: 24×0.971×1.0726 = 25.0 → 25
    // def: 14×0.971×1.0726 = 14.6 → 15 ; spd: 89 tel quel — la vitesse
    // échappe au facteur ET à l'échelle, elle reste la base de rareté.
    expect(enemyPower(1, 1)).toEqual({
      baseHp: 129,
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
    expect(enemyPower(CHAPTER_COUNT, 9).baseSpd).toBe(RARITY_BASE.EPIC.spd)
  })

  it('les PV sont STRICTEMENT croissants sur toute la campagne', () => {
    let prevHp = -1
    for (let n = 1; n <= TOTAL_STAGES; n++) {
      const hp = enemyPower(...coord(n)).baseHp
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
    expect(enemyScale(1)).toBeCloseTo(133 / RARITY_BASE.COMMON.hp, 10)
  })

  it('aucune marche : PV des étages normaux, frontières de chapitre comprises', () => {
    // La courbe ne saute pas au changement de chapitre : un joueur qui suit
    // la progression attendue ne rencontre pas de mur. Une frontière franchit
    // DEUX étages (le boss est entre les deux) : ×1,35 au plus.
    const hp = (n: number) => enemyPower(...coord(n)).baseHp
    for (let n = 2; n <= TOTAL_STAGES; n++) {
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
    // …et ces valeurs restent celles d'un boss de tutoriel.
    expect(boss.baseHp).toBeGreaterThan(800)
    expect(boss.baseHp).toBeLessThan(1400)
  })

  it('pour chaque chapitre : solo, AOE_3, PV > ennemi normal du stage 9', () => {
    for (const chapter of chapitres) {
      const bosses = bossEnemyTeam(chapter, 10)
      const normals = normalEnemyTeam(chapter, 9)
      expect(bosses).toHaveLength(1)
      expect(bosses[0].attackPattern).toBe('AOE_3')
      expect(bosses[0].baseHp).toBeGreaterThan(normals[0].baseHp)
    }
  })
})

describe('lootTableNormal — butin lissé sur la difficulté', () => {
  it('premier passage = barème × difficulté^0,75 × 81/135 (total de référence)', () => {
    // Les 135 étages normaux paient ce que payaient les 81 de la campagne de
    // référence : chaque premier passage en touche la part 81/135.
    for (const [c, i] of [[1, 1], [4, 6], [CHAPTER_COUNT, 9]] as const) {
      const fc = lootTableNormal(c, i).firstClear
      const echelle = difficultyMult(c, i) ** 0.75 * (81 / 135)
      expect(fc.gold).toBe(Math.round(120 * echelle))
      expect(fc.dust).toBe(Math.round(30 * echelle))
      expect(fc.xp).toBe(Math.round(7 * echelle))
    }
  })

  it('pas d’équipement garanti avant la position 3 de la courbe', () => {
    for (let n = 1; curvePosition(n) < 3; n++) {
      expect(lootTableNormal(...coord(n)).firstClear.guaranteedEquipment).toBe(
        undefined,
      )
    }
    expect(lootTableNormal(1, 5).firstClear.guaranteedEquipment).toEqual({
      minRarity: 'COMMON',
    })
  })

  it('autant de pièces garanties que la campagne de référence (88)', () => {
    // 79 étages normaux (3 à 89) + 9 boss dans la campagne de référence.
    let pieces = 0
    for (let n = 1; n <= TOTAL_STAGES; n++) {
      const [c, i] = coord(n)
      const fc =
        i === STAGES_PER_CHAPTER
          ? bossLoot(c).firstClear
          : lootTableNormal(c, i).firstClear
      if (fc.guaranteedEquipment) {
        pieces++
      }
    }
    expect(pieces).toBe(88)
  })

  // Le défaut que la linéarisation corrige : tout dépendait de `stageIndex`,
  // donc se réinitialisait à chaque chapitre — 9-3 lâchait le même butin que
  // 1-3, et le plancher COMMON ne tombait que sur l'index 3.
  it('le plancher de premier passage progresse sur la campagne entière', () => {
    const ordre = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC']
    const planchers: number[] = []
    for (let n = 1; n <= TOTAL_STAGES; n++) {
      const [c, i] = coord(n)
      const plancher =
        i === STAGES_PER_CHAPTER
          ? undefined
          : lootTableNormal(c, i).firstClear.guaranteedEquipment?.minRarity
      if (plancher) {
        planchers.push(ordre.indexOf(plancher))
      }
    }
    expect(planchers[0]).toBe(0)
    expect(planchers[planchers.length - 1]).toBe(3)
    for (let k = 1; k < planchers.length; k++) {
      expect(planchers[k]).toBeGreaterThanOrEqual(planchers[k - 1] ?? 0)
    }
  })

  it('les communes décroissent strictement du début à la fin de la campagne', () => {
    const communes: number[] = []
    for (const c of chapitres) {
      for (const i of etagesNormaux) {
        communes.push(lootTableNormal(c, i).farm.equipmentWeights.COMMON ?? 0)
      }
    }
    for (let n = 1; n < communes.length; n++) {
      expect(communes[n]).toBeLessThan(communes[n - 1])
    }
    expect(communes[0]).toBe(90)
    // Les communes s'éteignent au bout de la campagne au lieu de se réarmer
    // à chaque chapitre.
    expect(communes[communes.length - 1]).toBeLessThanOrEqual(1)
    expect(
      lootTableNormal(CHAPTER_COUNT, 10).farm.equipmentWeights.COMMON ?? 0,
    ).toBe(0)
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
    for (const chapter of chapitres) {
      const atBossStage = lootTableNormal(chapter, 10).farm
      const boss = bossLoot(chapter).farm
      expect(boss.gold).toBe(Math.round(atBossStage.gold * 1.25))
      expect(boss.dust).toBe(Math.round(atBossStage.dust * 1.25))
      expect(boss.xp).toBe(Math.round(atBossStage.xp * 1.25))
    }
  })

  it('en début de campagne, le farm d’un boss est rattrapé au chapitre d’après', () => {
    // Un ancien ×2,5 rendait le boss 2-10 plus rentable que TOUT le chapitre
    // 3. En fin de campagne la courbe de butin s'aplatit et la prime ×1,25
    // demande plus d'un chapitre pour être rattrapée : c'est voulu, le boss
    // y est aussi le combat le plus dur.
    for (let chapter = 1; chapter <= 3; chapter++) {
      expect(lootTableNormal(chapter + 1, 9).farm.dust).toBeGreaterThanOrEqual(
        bossLoot(chapter).farm.dust,
      )
    }
  })

  it('les 15 boss rapportent ce que rapportaient les 9 de référence', () => {
    // Référence : 1650 or × 1,5^(k-1), k = 1..9.
    let reference = 0
    for (let k = 1; k <= 9; k++) {
      reference += 1650 * 1.5 ** (k - 1)
    }
    const total = chapitres.reduce((s, c) => s + bossLoot(c).firstClear.gold, 0)
    expect(total / reference).toBeCloseTo(1, 2)
  })

  it('cartes garanties : 3 rares, 5 épiques, 1 légendaire au boss final', () => {
    const cartes = chapitres
      .map((c) => bossLoot(c).firstClear.guaranteedCard?.minRarity)
      .filter((r) => r !== undefined)
    expect(cartes).toEqual([
      'RARE',
      'RARE',
      'RARE',
      'EPIC',
      'EPIC',
      'EPIC',
      'EPIC',
      'EPIC',
      'LEGENDARY',
    ])
    expect(bossLoot(CHAPTER_COUNT).firstClear.guaranteedCard).toEqual({
      minRarity: 'LEGENDARY',
    })
    expect(bossLoot(1).firstClear.guaranteedEquipment).toEqual({
      minRarity: 'RARE',
    })
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
    for (const chapter of chapitres) {
      for (const index of etagesNormaux) {
        const team = normalEnemyTeam(chapter, index)
        expect(team).toHaveLength(3)
        for (const e of team) {
          expect(ELEMENTS).toContain(e.element)
        }
      }
    }
  })

  it('le boss de chaque chapitre porte l’élément de son chapitre', () => {
    for (const chapter of chapitres) {
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
    for (const chapter of chapitres) {
      for (const index of etagesNormaux) {
        for (const e of normalEnemyTeam(chapter, index)) {
          const slug = e.appearance.split('/')[1]
          expect(e.element).toBe(FAMILY_ELEMENTS[slug])
        }
      }
    }
  })
})

describe('boss de chapitre', () => {
  it('chaque boss a un élément absent des mobs de son chapitre', () => {
    expect(BOSS_ELEMENT_BY_CHAPTER).toHaveLength(CHAPTER_COUNT)
    for (const chapter of chapitres) {
      const bossElement = BOSS_ELEMENT_BY_CHAPTER[chapter - 1]
      if (!bossElement) {
        throw new Error(`Pas d'élément de boss pour le chapitre ${chapter}`)
      }
      expect(ELEMENTS).toContain(bossElement)
      const mobElements = new Set(
        etagesNormaux.flatMap((index) =>
          normalEnemyTeam(chapter, index).map((e) => e.element),
        ),
      )
      expect(mobElements.has(bossElement)).toBe(false)
    }
  })

  it('tous les chapitres sauf le 5 présentent 3 éléments DISTINCTS par étage', () => {
    for (const chapter of chapitres.filter((c) => c !== 5)) {
      for (const index of etagesNormaux) {
        const els = normalEnemyTeam(chapter, index).map((e) => e.element)
        expect(new Set(els).size).toBe(3)
      }
    }
  })

  it('sprites de boss distincts, existants, jamais ceux du raid (BOSS-010..013)', () => {
    const sprites = chapitres.map((c) => bossEnemyTeam(c, 10)[0].appearance)
    expect(new Set(sprites).size).toBe(CHAPTER_COUNT)
    for (const sprite of sprites) {
      const numero = Number(sprite.match(/BOSS-(\d{3})$/)?.[1])
      expect(numero).toBeGreaterThanOrEqual(1)
      expect(numero).toBeLessThanOrEqual(19)
      expect(numero >= 10 && numero <= 13).toBe(false)
    }
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
    const boss = bossEnemyTeam(CHAPTER_COUNT, 10)[0]
    expect(boss.mitigationScale).toBeCloseTo(
      enemyScale(TOTAL_STAGES) * bossGearCompensation(CHAPTER_COUNT),
      6,
    )
  })

  it('la réduction de dégâts d un ennemi ne dérive pas avec le chapitre', () => {
    const reduction = (chapitre: number, etage: number) => {
      const e = normalEnemyTeam(chapitre, etage)[0]
      const k = 100 * e.mitigationScale
      return 1 - k / (k + e.baseDef)
    }
    // 8-5 et 15-9 sont tous deux en base EPIC (RARITY_BY_CHAPTER) : à
    // rareté égale, la réduction ne doit pas dériver avec l'étage global
    // malgré la DEF ×3 de la fin de campagne. Une rareté différente n'est PAS
    // comparable : ce n'est pas le même monstre.
    expect(reduction(CHAPTER_COUNT, 9)).toBeCloseTo(reduction(8, 5), 2)
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
    // Le chapitre de référence 1 est exclu : c'est un tutoriel, volontairement
    // gagné.
    //
    // Certains étages sont PLUS FACILES que la cible par construction, et
    // documentés comme tels sur NORMAL_HP_ANCHORS : ceux du chapitre de
    // référence 5 (deux familles seulement, la mesure y réclame ×1,8 d'un
    // coup que le plafond de pas refuse) et le début du 6 (joueur qui stagne,
    // mesure décroissante). Le plafond haut ne s'y applique pas ; le
    // plancher, si.
    for (const chapitre of chapitres) {
      for (const index of [1, 5, 9]) {
        const position = curvePosition(
          (chapitre - 1) * STAGES_PER_CHAPTER + index,
        )
        if (referenceChapter(position) === 1) {
          continue
        }
        const mesure = campaignWinRate({ chapter: chapitre, index, runs: 60 })
        expect(mesure).toBeGreaterThanOrEqual(CAMPAIGN_TARGETS.normal - 0.18)
        const plusFacile = position >= 40.5 && position <= 52.5
        if (!plusFacile) {
          expect(mesure).toBeLessThanOrEqual(CAMPAIGN_TARGETS.normal + 0.12)
        }
      }
    }
  })

  it('chaque boss tient la sienne', () => {
    // Le boss 1-10 est exclu : boss de tutoriel, volontairement gagné.
    for (const chapitre of chapitres.slice(1)) {
      const mesure = campaignWinRate({ chapter: chapitre, index: 10, runs: 60 })
      expect(mesure).toBeGreaterThanOrEqual(CAMPAIGN_TARGETS.boss - 0.18)
      expect(mesure).toBeLessThanOrEqual(CAMPAIGN_TARGETS.boss + 0.18)
    }
  })

  it('le chapitre 1 reste un tutoriel : on le gagne', () => {
    // 1-1 et 1-2 sont mesurés SANS équipement : un nouveau joueur n'a aucune
    // pièce avant le premier passage de l'étage 3.
    expect(campaignProfile(1, 1).pieces).toEqual([])
    expect(campaignProfile(1, 2).pieces).toEqual([])
    for (const index of [1, 2, 5, 9]) {
      expect(campaignWinRate({ chapter: 1, index, runs: 60 })).toBeGreaterThan(
        0.85,
      )
    }
  })

  it('le farm suit la position sur la courbe, pas l’étage', () => {
    // Le butin de campagne passe par `difficultyMult` (CURVE_A/CURVE_B), une
    // courbe INDÉPENDANTE de `enemyScale` : recalibrer la difficulté ne touche
    // pas l'économie. Le boss final est à la position 90, comme le 9-10 de la
    // campagne de référence.
    expect(lootTableNormal(1, 1).farm.gold).toBe(50)
    expect(lootTableNormal(CHAPTER_COUNT, 10).farm.gold).toBe(
      Math.round(50 * ((1 + 0.08 * 89) ** 2.5) ** 0.585),
    )
  })

})
