import { z } from 'zod/v4'

export const shopItemIdParamSchema = z.object({ id: z.string().uuid() })
