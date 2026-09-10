import { z } from 'zod/v4'

export const teamIdParamSchema = z.object({ id: z.string().uuid() })

export const teamUserIdParamSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
})

export const teamTokenParamSchema = z.object({ token: z.string().uuid() })

export const teamInvitationIdParamSchema = z.object({ id: z.string().uuid() })

export const teamCreateBodySchema = z.object({
  name: z.string().min(2).max(50),
  description: z.string().max(200).optional(),
})

export const teamInviteBodySchema = z
  .object({
    username: z.string().optional(),
    email: z.string().email().optional(),
  })
  .refine((b) => b.username || b.email, {
    message: 'Provide username or email',
  })

export const teamUpdateBodySchema = z.object({
  name: z.string().min(2).max(50),
  description: z.string().max(200).optional(),
})

export const teamTransferBodySchema = z.object({
  newOwnerId: z.string().uuid(),
})

export const teamRankingQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

// Les quatre bonus d'équipe. Le repository sous-jacent accepte n'importe
// quelle string — c'est CET enum qui empêche un rang « fantôme » de se créer
// à la frontière HTTP à partir d'une clé mal orthographiée.
export const teamPerkKeySchema = z.enum(['loot', 'raid', 'xp', 'forge'])

export const teamPerkSpendBodySchema = z.object({
  key: teamPerkKeySchema,
})

const teamPerkStateSchema = z.object({
  key: teamPerkKeySchema,
  rank: z.number().int(),
  effect: z.number(),
  unlockLevel: z.number().int(),
  unlocked: z.boolean(),
})

export const teamPerksResponseSchema = z.object({
  teamId: z.string(),
  level: z.number().int(),
  xp: z.number().int(),
  xpToNext: z.number().int(),
  perkPoints: z.number().int(),
  maxRank: z.number().int(),
  perks: z.array(teamPerkStateSchema),
})
