/**
 * One-time migration: shift from per-day milestones to default + overrides.
 *
 * Run with: npx tsx prisma/migrations/migrate-streak-redesign.ts
 *
 * Idempotent: safe to run multiple times.
 */
import { PrismaPg } from '@prisma/adapter-pg'
import { config } from 'dotenv'
import { PrismaClient } from '../../src/generated/client'

config()
config({ path: '.env.local', override: true })

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Running streak redesign migration…')

  await prisma.$transaction(async (tx) => {
    // 1. Deactivate non-milestone rows (days 1, 2, 4, 5, 6)
    const deactivated = await tx.streakMilestone.updateMany({
      where: { day: { in: [1, 2, 4, 5, 6] } },
      data: { isActive: false },
    })
    console.log(`  Deactivated ${deactivated.count} non-milestone rows.`)

    // 2. Insert or skip default daily reward (day = 0)
    const existing = await tx.streakMilestone.findFirst({ where: { day: 0 } })
    if (!existing) {
      const reward = await tx.reward.create({ data: { tokens: 2, dust: 3, xp: 5 } })
      await tx.streakMilestone.create({
        data: { day: 0, isMilestone: false, isActive: true, rewardId: reward.id },
      })
      console.log('  Inserted day=0 default daily reward.')
    } else {
      console.log('  day=0 row already exists, skipping.')
    }

    // 3. Days 3, 7, 14, 30 already correct — no change needed
    console.log('  Milestone days (3, 7, 14, 30) unchanged.')
  })

  console.log('Migration complete.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
