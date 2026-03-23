import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { config as loadEnv } from 'dotenv'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/client'

export default async function globalSetup() {
  // Load .env.test — overrides DATABASE_URL to point at gachapon_test
  loadEnv({ path: resolve(__dirname, '../../.env.test'), override: true })

  // Apply any pending migrations to the test database
  execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
    stdio: 'inherit',
    cwd: resolve(__dirname, '../..'),
  })

  // Truncate all tables so each run starts clean
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('DATABASE_URL is not set — check back/.env.test')
  const adapter = new PrismaPg({ connectionString })
  const prisma = new PrismaClient({ adapter })
  try {
    await prisma.$executeRawUnsafe(`
      TRUNCATE TABLE
        "UserUpgrade", "UserQuest", "UserAchievement", "UserCard", "GachaPull", "Purchase",
        "Invitation", "TeamMember", "Team",
        "OAuthAccount", "ApiKey", "User",
        "Card", "CardSet",
        "ShopItem", "Achievement", "Quest",
        "GlobalConfig", "UpgradeConfig"
      RESTART IDENTITY CASCADE;
    `)
  } finally {
    await prisma.$disconnect()
  }
}
