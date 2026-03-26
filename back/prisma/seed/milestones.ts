import type { PrismaClient } from '../../src/generated/client'

const MILESTONES = [
  { day: 1,  tokens: 3,  dust: 5,  xp: 10, isMilestone: false },
  { day: 2,  tokens: 4,  dust: 6,  xp: 12, isMilestone: false },
  { day: 3,  tokens: 5,  dust: 8,  xp: 15, isMilestone: true  },
  { day: 4,  tokens: 4,  dust: 6,  xp: 12, isMilestone: false },
  { day: 5,  tokens: 4,  dust: 6,  xp: 12, isMilestone: false },
  { day: 6,  tokens: 4,  dust: 6,  xp: 12, isMilestone: false },
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

  console.log(`  ${MILESTONES.length} streak milestones créés`)
}
