import type { PrismaClient } from '../../src/generated/client'

const CHAPTER_COUNT = 5
const STAGES_PER_CHAPTER = 10

// Enemy baseline sits slightly BELOW a level-1 COMMON player card
// (100/10/5/90) so a starter team can clear stage 1-1 and start earning gold.
const ENEMY_BASE = { baseHp: 80, baseAtk: 8, baseDef: 4, baseSpd: 85 }

// Courbe de difficulté CONTINUE et CONCAVE sur le n° de stage global
// n = (chapitre-1)×10 + index (1..50) : mult(n) = (1 + 0.08·(n-1))^2.5.
// Croissance relative ≈ +21 %/stage au début puis ~+4 %/stage en fin de jeu —
// calquée sur le coût des niveaux de carte : les premiers niveaux sont bon
// marché (montée rapide possible), chaque niveau devient ensuite cher
// (gold ∝ L^1.6, dust ∝ L^1.4), donc la difficulté ralentit d'autant.
// Remplace l'ancien 2^(chapitre-1) × 1.18^(index-1) qui faisait des dents de
// scie : 3-1 retombait sous 2-6 alors que le boss 2-10 restait le meilleur
// farm — désormais le niveau d'équipe requis est strictement croissant
// (vérifié par simulation : COMMON ~21 au boss 1, EPIC ~41 fin ch.3,
// LÉGENDAIRE ~57 au boss final).
const CURVE_A = 0.08
const CURVE_B = 2.5

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

// Apparence cosmétique par étage : clé `${chapter}-${index}`, valeur = liste
// de sous-chemins MinIO (sans cards/ ni .png), un par slot d'ennemi dans l'ordre.
// Doublons et mélange de familles autorisés. Étage absent => pas d'image.
const STAGE_LOOKS: Record<string, string[]> = {
  '1-1': [
    'monsters/slime/SLI-001',
    'monsters/slime/SLI-001',
    'monsters/slime/SLI-002',
  ],
  '1-2': [
    'monsters/slime/SLI-002',
    'monsters/slime/SLI-002',
    'monsters/slime/SLI-002',
  ],
  '1-10': ['monsters/boss/BOSS-001'],
  '2-10': ['monsters/boss/BOSS-002'],
  '3-10': ['monsters/boss/BOSS-003'],
  '4-10': ['monsters/boss/BOSS-004'],
  '5-10': ['monsters/boss/BOSS-005'],
}

function looksForStage(chapter: number, stageIndex: number): string[] {
  return STAGE_LOOKS[`${chapter}-${stageIndex}`] ?? []
}

export function enemyPower(chapter: number, stageIndex: number) {
  const mult = difficultyMult(chapter, stageIndex)
  return {
    baseHp: Math.round(ENEMY_BASE.baseHp * mult),
    baseAtk: Math.round(ENEMY_BASE.baseAtk * mult),
    baseDef: Math.round(ENEMY_BASE.baseDef * mult),
    baseSpd: ENEMY_BASE.baseSpd,
  }
}

function normalEnemyTeam(chapter: number, stageIndex: number) {
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
  const p = enemyPower(chapter, stageIndex)
  const looks = looksForStage(chapter, stageIndex)
  return [
    {
      baseHp: Math.round(p.baseHp * BOSS_HP_MULT),
      baseAtk: p.baseAtk,
      baseDef: Math.round(p.baseDef * 1.2),
      baseSpd: 100,
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

export function bossLoot(chapter: number) {
  const m = 1.5 ** (chapter - 1)
  const atBossStage = lootTableNormal(chapter, STAGES_PER_CHAPTER)
  return {
    firstClear: {
      gold: Math.round(5000 * m),
      dust: Math.round(1000 * m),
      xp: Math.round(200 * m),
      guaranteedEquipment: { minRarity: 'RARE' },
      guaranteedCard: { minRarity: 'EPIC' },
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
