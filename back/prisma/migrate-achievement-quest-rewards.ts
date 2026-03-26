import { PrismaPg } from '@prisma/adapter-pg'
import { config } from 'dotenv'

import { PrismaClient } from '../src/generated/client'

// Load .env then .env.local (local overrides)
config()
config({ path: '.env.local', override: true })

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

// NOTE: rewardId is intentionally kept nullable (String?) on Achievement and Quest.
// The admin create routes (achievements.router.ts, quests.router.ts) do not include
// rewardId in their Zod schemas, so making the column non-nullable would break new
// achievement/quest creation. Making rewardId required will be addressed in a later
// task when admin reward assignment is implemented.

async function main() {
  const achievements = await prisma.achievement.findMany()
  for (const a of achievements) {
    if (a.rewardId) {
      console.log(`Achievement ${a.key} already migrated`)
      continue
    }
    const reward = await prisma.reward.create({ data: { tokens: 0, dust: 0, xp: 0 } })
    await prisma.achievement.update({ where: { id: a.id }, data: { rewardId: reward.id } })
    console.log(`Migrated achievement ${a.key}`)
  }

  const quests = await prisma.quest.findMany()
  for (const q of quests) {
    if (q.rewardId) {
      console.log(`Quest ${q.key} already migrated`)
      continue
    }
    const reward = await prisma.reward.create({ data: { tokens: 0, dust: 0, xp: 0 } })
    await prisma.quest.update({ where: { id: q.id }, data: { rewardId: reward.id } })
    console.log(`Migrated quest ${q.key}`)
  }

  console.log('Migration complete')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
