import { z } from 'zod/v4'

import { enemySpecSchema } from '../../../../domain/combat/sim-units'
import { errorMessage } from '../../../../infra/i18n/error-messages'
import { cardRaritySchema } from './admin-streak.schema'
import { towerElementSchema } from './tower.schema'

export const adminRaidBossParamSchema = z.object({
  element: towerElementSchema,
})

// mitigationScale doit rester strictement positif : à 0 ou en négatif, le
// boss devient invulnérable pour toute la semaine sans autre moyen de s'en
// sortir qu'un nouveau PATCH d'un admin. Contrainte posée ICI seulement,
// pas sur enemySpecSchema (partagé avec la tour et la campagne) : élargir
// cette dernière serait un rayon d'action que ce correctif n'a pas à couvrir.
const raidBossSpecSchema = enemySpecSchema.extend({
  mitigationScale: z.number().positive(),
})

export const adminRaidBossPatchBodySchema = z
  .object({
    nameFr: z.string().min(1).max(60).optional(),
    nameEn: z.string().min(1).max(60).optional(),
    spec: raidBossSpecSchema.optional(),
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
