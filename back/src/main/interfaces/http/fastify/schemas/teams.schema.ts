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

export const teamTransferBodySchema = z.object({
  newOwnerId: z.string().uuid(),
})

export const teamRankingQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})
