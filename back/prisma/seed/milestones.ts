import type { PrismaClient } from '../../src/generated/client'
import { STREAK_MILESTONES } from '../../src/main/domain/content/milestones.definitions'

export async function seedMilestones(
  tx: Parameters<Parameters<PrismaClient['$transaction']>[0]>[0],
) {
  for (const m of STREAK_MILESTONES) {
    const reward = await tx.reward.create({
      data: { tokens: m.tokens, dust: m.dust, xp: m.xp },
    })
    await tx.streakMilestone.create({
      data: { day: m.day, isMilestone: m.isMilestone, rewardId: reward.id },
    })
  }

  console.log(
    `  ${STREAK_MILESTONES.length} streak milestones créés (1 default + 4 jalons)`,
  )
}
