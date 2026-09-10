import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'

import {
  MAX_PALIER,
  STAT_GROWTH_PER_LEVEL,
} from '../../../../../domain/card-leveling/card-leveling.domain'
import { ASCENSION_STAT_BONUS } from '../../../../../domain/combat/combat-stats.domain'
import {
  EQUIP_LEVEL_SCALE,
  EQUIP_MAX_LEVEL,
  EQUIP_MAX_SUBSTATS,
  EQUIP_SUBSTAT_MILESTONE,
  INITIAL_SUBSTATS_BY_RARITY,
  SUBSTAT_RANGE_CONFIG_KEYS,
  substatRangesFromConfig,
} from '../../../../../domain/equipment/equipment-progression'
import {
  MILESTONE_PACKS,
  SKILL_POINTS_PER_LEVEL,
} from '../../../../../domain/shared/level-rewards'
import { substatKeyEnum } from '../../schemas/equipment.schema'

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
    elementAdvantageMult: z.number(),
    elementDisadvantageMult: z.number(),
    // Valeurs de base des 4 stats de stuff, communes alliés/ennemis — le
    // front en a besoin pour afficher ces stats même sans équipement.
    baseCritRate: z.number(),
    baseCritDmg: z.number(),
    baseArmorPen: z.number(),
    baseLifesteal: z.number(),
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
    maxSubstats: z.number(),
    initialSubstatsByRarity: rarityRecordSchema,
    salvageGold: rarityRecordSchema,
    // Dérivé de SUBSTAT_KEYS : ajouter une sous-stat n'exige aucune édition ici.
    substatRanges: z.record(
      substatKeyEnum,
      z.object({ min: z.number(), max: z.number() }),
    ),
  }),
  raid: z.object({
    attacksPerDay: z.number(),
    timeoutTurns: z.number(),
  }),
  duel: z.object({
    pullCount: z.number(),
  }),
  bet: z.object({
    pullWindow: z.number(),
    minStake: z.number(),
    maxStake: z.number(),
  }),
  team: z.object({
    maxMembers: z.number(),
    recruitDays: z.number(),
    perkMaxRank: z.number(),
    perks: z.object({
      loot: z.object({ perRank: z.number(), unlockLevel: z.number() }),
      raid: z.object({ perRank: z.number(), unlockLevel: z.number() }),
      xp: z.object({ perRank: z.number(), unlockLevel: z.number() }),
      forge: z.object({ perRank: z.number(), unlockLevel: z.number() }),
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
        'combat.elementAdvantageMult',
        'combat.elementDisadvantageMult',
        'combat.baseCritRate',
        'combat.baseCritDmg',
        'combat.baseArmorPen',
        'combat.baseLifesteal',
        'wishlist.priceMultiplier',
        'wishlist.cooldownDays',
        'equip.goldCostBase',
        'equip.goldCostExp',
        'equip.salvageGoldCommon',
        'equip.salvageGoldUncommon',
        'equip.salvageGoldRare',
        'equip.salvageGoldEpic',
        'equip.salvageGoldLegendary',
        'raid.attacksPerDay',
        'raid.timeoutTurns',
        'duel.pullCount',
        'bet.pullWindow',
        'bet.minStake',
        'bet.maxStake',
        'team.maxMembers',
        'team.recruitDays',
        'teamPerk.maxRank',
        'teamPerk.loot.perRank',
        'teamPerk.loot.unlockLevel',
        'teamPerk.raid.perRank',
        'teamPerk.raid.unlockLevel',
        'teamPerk.xp.perRank',
        'teamPerk.xp.unlockLevel',
        'teamPerk.forge.perRank',
        'teamPerk.forge.unlockLevel',
        ...SUBSTAT_RANGE_CONFIG_KEYS,
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
          elementAdvantageMult: c['combat.elementAdvantageMult'],
          elementDisadvantageMult: c['combat.elementDisadvantageMult'],
          baseCritRate: c['combat.baseCritRate'],
          baseCritDmg: c['combat.baseCritDmg'],
          baseArmorPen: c['combat.baseArmorPen'],
          baseLifesteal: c['combat.baseLifesteal'],
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
          maxSubstats: EQUIP_MAX_SUBSTATS,
          initialSubstatsByRarity: { ...INITIAL_SUBSTATS_BY_RARITY },
          salvageGold: {
            COMMON: c['equip.salvageGoldCommon'],
            UNCOMMON: c['equip.salvageGoldUncommon'],
            RARE: c['equip.salvageGoldRare'],
            EPIC: c['equip.salvageGoldEpic'],
            LEGENDARY: c['equip.salvageGoldLegendary'],
          },
          substatRanges: substatRangesFromConfig(c),
        },
        raid: {
          attacksPerDay: c['raid.attacksPerDay'],
          timeoutTurns: c['raid.timeoutTurns'],
        },
        duel: { pullCount: c['duel.pullCount'] },
        bet: {
          pullWindow: c['bet.pullWindow'],
          minStake: c['bet.minStake'],
          maxStake: c['bet.maxStake'],
        },
        team: {
          maxMembers: c['team.maxMembers'],
          recruitDays: c['team.recruitDays'],
          perkMaxRank: c['teamPerk.maxRank'],
          perks: {
            loot: {
              perRank: c['teamPerk.loot.perRank'],
              unlockLevel: c['teamPerk.loot.unlockLevel'],
            },
            raid: {
              perRank: c['teamPerk.raid.perRank'],
              unlockLevel: c['teamPerk.raid.unlockLevel'],
            },
            xp: {
              perRank: c['teamPerk.xp.perRank'],
              unlockLevel: c['teamPerk.xp.unlockLevel'],
            },
            forge: {
              perRank: c['teamPerk.forge.perRank'],
              unlockLevel: c['teamPerk.forge.unlockLevel'],
            },
          },
        },
      }
    },
  )
}
