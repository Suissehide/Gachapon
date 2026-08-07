import type { PrismaClient } from '../../src/generated/client'
import { MAX_PALIER } from '../../src/main/domain/card-leveling/card-leveling.domain'
import type { Element } from '../../src/main/domain/combat/element'

const CHAPTER_COUNT = 5
const STAGES_PER_CHAPTER = 10

// Courbe de difficulté CONTINUE et CONCAVE sur le n° de stage global
// n = (chapitre-1)×10 + index (1..50) : mult(n) = (1 + 0.08·(n-1))^2.5.
// Utilisée UNIQUEMENT pour le BUTIN (loot) — plus pour les stats ennemies.
const CURVE_A = 0.08
const CURVE_B = 2.5

// Progression joueur attendue par chapitre : l'ennemi s'y aligne (base de rareté
// + niveau + palier) pour que ses stats ET sa vitesse scalent comme le joueur
// sous l'ATB. Valeurs = médianes du roster (prisma/seed/cards.ts).
const RARITY_BASE = {
  COMMON: { hp: 105, atk: 10, def: 5, spd: 92 },
  UNCOMMON: { hp: 137, atk: 15, def: 7, spd: 99 },
  RARE: { hp: 195, atk: 21, def: 10, spd: 104 },
  EPIC: { hp: 331, atk: 35, def: 16, spd: 92 },
  LEGENDARY: { hp: 591, atk: 53, def: 29, spd: 107 },
} as const
const RARITY_BY_CHAPTER = [
  'COMMON',
  'UNCOMMON',
  'RARE',
  'EPIC',
  'LEGENDARY',
] as const

// Ennemi normal = base joueur × NORMAL_FACTOR. Conservé à 0.971 lors de la
// refonte du 2026-08-07 : la courbe lissée durcit la campagne d'environ 17 %
// au stage 5-10, et cette hausse est VOULUE. La sim mesure un régime
// doublement pessimiste (elle attribue les éléments du joueur sans regarder
// ceux des ennemis, donc « joueur qui ne contre-pick pas », et tourne avec
// equipment: [] des deux côtés), alors que le contre-pick vaut ×1.3 en dégâts
// et que le budget d'équipement est appelé à croître.
const NORMAL_FACTOR = 0.971
const BOSS_FACTOR = 0.92 // boss (avant ×PV et AOE)

// --- Courbe de difficulté : continue, en deux phases -----------------------
//
// Phase 1 (étages 1-70) — le joueur progresse par le NIVEAU.
//   L'ascension ennemie est continue sur l'étage global (plus de marche aux
//   frontières de chapitre) et avance un peu plus vite que celle du joueur :
//   0.105/étage contre 0.10, soit un palier tous les 9.5 étages au lieu de 10.
//   Comme le joueur ascensionne EN BLOC au changement de chapitre, l'écart
//   repart près de zéro à chaque chapitre puis monte jusqu'au boss — qui est
//   donc le point haut de son chapitre, par construction.
//
// Phase 2 (étages 71-90) — le joueur est au plafond, il progresse par
//   l'ÉQUIPEMENT. L'ascension ennemie est figée (elle sature à l'étage
//   10 × MAX_PALIER) et le gain de niveau est divisé par deux : l'amplitude
//   d'un chapitre tombe de ~14 à ~6 points.
const ENEMY_STAT_GROWTH_PER_LEVEL = 0.06
const ENEMY_GROWTH_LATE = 0.03
const ENEMY_ASCENSION_BONUS = 0.15
const ENEMY_ASCENSION_PER_STAGE = 0.105
const PLAYER_CAP_STAGE = 10 * MAX_PALIER // 70

/** Multiplicateur de stats ennemies à un étage global (1..90). */
export function enemyScale(globalStageNumber: number): number {
  const capped = Math.min(globalStageNumber, PLAYER_CAP_STAGE)
  const overflow = Math.max(0, globalStageNumber - PLAYER_CAP_STAGE)
  const level =
    1 +
    ENEMY_STAT_GROWTH_PER_LEVEL * (capped - 1) +
    ENEMY_GROWTH_LATE * overflow
  const ascension =
    (1 + ENEMY_ASCENSION_BONUS) ** (ENEMY_ASCENSION_PER_STAGE * (capped - 1))
  return level * ascension
}

// Boss = check de build : PV ×3.25 + AOE_3 (frappe toute l'équipe, threat ×7
// dans la jauge affichée). L'atk n'est PAS gonflée (×1.0) : l'AOE sur un solo
// est déjà brutal. Calibré par simulation sous la courbe lissée : seuil de
// victoire ≈ stage 9 +2 à +5 niveaux selon le chapitre (×3.75 créait un mur
// de +15 niveaux au boss final, ×2.75 ne dépassait plus le stage 9).
const BOSS_HP_MULT = 3.25

