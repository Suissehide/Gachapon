import { PrismaPg } from '@prisma/adapter-pg'
import { config } from 'dotenv'

import { PrismaClient } from '../src/generated/client'
import { bossLoot } from './seed/campaign'

// Rebalance 2026-07 (spec docs/superpowers/specs/2026-07-16-rebalance-economie-design.md)
// Applique les nouvelles valeurs d'équilibrage sur une DB EXISTANTE sans toucher
// aux données joueurs. Idempotent : chaque opération est un "set" absolu.
// Usage : cd back && npx tsx prisma/rebalance-2026-07.ts
// NB : la config est cachée 5 min dans Redis (config:*) — les nouvelles valeurs
// de GlobalConfig sont effectives au plus tard 5 min après le run.

config()
config({ path: '.env.local', override: true })

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const DROP_WEIGHTS: Record<string, number> = {
  COMMON: 85,
  UNCOMMON: 38,
  RARE: 16,
  EPIC: 8,
  LEGENDARY: 2,
}

const GLOBAL_CONFIG: Record<string, number> = {
  tokenRegenIntervalMinutes: 60,
  pityThreshold: 300,
}

const QUEST_REWARDS: Record<string, { tokens: number; dust: number }> = {
  first_pull: { tokens: 2, dust: 0 },
  first_battle: { tokens: 3, dust: 25 },
  first_card_level: { tokens: 3, dust: 25 },
  first_recycle: { tokens: 2, dust: 25 },
  first_gold_spent: { tokens: 2, dust: 15 },
  collect_10_unique: { tokens: 5, dust: 100 },
  join_team: { tokens: 3, dust: 25 },
}

const ACHIEVEMENT_TOKENS: Record<string, number> = {
  pulls_10: 2,
  pulls_100: 4,
  pulls_500: 10,
  dust_spent_500: 2,
  dust_spent_5000: 10,
  cards_recycled_50: 4,
  own_rare_10: 4,
  own_epic_5: 10,
  own_legendary_1: 10,
  complete_1_set: 25,
  level_10: 4,
  level_25: 10,
}

async function main() {
  console.log('Rebalance 2026-07…')

  await prisma.$transaction(async (tx) => {
    // 1. GlobalConfig (bootstrap create-only → set explicite)
    for (const [key, value] of Object.entries(GLOBAL_CONFIG)) {
      await tx.globalConfig.upsert({
        where: { key },
        create: { key, value: String(value) },
        update: { value: String(value) },
      })
      console.log(`  config ${key} = ${value}`)
    }

    // 2. Poids de drop par rareté
    for (const [rarity, dropWeight] of Object.entries(DROP_WEIGHTS)) {
      const { count } = await tx.card.updateMany({
        where: { rarity: rarity as never },
        data: { dropWeight },
      })
      console.log(`  ${count} cartes ${rarity} → dropWeight ${dropWeight}`)
    }

    // 3. Récompenses des quêtes one-shot (Quest.key est @unique, rewardId nullable)
    for (const [key, reward] of Object.entries(QUEST_REWARDS)) {
      const quest = await tx.quest.findUnique({
        where: { key },
        select: { rewardId: true },
      })
      if (!quest?.rewardId) {
        console.warn(`  ! quête introuvable ou sans reward : ${key}`)
        continue
      }
      await tx.reward.update({
        where: { id: quest.rewardId },
        data: { tokens: reward.tokens, dust: reward.dust },
      })
      console.log(`  quête ${key} → ${reward.tokens} jetons / ${reward.dust} dust`)
    }

    // 4. Jetons des achievements précoces (Achievement.key @unique, rewardId nullable)
    for (const [key, tokens] of Object.entries(ACHIEVEMENT_TOKENS)) {
      const achievement = await tx.achievement.findUnique({
        where: { key },
        select: { rewardId: true },
      })
      if (!achievement?.rewardId) {
        console.warn(`  ! achievement introuvable ou sans reward : ${key}`)
        continue
      }
      await tx.reward.update({
        where: { id: achievement.rewardId },
        data: { tokens },
      })
      console.log(`  achievement ${key} → ${tokens} jetons`)
    }

    // 5. Boost Épique → boost de poids ×3
    const { count: boostCount } = await tx.shopItem.updateMany({
      where: { name: 'Boost Épique', type: 'BOOST' },
      data: {
        description:
          "Multiplie par 3 les chances d'obtenir des cartes EPIC pendant 10 tirages.",
        value: { multiplier: 3, rarity: 'EPIC', pulls: 10 },
      },
    })
    console.log(`  ${boostCount} article(s) Boost Épique convertis en boost de poids`)

    // 6. Loot des boss (carte garantie RARE ch.1-3, EPIC ch.4-5)
    const bosses = await tx.campaignStage.findMany({
      where: { isBoss: true },
      select: { id: true, chapter: true },
    })
    for (const boss of bosses) {
      await tx.campaignStage.update({
        where: { id: boss.id },
        data: { lootTable: bossLoot(boss.chapter) },
      })
    }
    console.log(`  ${bosses.length} lootTable de boss recalculées`)
  })

  console.log('Rebalance done.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
