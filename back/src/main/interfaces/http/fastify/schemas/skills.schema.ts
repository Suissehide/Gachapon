import { z } from 'zod/v4'

export const nodeIdParamSchema = z.object({
  nodeId: z.string().min(1),
})
