import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { config as loadEnv } from 'dotenv'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/client'
import Redis from 'ioredis'
import { acquireE2eLock, databaseNameFromUrl } from './helpers/e2e-lock'

/**
 * Le verrou vit dans le repertoire temporaire du systeme, et non dans le
 * depot : deux worktrees differents qui pointent la MEME base doivent se
 * bloquer l'un l'autre, et un verrou versionne n'aurait aucun sens.
 */
export const E2E_LOCK_DIR = join(tmpdir(), 'gachapon-e2e-locks')

export default async function globalSetup() {
  // Load .env.test — overrides DATABASE_URL to point at gachapon_test
  loadEnv({ path: resolve(__dirname, '../../.env.test'), override: true })

  // Le verrou AVANT toute ecriture : le TRUNCATE plus bas est precisement ce
  // qui rend deux runs simultanes destructeurs l'un pour l'autre.
  const lockUrl = process.env.DATABASE_URL
  if (!lockUrl) throw new Error('DATABASE_URL is not set — check back/.env.test')
  acquireE2eLock(E2E_LOCK_DIR, databaseNameFromUrl(lockUrl), process.pid)

  // Apply any pending migrations to the test database.
  // `shell: true` — sur Windows npx est un .cmd, qu'execFileSync ne sait pas
  // résoudre seul (spawnSync npx ENOENT).
  execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
    stdio: 'inherit',
    cwd: resolve(__dirname, '../..'),
    shell: true,
  })

  // Truncate all tables so each run starts clean
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('DATABASE_URL is not set — check back/.env.test')
  const adapter = new PrismaPg({ connectionString })
  const prisma = new PrismaClient({ adapter })
  try {
    await prisma.$executeRawUnsafe(`
      TRUNCATE TABLE
        "UserSkill", "UserQuest", "UserAchievement", "UserAchievementProgress",
        "UserCard", "GachaPull", "Purchase", "UserBoost",
        "Invitation", "TeamMember", "Team",
        "OAuthAccount", "ApiKey", "User",
        "Card", "CardSet",
        "UserCampaignProgress", "CampaignStage", "BattleResult",
        "Equipment", "UserEquipment",
        "TowerFloor", "UserTowerProgress",
        "ShopItem", "Achievement", "Quest",
        "DailyShop", "DailyShopItem",
        "Rewards", "UserRewards", "StreakMilestones",
        "ActivityEvent",
        "GlobalConfig", "ScoringConfig",
        "SkillEdge", "SkillNodeLevel", "SkillNode", "SkillBranch", "SkillConfig"
      RESTART IDENTITY CASCADE;
    `)
  } finally {
    await prisma.$disconnect()
  }

  // Flush Redis cache so config values are re-read from DB on next test
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
  const redis = new Redis(redisUrl)
  try {
    await redis.flushdb()
  } finally {
    redis.disconnect()
  }
}
