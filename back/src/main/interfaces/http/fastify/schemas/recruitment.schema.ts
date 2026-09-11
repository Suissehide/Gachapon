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
