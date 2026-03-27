export const RARITY_OPTIONS = [
  { value: 'COMMON', label: 'Common' },
  { value: 'UNCOMMON', label: 'Uncommon' },
  { value: 'RARE', label: 'Rare' },
  { value: 'EPIC', label: 'Epic' },
  { value: 'LEGENDARY', label: 'Legendary' },
]

export const RARITY_COLORS: Record<string, string> = {
  COMMON: 'bg-green-500/20 text-green-400',
  UNCOMMON: 'bg-blue-500/20 text-blue-400',
  RARE: 'bg-violet-500/20 text-violet-400',
  EPIC: 'bg-pink-500/20 text-pink-400',
  LEGENDARY: 'bg-amber-500/20 text-amber-400',
}

export const RARITY_TEXT_COLORS: Record<string, string> = {
  COMMON: 'text-green-400',
  UNCOMMON: 'text-blue-400',
  RARE: 'text-violet-400',
  EPIC: 'text-pink-400',
  LEGENDARY: 'text-amber-400',
}

// Utilisé par CardVariantPanel pour itérer les 3 champs
export const HOLO_ELIGIBLE_RARITIES = ['RARE', 'EPIC', 'LEGENDARY'] as const

// Types
export type CardVariant = 'NORMAL' | 'BRILLIANT' | 'HOLOGRAPHIC'

export type CardRarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'

export type CardSet = {
  id: string
  name: string
  description: string | null
  coverImage: string | null
  isActive: boolean
}

export type Card = {
  id: string
  name: string
  imageUrl: string | null
  rarity: CardRarity
  set: { id: string; name: string }
}

export type UserCard = {
  card: Card
  variant: CardVariant
  quantity: number
  obtainedAt: string
}

export type AdminCardSet = {
  id: string
  name: string
  description?: string
  isActive: boolean
  createdAt: string
  _count: { cards: number }
}

export type AdminCard = {
  id: string
  name: string
  imageUrl: string | null
  rarity: string
  variant?: string
  dropWeight: number
  set: { id: string; name: string }
}

// Routes
export const CARD_ROUTES = {
  sets: '/sets',
  cards: '/cards',
  collection: (userId: string) => `/users/${userId}/collection`,
  recycle: '/collection/recycle',
  admin: {
    sets: '/admin/sets',
    set: (id: string) => `/admin/sets/${id}`,
    cards: '/admin/cards',
    card: (id: string) => `/admin/cards/${id}`,
    cardImage: (id: string) => `/admin/cards/${id}/image`,
  },
} as const
