import { z } from 'zod/v4'

export const nodeIdParamSchema = z.object({
  nodeId: z.string().min(1),
})

export const investBatchBodySchema = z.object({
  allocations: z
    .array(
      z.object({
        nodeId: z.string().min(1),
        levels: z.number().int().positive(),
      }),
    )
    .min(1),
})
