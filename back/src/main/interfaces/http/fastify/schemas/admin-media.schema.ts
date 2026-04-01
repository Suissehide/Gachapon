import { z } from 'zod/v4'

export const adminMediaDeleteBodySchema = z.object({
  keys: z.array(z.string()).min(1),
})

export const adminMediaRenameBodySchema = z.object({
  from: z.string(),
  newName: z.string(),
})
