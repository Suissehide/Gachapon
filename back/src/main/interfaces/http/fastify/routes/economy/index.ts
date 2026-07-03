import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

import { MAX_PALIER } from '../../../../../domain/card-ascension/card-ascension.tx'
import { STAT_GROWTH_PER_LEVEL } from '../../../../../domain/card-leveling/card-leveling.domain'
import { ASCENSION_STAT_BONUS } from '../../../../../domain/combat/combat-stats.domain'

export const economyRouter: FastifyPluginCallbackZod = (fastify) => {
  fastify.get(
    '/economy/config',
    { schema: { tags: ['Economy'] } },
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
      )
      return {
        xp: {
          base: c['xp.base'],
          slope: c['xp.slope'],
          levelCap: c['xp.levelCap'],
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
      }
    },
  )
}