// Le butin scale comme mult^exp avec exp < 1 : la difficulté croît plus vite
// que le butin, donc progresser reste optimal et farmer un vieux stage reste
// digne. 0.585 = ln(1.5)/ln(2), le même ratio farm/difficulté que l'ancien
// couple ×1.5 butin / ×2 difficulté par chapitre. First-clear un peu plus
// généreux (0.75) : récompense one-shot, elle finance la montée en niveau.
const FARM_EXP = 0.585
const FIRST_CLEAR_EXP = 0.75
const FARM_GOLD_BASE = 50
const FARM_DUST_BASE = 4
const FARM_XP_BASE = 6
const FIRST_CLEAR_GOLD_BASE = 120
const FIRST_CLEAR_DUST_BASE = 30
const FIRST_CLEAR_XP_BASE = 22

// Prime de farm du boss par rapport à un stage normal de même position.
// Alignée sur son surcoût de difficulté réel (+2 à +5 niveaux requis, fight
// mono-cible) — l'ancien ×2.5 rendait le boss N-10 plus rentable que TOUS les
// stages normaux du chapitre N+1 (boss 2-10 : 45 dust vs 23 pour un 3-7
// pourtant plus dur), vidant la progression de son intérêt.
const BOSS_FARM_PREMIUM = 1.25

function globalStage(chapter: number, stageIndex: number): number {
  return (chapter - 1) * STAGES_PER_CHAPTER + stageIndex
}

export function difficultyMult(chapter: number, stageIndex: number): number {
  return (1 + CURVE_A * (globalStage(chapter, stageIndex) - 1)) ** CURVE_B
}

// Bestiaire cosmétique. Chaque famille = un dossier MinIO sous cards/monsters/
// contenant PREFIX-001..PREFIX-{count}.png. `slug` = nom du dossier tel qu'uploadé.
type MonsterFamily = { slug: string; prefix: string; count: number }
const FAMILIES: Record<string, MonsterFamily> = {
  slimes: { slug: 'slimes', prefix: 'SLIME', count: 9 },
  champignons: { slug: 'mushrooms', prefix: 'MYCO', count: 3 },
  kobolds: { slug: 'kobolds', prefix: 'KOBO', count: 6 },
  feuxfollets: { slug: 'wisps', prefix: 'WISP', count: 11 },
  gnolls: { slug: 'gnolls', prefix: 'GNOL', count: 12 },
  loups: { slug: 'wolves', prefix: 'WOLF', count: 13 },
  mimics: { slug: 'mimics', prefix: 'MIMC', count: 3 },
  spectres: { slug: 'specters', prefix: 'SPEC', count: 10 },
  elementaires: { slug: 'elementals', prefix: 'ELEM', count: 16 },
  minotaures: { slug: 'minotaurs', prefix: 'MINO', count: 13 },
  basilics: { slug: 'basilisks', prefix: 'BSLK', count: 7 },
  hydres: { slug: 'hydras', prefix: 'HYDRA', count: 5 },
  krakens: { slug: 'krakens', prefix: 'KRAK', count: 12 },
  wyvernes: { slug: 'wyverns', prefix: 'WYVN', count: 18 },
}

// Élément par famille de bestiaire. Une famille = un élément fixe : le joueur
// apprend « les loups sont NATURE » et c'est vrai partout. Comme chaque étage
// tire ses 3 slots dans 3 familles différentes (voir STAGE_LOOKS), les étages
// des chapitres 1-4 présentent naturellement 3 éléments distincts. Exception :
// le chapitre 5 (CHAPTER_FAMILIES) n'a que 2 familles (krakens, wyvernes),
// donc ses étages ne présentent que 2 éléments distincts sur 3 slots.
// Clé = fam.slug (le dossier MinIO), pas la clé française de FAMILIES : c'est
// le slug qui apparaît dans `appearance` et sert de source commune sprite/élément.
export const FAMILY_ELEMENTS: Record<string, Element> = {
  slimes: 'WATER',
  mushrooms: 'NATURE',
  kobolds: 'FIRE',
  wisps: 'LIGHT',
  gnolls: 'DARK',
  wolves: 'NATURE',
  mimics: 'NATURE',
  specters: 'DARK',
  elementals: 'FIRE',
  minotaurs: 'FIRE',
  basilisks: 'EARTH',
  hydras: 'WATER',
  krakens: 'WATER',
  wyverns: 'FIRE',
}

