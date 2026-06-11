import { z } from 'zod/v4'

import { CardRarity } from '../../../../../generated/client'

export const unlockedAchievementSchema = z.object({
  key: z.string(),
  name: z.string(),
  iconKey: z.string().nullable(),
  reward: z
    .object({
      tokens: z.number().int(),
      dust: z.number().int(),
      xp: z.number().int(),
      cardRarity: z
        .enum(Object.values(CardRarity) as [CardRarity, ...CardRarity[]])
        .nullable(),
    })
    .nullable(),
})
