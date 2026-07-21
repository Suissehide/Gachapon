import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'

import { MAX_PALIER } from '../../../../../domain/card-ascension/card-ascension.tx'
import { STAT_GROWTH_PER_LEVEL } from '../../../../../domain/card-leveling/card-leveling.domain'
import { ASCENSION_STAT_BONUS } from '../../../../../domain/combat/combat-stats.domain'
import {
  EQUIP_LEVEL_SCALE,
  EQUIP_MAX_LEVEL,
  EQUIP_SUBSTAT_MILESTONE,
  MAX_SUBSTATS_BY_RARITY,
} from '../../../../../domain/equipment/equipment-progression'
import {
  MILESTONE_PACKS,
  SKILL_POINTS_PER_LEVEL,
} from '../../../../../domain/shared/level-rewards'

const rarityRecordSchema = z.object({
  COMMON: z.number(),
  UNCOMMON: z.number(),
  RARE: z.number(),
  EPIC: z.number(),
  LEGENDARY: z.number(),
})

const economyConfigResponseSchema = z.object({
  xp: z.object({
    base: z.number(),
    slope: z.number(),
    levelCap: z.number(),
    skillPointsPerLevel: z.number(),
    milestones: z.array(
      z.object({
        level: z.number(),
        bonusPoints: z.number(),
        tokens: z.number(),
        dust: z.number(),
      }),
    ),
  }),
  gacha: z.object({
    pullTokenCost: z.number(),
    pityThreshold: z.number(),
    tokenRegenIntervalMinutes: z.number(),
    tokenMaxStock: z.number(),
  }),
  recycle: rarityRecordSchema,
  card: z.object({
    goldCostBase: z.number(),
    goldCostExp: z.number(),
    dustCostBase: z.number(),
    dustCostExp: z.number(),
    rarityMult: rarityRecordSchema,
    statGrowthPerLevel: z.number(),
    ascensionStatBonus: z.number(),
    maxPalier: z.number(),
  }),
  combat: z.object({
    pointsMax: z.number(),
    regenSeconds: z.number(),
    battleCost: z.number(),
    sweepCost: z.number(),
  }),
  wishlist: z.object({
    priceMultiplier: z.number(),
    cooldownDays: z.number(),
  }),
  equip: z.object({
    goldCostBase: z.number(),
    goldCostExp: z.number(),
    levelScale: z.number(),
    maxLevel: z.number(),
    substatMilestone: z.number(),
    maxSubstatsByRarity: rarityRecordSchema,
    salvageGold: rarityRecordSchema,
    substatRanges: z.object({
      hpFlat: z.object({ min: z.number(), max: z.number() }),
      atkFlat: z.object({ min: z.number(), max: z.number() }),
      defFlat: z.object({ min: z.number(), max: z.number() }),
      spdFlat: z.object({ min: z.number(), max: z.number() }),
      pct: z.object({ min: z.number(), max: z.number() }),
    }),
  }),
})

