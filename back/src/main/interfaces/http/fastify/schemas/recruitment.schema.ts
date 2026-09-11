import { z } from 'zod/v4'

export const myJoinRequestSchema = z.object({
  id: z.string(),
  teamId: z.string(),
  teamName: z.string(),
  teamSlug: z.string(),
  hue: z.number().int(),
  status: z.enum(['PENDING', 'DECLINED', 'ACCEPTED']),
  createdAt: z.date(),
  expiresAt: z.date(),
  reapplyAt: z.date().nullable(),
  decidedAt: z.date().nullable(),
})

export const myJoinRequestsResponseSchema = z.object({
  requests: z.array(myJoinRequestSchema),
})

export const teamJoinRequestsResponseSchema = z.object({
  requests: z.array(
    z.object({
      id: z.string(),
      createdAt: z.date(),
      candidate: z.object({
        id: z.string(),
        username: z.string(),
        avatar: z.string().nullable(),
      }),
    }),
  ),
})

export const joinRequestIdParamSchema = z.object({ id: z.string().uuid() })

export const joinRequestDecisionResponseSchema = z.object({
  teamId: z.string(),
  userId: z.string(),
})

export const directoryQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  search: z.string().max(50).optional(),
})

export const directoryResponseSchema = z.object({
  teams: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      slug: z.string(),
      motto: z.string().nullable(),
      hue: z.number().int(),
      level: z.number().int(),
      memberCount: z.number().int(),
      maxMembers: z.number().int(),
      activeThisWeek: z.number().int(),
      hasPendingRequest: z.boolean(),
    }),
  ),
  nextCursor: z.string().nullable(),
})
