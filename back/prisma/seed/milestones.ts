import type { PrismaClient } from '../../src/generated/client'

const MILESTONES = [
  // day = 0 is the fixed daily default (not a special milestone)
  { day: 0,  tokens: 2,  dust: 3,  xp: 5,  isMilestone: false },
  // Milestone overrides — replace the default for these specific days
  { day: 3,  tokens: 5,  dust: 8,  xp: 15, isMilestone: true  },
  { day: 7,  tokens: 8,  dust: 15, xp: 25, isMilestone: true  },
  { day: 14, tokens: 12, dust: 30, xp: 40, isMilestone: true  },
  { day: 30, tokens: 20, dust: 60, xp: 60, isMilestone: true  },
]

export async function seedMilestones(
  tx: Parameters<Parameters<PrismaClient['$transaction']>[0]>[0],
) {
  for (const m of MILESTONES) {
    const reward = await tx.reward.create({
      data: { tokens: m.tokens, dust: m.dust, xp: m.xp },
    })
    await tx.streakMilestone.create({
      data: { day: m.day, isMilestone: m.isMilestone, rewardId: reward.id },
    })
  }

  console.log(`  ${MILESTONES.length} streak milestones créés (1 default + 4 jalons)`)
}