// Élément du boss de chaque chapitre (index 0 = chapitre 1). Chaque fois un
// élément absent des mobs du chapitre : le boss demande un ajustement d'équipe
// plutôt que la compo des 9 étages précédents.
export const BOSS_ELEMENT_BY_CHAPTER: readonly Element[] = [
  'DARK',
  'FIRE',
  'LIGHT',
  'DARK',
  'EARTH',
]

// Familles peuplant chaque chapitre (difficulté croissante), étages 1-9.
const CHAPTER_FAMILIES: string[][] = [
  ['slimes', 'champignons', 'kobolds'],
  ['feuxfollets', 'gnolls', 'loups'],
  ['mimics', 'spectres', 'elementaires'],
  ['minotaures', 'basilics', 'hydres'],
  ['krakens', 'wyvernes'],
]

// Boss (étage 10 de chaque chapitre) : cards/monsters/bosses/BOSS-001..019.
const BOSS_SLUG = 'bosses'
const BOSS_COUNT = 19

// Apparence cosmétique ET élément par étage : clé `${chapter}-${index}`, valeur
// = une entrée par slot d'ennemi. `appearance` = sous-chemin MinIO (sans cards/
// ni .png), `family` = clé dans FAMILY_ELEMENTS (= fam.slug, le dossier MinIO).
// Vrai pour les étages 1-9 : le sprite et l'élément sortent du même tirage et
// ne peuvent pas diverger. Faux pour les boss (étage 10) : leur élément vient
// de BOSS_ELEMENT_BY_CHAPTER, pas de `family` — voir `family` optionnel ci-dessous.
type StageLook = { appearance: string; family?: string }

const STAGE_LOOKS: Record<string, StageLook[]> = (() => {
  const looks: Record<string, StageLook[]> = {}
  const cursor: Record<string, number> = {}
  const nextLook = (famKey: string): StageLook => {
    const fam = FAMILIES[famKey]
    const i = cursor[famKey] ?? 0
    cursor[famKey] = i + 1
    const num = String((i % fam.count) + 1).padStart(3, '0')
    return {
      appearance: `monsters/${fam.slug}/${fam.prefix}-${num}`,
      family: fam.slug,
    }
  }
  CHAPTER_FAMILIES.forEach((fams, ci) => {
    const chapter = ci + 1
    for (let stage = 1; stage <= 9; stage++) {
      looks[`${chapter}-${stage}`] = [0, 1, 2].map((slot) =>
        nextLook(fams[(stage + slot) % fams.length]),
      )
    }
    const bossNum = String(((chapter - 1) % BOSS_COUNT) + 1).padStart(3, '0')
    // Pas de `family` pour le boss : son élément vient de
    // BOSS_ELEMENT_BY_CHAPTER (voir bossEnemyTeam), pas de FAMILY_ELEMENTS.
    looks[`${chapter}-10`] = [
      {
        appearance: `monsters/${BOSS_SLUG}/BOSS-${bossNum}`,
      },
    ]
  })
  return looks
})()

function looksForStage(chapter: number, stageIndex: number): StageLook[] {
  return STAGE_LOOKS[`${chapter}-${stageIndex}`] ?? []
}

export function enemyPower(chapter: number, stageIndex: number) {
  const rb = RARITY_BASE[RARITY_BY_CHAPTER[chapter - 1]]
  const scale = enemyScale(globalStage(chapter, stageIndex))
  return {
    baseHp: Math.round(rb.hp * NORMAL_FACTOR * scale),
    baseAtk: Math.round(rb.atk * NORMAL_FACTOR * scale),
    baseDef: Math.round(rb.def * NORMAL_FACTOR * scale),
    baseSpd: Math.round(rb.spd * scale),
  }
}

export function normalEnemyTeam(chapter: number, stageIndex: number) {
  const p = enemyPower(chapter, stageIndex)
  const looks = looksForStage(chapter, stageIndex)
  return [0, 1, 2].map((slot) => {
    const look = looks[slot]
    if (!look.family) {
      throw new Error(
        `Stage look ${chapter}-${stageIndex} slot ${slot} has no family (normal stages must set one)`,
      )
    }
    return {
      ...p,
      level: 1,
      palier: 1,
      attackPattern: 'BASIC',
      appearance: look.appearance,
      element: FAMILY_ELEMENTS[look.family],
    }
  })
}

export function bossEnemyTeam(chapter: number, stageIndex: number) {
  const rb = RARITY_BASE[RARITY_BY_CHAPTER[chapter - 1]]
  const looks = looksForStage(chapter, stageIndex)
  const scale = enemyScale(globalStage(chapter, stageIndex))
  return [
    {
      baseHp: Math.round(rb.hp * BOSS_HP_MULT * BOSS_FACTOR * scale),
      baseAtk: Math.round(rb.atk * BOSS_FACTOR * scale),
      baseDef: Math.round(rb.def * 1.2 * BOSS_FACTOR * scale),
      baseSpd: Math.round(rb.spd * scale),
      level: 1,
      palier: 1,
      attackPattern: 'AOE_3',
      appearance: looks[0].appearance,
      element: BOSS_ELEMENT_BY_CHAPTER[chapter - 1],
    },
  ]
}

