import { z } from 'zod/v4'

export const upgradeTypeParamSchema = z.object({
  type: z.enum(['REGEN', 'LUCK', 'DUST_HARVEST', 'TOKEN_VAULT']),
})
