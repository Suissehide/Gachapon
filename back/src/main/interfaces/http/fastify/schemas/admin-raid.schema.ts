import { z } from 'zod/v4'

import { enemySpecSchema } from '../../../../domain/combat/sim-units'
import { errorMessage } from '../../../../infra/i18n/error-messages'
import { cardRaritySchema } from './admin-streak.schema'
import { towerElementSchema } from './tower.schema'

export const adminRaidBossParamSchema = z.object({
  element: towerElementSchema,
})

export const adminRaidBossPatchBodySchema = z
  .object({
    nameFr: z.string().min(1).max(60).optional(),
    nameEn: z.string().min(1).max(60).optional(),
    spec: enemySpecSchema.optional(),
  })
  .refine(
    (b) =>
      b.nameFr !== undefined || b.nameEn !== undefined || b.spec !== undefined,
    {
      // `error`, pas `message` : fonction résolue à chaque validation, dans
      // la locale de la requête — pas figée à l'import du module.
      error: () => errorMessage('raid.adminPatchNothingToUpdate'),
      path: ['nameFr'],
    },
  )

export const adminRaidTierParamSchema = z.object({
  pct: z.coerce.number().int().min(1).max(100),
})

const nonNegative = z.number().int().min(0)

export const adminRaidTierPatchBodySchema = z.object({
  tokens: nonNegative.optional(),
  dust: nonNegative.optional(),
  gold: nonNegative.optional(),
  xp: nonNegative.optional(),
  cardRarity: cardRaritySchema.nullable().optional(),
})