export function lootTableNormal(chapter: number, stageIndex: number) {
  const d = difficultyMult(chapter, stageIndex)
  const farmScale = d ** FARM_EXP
  const firstClearScale = d ** FIRST_CLEAR_EXP
  const minRarity = stageIndex <= 3 ? 'COMMON' : 'UNCOMMON'
  const farmWeights =
    stageIndex <= 3
      ? { COMMON: 80, UNCOMMON: 20 }
      : stageIndex <= 6
        ? { COMMON: 60, UNCOMMON: 30, RARE: 10 }
        : { COMMON: 50, UNCOMMON: 35, RARE: 15 }
  const t = (stageIndex - 1) / 8

  const firstClear: {
    gold: number
    dust: number
    xp: number
    guaranteedEquipment?: { minRarity: string }
  } = {
    gold: Math.round(FIRST_CLEAR_GOLD_BASE * firstClearScale),
    dust: Math.round(FIRST_CLEAR_DUST_BASE * firstClearScale),
    xp: Math.round(FIRST_CLEAR_XP_BASE * firstClearScale),
  }
  // Équipement garanti seulement à partir de 1-3.
  if (stageIndex >= 3) {
    firstClear.guaranteedEquipment = { minRarity }
  }

  return {
    firstClear,
    farm: {
      gold: Math.round(FARM_GOLD_BASE * farmScale),
      dust: Math.round(FARM_DUST_BASE * farmScale),
      xp: Math.round(FARM_XP_BASE * farmScale),
      equipmentDropChance: 0.15 + 0.05 * t,
      equipmentWeights: farmWeights,
      cardChance: 0.005 + 0.005 * t,
    },
  }
}

// Carte garantie des boss : RARE pour les chapitres 1-3, EPIC pour les 4-5.
// 5 boss pour seulement 4 cartes EPIC/LEGENDARY au total : en EPIC partout,
// la campagne offrait quasiment tout le haut de la collection (spec §7).
export function bossLoot(chapter: number) {
  const m = 1.5 ** (chapter - 1)
  const atBossStage = lootTableNormal(chapter, STAGES_PER_CHAPTER)
  return {
    firstClear: {
      // ÷3 (spec 2026-07-20) : l'or des boss finançait ~900 jetons en boutique
      gold: Math.round(1650 * m),
      dust: Math.round(1000 * m),
      xp: Math.round(200 * m),
      guaranteedEquipment: { minRarity: 'RARE' },
      guaranteedCard: { minRarity: chapter <= 3 ? 'RARE' : 'EPIC' },
    },
    farm: {
      gold: Math.round(atBossStage.farm.gold * BOSS_FARM_PREMIUM),
      dust: Math.round(atBossStage.farm.dust * BOSS_FARM_PREMIUM),
      xp: Math.round(atBossStage.farm.xp * BOSS_FARM_PREMIUM),
      equipmentDropChance: 0.3,
      equipmentWeights: { UNCOMMON: 40, RARE: 40, EPIC: 18, LEGENDARY: 2 },
      cardChance: 0.02,
    },
  }
}

export async function seedCampaign(
  tx: Parameters<Parameters<PrismaClient['$transaction']>[0]>[0],
) {
  let order = 0
  for (let chapter = 1; chapter <= CHAPTER_COUNT; chapter++) {
    for (let i = 1; i <= STAGES_PER_CHAPTER; i++) {
      order += 1
      const isBoss = i === STAGES_PER_CHAPTER
      const data = {
        chapter,
        index: i,
        label: isBoss ? `${chapter}-${i} Boss` : `${chapter}-${i}`,
        isBoss,
        enemyTeam: isBoss
          ? bossEnemyTeam(chapter, i)
          : normalEnemyTeam(chapter, i),
        lootTable: isBoss ? bossLoot(chapter) : lootTableNormal(chapter, i),
        order,
      }
      await tx.campaignStage.upsert({
        where: { chapter_index: { chapter, index: i } },
        create: data,
        update: {
          label: data.label,
          isBoss: data.isBoss,
          enemyTeam: data.enemyTeam,
          lootTable: data.lootTable,
          order: data.order,
        },
      })
    }
    console.log(
      `  Campaign chapter ${chapter} : ${STAGES_PER_CHAPTER} stages created`,
    )
  }
}