export const economyRouter: FastifyPluginCallbackZod = (fastify) => {
  fastify.get(
    '/economy/config',
    {
      schema: {
        tags: ['Economy'],
        response: { 200: economyConfigResponseSchema },
      },
    },
    async () => {
      const c = await fastify.iocContainer.configService.getMany(
        'xp.base',
        'xp.slope',
        'xp.levelCap',
        'gacha.pullTokenCost',
        'pityThreshold',
        'tokenRegenIntervalMinutes',
        'tokenMaxStock',
        'dustCommon',
        'dustUncommon',
        'dustRare',
        'dustEpic',
        'dustLegendary',
        'card.goldCostBase',
        'card.goldCostExp',
        'card.dustCostBase',
        'card.dustCostExp',
        'card.rarityMultCommon',
        'card.rarityMultUncommon',
        'card.rarityMultRare',
        'card.rarityMultEpic',
        'card.rarityMultLegendary',
        'combat.pointsMax',
        'combat.regenSeconds',
        'combat.battleCost',
        'combat.sweepCost',
        'wishlist.priceMultiplier',
        'wishlist.cooldownDays',
        'equip.goldCostBase',
        'equip.goldCostExp',
        'equip.salvageGoldCommon',
        'equip.salvageGoldUncommon',
        'equip.salvageGoldRare',
        'equip.salvageGoldEpic',
        'equip.salvageGoldLegendary',
        'equip.substatHpFlatMin',
        'equip.substatHpFlatMax',
        'equip.substatAtkFlatMin',
        'equip.substatAtkFlatMax',
        'equip.substatDefFlatMin',
        'equip.substatDefFlatMax',
        'equip.substatSpdFlatMin',
        'equip.substatSpdFlatMax',
        'equip.substatPctMin',
        'equip.substatPctMax',
      )
      return {
        xp: {
          base: c['xp.base'],
          slope: c['xp.slope'],
          levelCap: c['xp.levelCap'],
          skillPointsPerLevel: SKILL_POINTS_PER_LEVEL,
          milestones: MILESTONE_PACKS,
        },
        gacha: {
          pullTokenCost: c['gacha.pullTokenCost'],
          pityThreshold: c.pityThreshold,
          tokenRegenIntervalMinutes: c.tokenRegenIntervalMinutes,
          tokenMaxStock: c.tokenMaxStock,
        },
        recycle: {
          COMMON: c.dustCommon,
          UNCOMMON: c.dustUncommon,
          RARE: c.dustRare,
          EPIC: c.dustEpic,
          LEGENDARY: c.dustLegendary,
        },
        card: {
          goldCostBase: c['card.goldCostBase'],
          goldCostExp: c['card.goldCostExp'],
          dustCostBase: c['card.dustCostBase'],
          dustCostExp: c['card.dustCostExp'],
          rarityMult: {
            COMMON: c['card.rarityMultCommon'],
            UNCOMMON: c['card.rarityMultUncommon'],
            RARE: c['card.rarityMultRare'],
            EPIC: c['card.rarityMultEpic'],
            LEGENDARY: c['card.rarityMultLegendary'],
          },
          statGrowthPerLevel: STAT_GROWTH_PER_LEVEL,
          ascensionStatBonus: ASCENSION_STAT_BONUS,
          maxPalier: MAX_PALIER,
        },
        combat: {
          pointsMax: c['combat.pointsMax'],
          regenSeconds: c['combat.regenSeconds'],
          battleCost: c['combat.battleCost'],
          sweepCost: c['combat.sweepCost'],
        },
        wishlist: {
          priceMultiplier: c['wishlist.priceMultiplier'],
          cooldownDays: c['wishlist.cooldownDays'],
        },
        equip: {
          goldCostBase: c['equip.goldCostBase'],
          goldCostExp: c['equip.goldCostExp'],
          levelScale: EQUIP_LEVEL_SCALE,
          maxLevel: EQUIP_MAX_LEVEL,
          substatMilestone: EQUIP_SUBSTAT_MILESTONE,
          maxSubstatsByRarity: { ...MAX_SUBSTATS_BY_RARITY },
          salvageGold: {
            COMMON: c['equip.salvageGoldCommon'],
            UNCOMMON: c['equip.salvageGoldUncommon'],
            RARE: c['equip.salvageGoldRare'],
            EPIC: c['equip.salvageGoldEpic'],
            LEGENDARY: c['equip.salvageGoldLegendary'],
          },
          substatRanges: {
            hpFlat: {
              min: c['equip.substatHpFlatMin'],
              max: c['equip.substatHpFlatMax'],
            },
            atkFlat: {
              min: c['equip.substatAtkFlatMin'],
              max: c['equip.substatAtkFlatMax'],
            },
            defFlat: {
              min: c['equip.substatDefFlatMin'],
              max: c['equip.substatDefFlatMax'],
            },
            spdFlat: {
              min: c['equip.substatSpdFlatMin'],
              max: c['equip.substatSpdFlatMax'],
            },
            pct: {
              min: c['equip.substatPctMin'],
              max: c['equip.substatPctMax'],
            },
          },
        },
      }
    },
  )
}
