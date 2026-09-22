import type { PrismaClient } from '../../src/generated/client'
import {
  bossEnemyTeam,
  bossLoot,
  CHAPTER_COUNT,
  campaignStageLabel,
  lootTableNormal,
  normalEnemyTeam,
  STAGES_PER_CHAPTER,
} from '../../src/main/domain/content/campaign.definitions'

/**
 * Écrit les 90 étages de campagne. Les données elles-mêmes vivent dans
 * `src/main/domain/content/campaign.definitions.ts` : elles sont partagées
 * avec le backfill de traductions, qui est du code de production.
 */
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
        labelFr: campaignStageLabel(chapter, i),
        labelEn: campaignStageLabel(chapter, i),
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
          labelFr: data.labelFr,
          labelEn: data.labelEn,
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
