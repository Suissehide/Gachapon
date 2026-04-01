import { z } from 'zod/v4'

export const adminUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
})

export const adminUserIdParamSchema = z.object({ id: z.string().uuid() })

export const adminUserTokensBodySchema = z.object({ amount: z.number().int() })

export const adminUserDustBodySchema = z.object({ amount: z.number().int() })

export const adminUserRoleBodySchema = z.object({ role: z.enum(['USER', 'SUPER_ADMIN']) })

export const adminUserSuspendBodySchema = z.object({ suspended: z.boolean() })

export const adminUserRewardBodySchema = z.object({
  rewardId: z.string().uuid(),
  source: z.enum(['STREAK', 'ACHIEVEMENT', 'QUEST']),
})
