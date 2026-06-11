// back/src/main/types/domain/profile/profile.types.ts
import type { CardRarity, CardVariant } from '../gacha/gacha.types'

export type FeaturedCardDto = {
  id: string
  name: string
  imageUrl: string | null
  rarity: CardRarity
  variant: CardVariant
  setId: string
  setName: string
}

export type SetProgressionDto = {
  id: string
  name: string
  short: string
  hue: number
  owned: number
  total: number
  percent: number
}
