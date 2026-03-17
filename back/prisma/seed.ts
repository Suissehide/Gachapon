import { PrismaPg } from '@prisma/adapter-pg'
import { config } from 'dotenv'

import { PrismaClient } from '../src/generated/client'
import { seedAchievements } from './seed/achievements'
import { seedCards } from './seed/cards'
import { seedGlobalConfig } from './seed/global-config'
import { seedQuests } from './seed/quests'
import { seedShop } from './seed/shop'

// Load .env then .env.local (local overrides)
config()
config({ path: '.env.local' })

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Seeding database…')

  await prisma.$transaction(async (tx) => {
    await seedCards(tx)
    await seedShop(tx)
    await seedQuests(tx)
    await seedAchievements(tx)
    await seedGlobalConfig(tx)
  })

  console.log('Seed done.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
