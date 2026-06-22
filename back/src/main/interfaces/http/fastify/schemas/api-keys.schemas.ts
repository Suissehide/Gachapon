import { z } from 'zod/v4'

export const createApiKeyBodySchema = z.object({
  name: z.string().min(1).max(50),
})

export const apiKeyIdParamSchema = z.object({ id: z.string().uuid() })
