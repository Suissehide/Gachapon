import type { PrismaClient } from '../../src/generated/client'
import {
  RAID_BOSS_NAME,
  RAID_TIERS,
  raidBossSpec,
  raidTierLabelEn,
  raidTierLabelFr,
} from '../../src/main/domain/content/raid.definitions'
import { TOWER_ELEMENTS } from '../../src/main/domain/tower/tower-slots'

type Tx = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0]

/**
 * Écrit les boss de raid et leurs paliers. Les données elles-mêmes vivent
 * dans `src/main/domain/content/raid.definitions.ts` : elles sont partagées
 * avec le backfill de traductions, qui est du code de production.
 */
export async function seedRaid(tx: Tx): Promise<void> {
  for (const element of TOWER_ELEMENTS) {
    await tx.raidBoss.upsert({
      where: { element },
      create: {
        element,
        // nameEn recopie le francais : la tache 8 traduira.
        nameFr: RAID_BOSS_NAME[element],
        nameEn: RAID_BOSS_NAME[element],
        spec: raidBossSpec(element),
      },
      update: {
        nameFr: RAID_BOSS_NAME[element],
        nameEn: RAID_BOSS_NAME[element],
        spec: raidBossSpec(element),
      },
    })
  }

  for (const t of RAID_TIERS) {
    const rewardData = {
      tokens: t.tokens,
      gold: t.gold,
      dust: t.dust,
      xp: t.xp,
      cardRarity: t.cardRarity,
      labelFr: raidTierLabelFr(t.pct),
      labelEn: raidTierLabelEn(t.pct),
    }
    const existing = await tx.raidTier.findUnique({ where: { pct: t.pct } })
    if (existing) {
      await tx.reward.update({
        where: { id: existing.rewardId },
        data: rewardData,
      })
      continue
    }
    const reward = await tx.reward.create({ data: rewardData })
    await tx.raidTier.create({ data: { pct: t.pct, rewardId: reward.id } })
  }

  console.log('  4 boss de raid + 4 paliers créés')
}
