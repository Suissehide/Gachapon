import type { PrismaClient } from '../../src/generated/client'
import { ACHIEVEMENT_DEFINITIONS } from '../../src/main/domain/content/achievements.definitions'

type Tx = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0]

/**
 * Écrit les succès. Les données elles-mêmes vivent dans
 * `src/main/domain/content/achievements.definitions.ts` : elles sont
 * partagées avec le backfill de traductions, qui est du code de production.
 */
export async function seedAchievements(tx: Tx) {
  for (const entry of ACHIEVEMENT_DEFINITIONS) {
    const rewardData = {
      tokens: entry.reward.tokens,
      dust: entry.reward.dust,
      xp: entry.reward.xp,
      cardRarity: entry.reward.cardRarity ?? null,
    }
    await tx.achievement.upsert({
      where: { key: entry.key },
      create: {
        key: entry.key,
        nameFr: entry.nameFr,
        nameEn: entry.nameEn,
        descriptionFr: entry.descriptionFr,
        descriptionEn: entry.descriptionEn,
        family: entry.family,
        tier: entry.tier,
        hidden: entry.hidden,
        sortOrder: entry.sortOrder,
        isActive: true,
        criterion: entry.criterion,
        reward: { create: rewardData },
      },
      update: {
        nameFr: entry.nameFr,
        nameEn: entry.nameEn,
        descriptionFr: entry.descriptionFr,
        descriptionEn: entry.descriptionEn,
        family: entry.family,
        tier: entry.tier,
        hidden: entry.hidden,
        sortOrder: entry.sortOrder,
        isActive: true,
        criterion: entry.criterion,
        reward: { update: rewardData },
      },
    })
  }
}
