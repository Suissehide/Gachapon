import type { PrismaClient } from '../../src/generated/client'

// Enemy baseline sits slightly BELOW a level-1 COMMON player card
// (100/10/5/90) so a starter team can clear stage 1-1 and start earning gold.
// Difficulty scales with stage index inside a chapter (×1.12 per stage) and
// with chapter number (×2.5 per chapter), so chapter 2 opens roughly at the
// power level of the chapter 1 boss.
const ENEMY_BASE = { baseHp: 80, baseAtk: 8, baseDef: 4, baseSpd: 85 }

function enemyPower(chapter: number, stageIndex: number) {
  const mult =
    Math.pow(2.5, chapter - 1) * Math.pow(1.12, stageIndex - 1)
  return {
    baseHp: Math.round(ENEMY_BASE.baseHp * mult),
    baseAtk: Math.round(ENEMY_BASE.baseAtk * mult),
    baseDef: Math.round(ENEMY_BASE.baseDef * mult),
    baseSpd: ENEMY_BASE.baseSpd,
  }
}

function normalEnemyTeam(chapter: number, stageIndex: number) {
  const p = enemyPower(chapter, stageIndex)
  return [
    { ...p, level: 1, palier: 1, attackPattern: 'BASIC' },
    { ...p, level: 1, palier: 1, attackPattern: 'BASIC' },
    { ...p, level: 1, palier: 1, attackPattern: 'BASIC' },
  ]
}

function bossEnemyTeam(chapter: number, stageIndex: number) {
  const p = enemyPower(chapter, stageIndex)
  return [
    {
      baseHp: p.baseHp * 5,
      baseAtk: Math.round(p.baseAtk * 1.5),
      baseDef: Math.round(p.baseDef * 1.2),
      baseSpd: 100,
      level: 1,
      palier: 1,
      attackPattern: 'AOE_3',
    },
  ]
}

// Le butin scale ×1,5 par chapitre (la difficulté scale ×2,5 : progresser
// reste optimal, farmer un vieux chapitre reste digne). Spec §4b.
function lootTableNormal(chapter: number, stageIndex: number) {
  const m = Math.pow(1.5, chapter - 1)
  const minRarity = stageIndex <= 3 ? 'COMMON' : 'UNCOMMON'
  const farmWeights =
    stageIndex <= 3
      ? { COMMON: 80, UNCOMMON: 20 }
      : stageIndex <= 6
      ? { COMMON: 60, UNCOMMON: 30, RARE: 10 }
      : { COMMON: 50, UNCOMMON: 35, RARE: 15 }
  const t = (stageIndex - 1) / 8

  return {
    firstClear: {
      gold: Math.round((150 + 80 * stageIndex) * m),
      dust: Math.round((40 + 15 * stageIndex) * m),
      xp: Math.round((30 + 3 * stageIndex) * m),
      guaranteedEquipment: { minRarity },
    },
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

function bossLoot(chapter: number) {
  const m = Math.pow(1.5, chapter - 1)
  const stage9 = lootTableNormal(chapter, 9)
  return {
    firstClear: {
      gold: Math.round(5000 * m),
      dust: Math.round(1000 * m),
      xp: Math.round(200 * m),
      guaranteedEquipment: { minRarity: 'RARE' },
      guaranteedCard: { minRarity: 'EPIC' },
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

const CHAPTER_COUNT = 3
const STAGES_PER_CHAPTER = 10

export async function seedCampaign(
  tx: Parameters<Parameters<PrismaClient['$transaction']>[0]>[0],
) {
  let order = 0
  for (let chapter = 1; chapter <= CHAPTER_COUNT; chapter++) {
    for (let i = 1; i <= STAGES_PER_CHAPTER; i++) {
      order += 1
      const isBoss = i === STAGES_PER_CHAPTER
      await tx.campaignStage.create({
        data: {
          chapter,
          index: i,
          label: isBoss ? `${chapter}-${i} Boss` : `${chapter}-${i}`,
          isBoss,
          enemyTeam: isBoss
            ? bossEnemyTeam(chapter, i)
            : normalEnemyTeam(chapter, i),
          lootTable: isBoss ? bossLoot(chapter) : lootTableNormal(chapter, i),
          order,
        },
      })
    }
    console.log(
      `  Campaign chapter ${chapter} : ${STAGES_PER_CHAPTER} stages created`,
    )
  }
}
