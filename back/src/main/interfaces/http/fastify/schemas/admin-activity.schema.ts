import { z } from 'zod/v4'

export const ACTIVITY_EVENT_TYPES = [
  'USER_SIGNUP',
  'PULL_EPIC',
  'PULL_LEGENDARY',
  'SHOP_PURCHASE',
  'USER_SUSPENDED',
  'USER_UNSUSPENDED',
  'ADMIN_GRANT',
  'BULK_REWARD',
  'LEVEL_UP',
] as const

export const adminActivityQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
  type: z.enum(ACTIVITY_EVENT_TYPES).optional(),
})
