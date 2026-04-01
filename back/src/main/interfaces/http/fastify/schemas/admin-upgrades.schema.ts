import { z } from 'zod/v4'

export const upgradeTypeEnum = z.enum(['REGEN', 'LUCK', 'DUST_HARVEST', 'TOKEN_VAULT'])

export const upgradeEntrySchema = z.object({
  type: upgradeTypeEnum,
  level: z.number().int().min(1).max(4),
  effect: z.number().positive(),
  dustCost: z.number().int().min(0),
})

export const adminUpgradesBulkBodySchema = z.object({
  upgrades: z.array(upgradeEntrySchema),
})
