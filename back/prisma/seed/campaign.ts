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

function lootTableNormal(stageIndex: number) {
  // Interpolate firstClear gold/dust/xp between 1-1 (200/50/30) and 1-9 (800/180/60)
  const t = (stageIndex - 1) / 8
  const fcGold = Math.round(200 + (800 - 200) * t)
  const fcDust = Math.round(50 + (180 - 50) * t)
  const fcXp = Math.round(30 + (60 - 30) * t)
  const farmGold = Math.round(20 + (80 - 20) * t)
  const farmDust = Math.round(3 + (12 - 3) * t)
  const farmXp = Math.round(3 + (6 - 3) * t)

  const minRarity = stageIndex <= 3 ? 'COMMON' : 'UNCOMMON'
  const farmWeights =
    stageIndex <= 3
      ? { COMMON: 80, UNCOMMON: 20 }
      : stageIndex <= 6
      ? { COMMON: 60, UNCOMMON: 30, RARE: 10 }
      : { COMMON: 50, UNCOMMON: 35, RARE: 15 }

  return {
    firstClear: { gold: fcGold, dust: fcDust, xp: fcXp, guaranteedEquipment: { minRarity } },
    farm: {
      gold: farmGold,
      dust: farmDust,
      xp: farmXp,
      equipmentDropChance: 0.15 + 0.05 * t,
      equipmentWeights: farmWeights,
      cardChance: 0.005 + 0.005 * t,
    },
  }
}

const bossLoot = {
  firstClear: {
    gold: 5000,
    dust: 1000,
    xp: 200,
    guaranteedEquipment: { minRarity: 'RARE' },
    guaranteedCard: { minRarity: 'EPIC' },
  },
  farm: {
    gold: 250,
    dust: 40,
    xp: 12,
    equipmentDropChance: 0.3,
    equipmentWeights: { UNCOMMON: 40, RARE: 40, EPIC: 18, LEGENDARY: 2 },
    cardChance: 0.02,
  },
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
          lootTable: isBoss ? bossLoot : lootTableNormal(i),
          order,
        },
      })
    }
    console.log(
      `  Campaign chapter ${chapter} : ${STAGES_PER_CHAPTER} stages created`,
    )
  }
}
