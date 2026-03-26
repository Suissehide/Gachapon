import { PrismaPg } from '@prisma/adapter-pg'
import { config } from 'dotenv'

import { PrismaClient } from '../src/generated/client'
import { seedAchievements } from './seed/achievements'
import { seedCards } from './seed/cards'
import { seedGlobalConfig } from './seed/global-config'
import { seedMilestones } from './seed/milestones'
import { seedQuests } from './seed/quests'
import { seedShop } from './seed/shop'
import { seedUsers } from './seed/users'

// Load .env then .env.local (local overrides)
config()
config({ path: '.env.local', override: true })

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Seeding database…')

  await prisma.$transaction(async (tx) => {
    // Cleanup — ordre respectant les FK (feuilles d'abord)
    await tx.gachaPull.deleteMany()
    await tx.userCard.deleteMany()
    await tx.purchase.deleteMany()
    await tx.userAchievement.deleteMany()
    await tx.userQuest.deleteMany()
    await tx.teamMember.deleteMany()
    await tx.invitation.deleteMany()
    await tx.apiKey.deleteMany()
    await tx.team.deleteMany()
    await tx.user.deleteMany()
    await tx.card.deleteMany()
    await tx.cardSet.deleteMany()
    await tx.shopItem.deleteMany()
    await tx.userReward.deleteMany()
    await tx.streakMilestone.deleteMany()
    await tx.quest.deleteMany()
    await tx.achievement.deleteMany()
    await tx.reward.deleteMany()
    await tx.globalConfig.deleteMany()
    console.log('Toutes les tables vidées.')

    // Catalogue (sans FK utilisateur)
    await seedCards(tx)
    await seedShop(tx)
    await seedQuests(tx)
    await seedAchievements(tx)
    await seedMilestones(tx)
    await seedGlobalConfig(tx)

    // Utilisateurs + équipe (en dernier, peut référencer le catalogue)
    await seedUsers(tx)
  })

  console.log('Seed done.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
