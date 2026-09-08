import { z } from 'zod/v4'

import { enemySpecSchema } from '../../../../domain/combat/sim-units'
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
    name: z.string().min(1).max(60).optional(),
    spec: raidBossSpecSchema.optional(),
  })
  .refine((b) => b.name !== undefined || b.spec !== undefined, {
    message: 'Rien à modifier',
    path: ['name'],
  })

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
