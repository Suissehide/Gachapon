import { PrismaPg } from '@prisma/adapter-pg'
import { config } from 'dotenv'

import { PrismaClient } from '../src/generated/client'

// Load .env then .env.local (local overrides)
config()
config({ path: '.env.local', override: true })

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

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

async function main() {
  for (const m of MILESTONES) {
    const reward = await prisma.reward.create({
      data: { tokens: m.tokens, dust: m.dust, xp: m.xp },
    })
    await prisma.streakMilestone.upsert({
      where: { day: m.day },
      update: { isMilestone: m.isMilestone, rewardId: reward.id, isActive: true },
      create: { day: m.day, isMilestone: m.isMilestone, rewardId: reward.id },
    })
    console.log(`Seeded day ${m.day}`)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
