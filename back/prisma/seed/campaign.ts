import type { PrismaClient } from '../../src/generated/client'

// Enemy baseline sits slightly BELOW a level-1 COMMON player card
// (100/10/5/90) so a starter team can clear stage 1-1 and start earning gold.
// Difficulty scales ×1.18 per stage inside a chapter and ×2.0 per chapter,
// so chapter 2 opens roughly at the power level of the chapter 1 boss.
const ENEMY_BASE = { baseHp: 80, baseAtk: 8, baseDef: 4, baseSpd: 85 }

// Balance de difficulté. Montée intra-chapitre raide (×1.18/stage) pour que
// lever ses persos compte ; saut inter-chapitre adouci (×2.0) pour éviter le
// mur au changement de chapitre. Boss = check de build : PV ×2.75 + AOE_3
// (frappe toute l'équipe). L'AOE sur un solo est brutal, donc l'atk n'est PAS
// gonflée (×1.0) — calibré par simulation pour un seuil de victoire ≈ stage 9
// +11 % (un joueur qui vient de finir les 1-9 doit se gear un peu). Baisser
// ces mults rend le boss plus souple ; l'ancien ×4 PV / ×1.5 atk était
// invincible même à 2× la puissance affichée.
const CHAPTER_MULT = 2.0
const STAGE_MULT = 1.18
const BOSS_HP_MULT = 2.75
const BOSS_ATK_MULT = 1.0

// First-clear recalé sur la difficulté : base modeste, ramp ×1.18/stage, et
// montée inter-chapitre plus douce (×1.5) que la difficulté (progresser reste
// optimal, farmer un vieux chapitre reste digne). Équipement garanti à partir
// de 1-3 (1-1/1-2 trop faciles).
const FIRST_CLEAR_GOLD_BASE = 120
const FIRST_CLEAR_DUST_BASE = 30
const FIRST_CLEAR_XP_BASE = 22

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
  const mult = CHAPTER_MULT ** (chapter - 1) * STAGE_MULT ** (stageIndex - 1)
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
      baseAtk: Math.round(p.baseAtk * BOSS_ATK_MULT),
      baseDef: Math.round(p.baseDef * 1.2),
      baseSpd: 100,
      level: 1,
      palier: 1,
      attackPattern: 'AOE_3',
      appearance: looks[0],
    },
  ]
}

// Le butin farm scale ×1,5 par chapitre (la difficulté scale ×2,0 : progresser
// reste optimal, farmer un vieux chapitre reste digne). Spec §4b.
export function lootTableNormal(chapter: number, stageIndex: number) {
  const m = 1.5 ** (chapter - 1)
  const stageRamp = STAGE_MULT ** (stageIndex - 1)
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
    gold: Math.round(FIRST_CLEAR_GOLD_BASE * stageRamp * m),
    dust: Math.round(FIRST_CLEAR_DUST_BASE * stageRamp * m),
    xp: Math.round(FIRST_CLEAR_XP_BASE * stageRamp * m),
  }
  // Équipement garanti seulement à partir de 1-3.
  if (stageIndex >= 3) {
    firstClear.guaranteedEquipment = { minRarity }
  }

  return {
    firstClear,
    farm: {
      gold: Math.round((40 + 10 * stageIndex) * m),
      dust: Math.round((3 + stageIndex) * m),
      xp: Math.round((5 + stageIndex) * m),
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
  const stage9 = lootTableNormal(chapter, 9)
  return {
    firstClear: {
      gold: Math.round(5000 * m),
      dust: Math.round(1000 * m),
      xp: Math.round(200 * m),
      guaranteedEquipment: { minRarity: 'RARE' },
      guaranteedCard: { minRarity: chapter <= 3 ? 'RARE' : 'EPIC' },
    },
    farm: {
      gold: Math.round(stage9.farm.gold * 2.5),
      dust: Math.round(stage9.farm.dust * 2.5),
      xp: Math.round(stage9.farm.xp * 2.5),
      equipmentDropChance: 0.3,
      equipmentWeights: { UNCOMMON: 40, RARE: 40, EPIC: 18, LEGENDARY: 2 },
      cardChance: 0.02,
    },
  }
}

const CHAPTER_COUNT = 5
const STAGES_PER_CHAPTER = 10

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
