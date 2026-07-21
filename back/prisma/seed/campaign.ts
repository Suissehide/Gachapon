import type { PrismaClient } from '../../src/generated/client'

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

const NORMAL_FACTOR = 0.98 // ennemi normal = base joueur × 0.98 (léger avantage joueur)
const BOSS_FACTOR = 0.92 // boss (avant ×PV et AOE)
const ENEMY_STAT_GROWTH_PER_LEVEL = 0.06
const ENEMY_ASCENSION_BONUS = 0.15

function enemyLevelMult(level: number): number {
  return 1 + ENEMY_STAT_GROWTH_PER_LEVEL * (level - 1)
}
function enemyPalierMult(palier: number): number {
  return (1 + ENEMY_ASCENSION_BONUS) ** (palier - 1)
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

// Apparence cosmétique par étage : clé `${chapter}-${index}`, valeur = liste de
// sous-chemins MinIO (sans cards/ ni .png), un par slot d'ennemi. Généré depuis
// FAMILIES/CHAPTER_FAMILIES : chaque étage cycle les images de ses familles pour
// varier les sprites. Étage absent (ou slug/count faux) => pas d'image (fallback).
const STAGE_LOOKS: Record<string, string[]> = (() => {
  const looks: Record<string, string[]> = {}
  const cursor: Record<string, number> = {}
  const nextImage = (famKey: string): string => {
    const fam = FAMILIES[famKey]
    const i = cursor[famKey] ?? 0
    cursor[famKey] = i + 1
    const num = String((i % fam.count) + 1).padStart(3, '0')
    return `monsters/${fam.slug}/${fam.prefix}-${num}`
  }
  CHAPTER_FAMILIES.forEach((fams, ci) => {
    const chapter = ci + 1
    for (let stage = 1; stage <= 9; stage++) {
      looks[`${chapter}-${stage}`] = [0, 1, 2].map((slot) =>
        nextImage(fams[(stage + slot) % fams.length]),
      )
    }
    const bossNum = String(((chapter - 1) % BOSS_COUNT) + 1).padStart(3, '0')
    looks[`${chapter}-10`] = [`monsters/${BOSS_SLUG}/BOSS-${bossNum}`]
  })
  return looks
})()

function looksForStage(chapter: number, stageIndex: number): string[] {
  return STAGE_LOOKS[`${chapter}-${stageIndex}`] ?? []
}

export function enemyPower(chapter: number, stageIndex: number) {
  const rb = RARITY_BASE[RARITY_BY_CHAPTER[chapter - 1]]
  const level = globalStage(chapter, stageIndex) // expected player level 1..50
  const palier = chapter
  const scale = enemyLevelMult(level) * enemyPalierMult(palier)
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
  return [0, 1, 2].map((slot) => ({
    ...p,
    level: 1,
    palier: 1,
    attackPattern: 'BASIC',
    appearance: looks[slot],
  }))
}

export function bossEnemyTeam(chapter: number, stageIndex: number) {
  const rb = RARITY_BASE[RARITY_BY_CHAPTER[chapter - 1]]
  const looks = looksForStage(chapter, stageIndex)
  const level = globalStage(chapter, stageIndex)
  const palier = chapter
  const scale = enemyLevelMult(level) * enemyPalierMult(palier)
  return [
    {
      baseHp: Math.round(rb.hp * BOSS_HP_MULT * BOSS_FACTOR * scale),
      baseAtk: Math.round(rb.atk * BOSS_FACTOR * scale),
      baseDef: Math.round(rb.def * 1.2 * BOSS_FACTOR * scale),
      baseSpd: Math.round(rb.spd * scale),
      level: 1,
      palier: 1,
      attackPattern: 'AOE_3',
      appearance: looks[0],
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
