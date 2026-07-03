import type { PrismaClient } from '../../src/generated/client'

const MILESTONES = [
  { day: 0,  tokens: 2,  dust: 5,   xp: 25,  isMilestone: false },
  { day: 3,  tokens: 5,  dust: 20,  xp: 50,  isMilestone: true  },
  { day: 7,  tokens: 8,  dust: 50,  xp: 100, isMilestone: true  },
  { day: 14, tokens: 12, dust: 120, xp: 200, isMilestone: true  },
  { day: 30, tokens: 20, dust: 300, xp: 400, isMilestone: true  },
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
