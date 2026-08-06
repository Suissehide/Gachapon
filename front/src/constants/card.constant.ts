import {
  Droplet,
  Flame,
  Leaf,
  type LucideIcon,
  Moon,
  Mountain,
  Sun,
} from 'lucide-react'

export const RARITY_OPTIONS = [
  { value: 'COMMON', label: 'Common' },
  { value: 'UNCOMMON', label: 'Uncommon' },
  { value: 'RARE', label: 'Rare' },
  { value: 'EPIC', label: 'Epic' },
  { value: 'LEGENDARY', label: 'Legendary' },
]

export const RARITY_COLORS: Record<string, string> = {
  COMMON: 'bg-gray-500/20 text-gray-400',
  UNCOMMON: 'bg-green-500/20 text-green-400',
  RARE: 'bg-blue-500/20 text-blue-400',
  EPIC: 'bg-violet-500/20 text-violet-400',
  LEGENDARY: 'bg-amber-500/20 text-amber-400',
}

export const RARITY_TEXT_COLORS: Record<string, string> = {
  COMMON: 'text-gray-400',
  UNCOMMON: 'text-green-400',
  RARE: 'text-blue-400',
  EPIC: 'text-violet-400',
  LEGENDARY: 'text-amber-400',
}

// Utilisé par CardVariantPanel pour itérer les 3 champs
export const HOLO_ELIGIBLE_RARITIES = ['RARE', 'EPIC', 'LEGENDARY'] as const

// Types
export type CardVariant = 'NORMAL' | 'BRILLIANT' | 'HOLOGRAPHIC'

export type CardRarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'

export type CardElement =
  | 'FIRE'
  | 'WATER'
  | 'NATURE'
  | 'EARTH'
  | 'LIGHT'
  | 'DARK'

export const ELEMENT_ORDER: CardElement[] = [
  'FIRE',
  'WATER',
  'NATURE',
  'EARTH',
  'LIGHT',
  'DARK',
]

export const ELEMENT_LABELS: Record<CardElement, string> = {
  FIRE: 'Feu',
  WATER: 'Eau',
  NATURE: 'Nature',
  EARTH: 'Terre',
  LIGHT: 'Lumière',
  DARK: 'Ténèbres',
}

/** Couleur d'accent (hex) par élément — pastilles et badges. */
export const ELEMENT_COLOR: Record<CardElement, string> = {
  FIRE: '#E8552D',
  WATER: '#2D8FE8',
  NATURE: '#3FA34D',
  EARTH: '#A6772F',
  LIGHT: '#E8C23D',
  DARK: '#7A4FB5',
}

/**
 * Pictogramme par élément. Les pastilles sont posées sur un fond sombre
 * (#1b1726) et l'icône est rendue en blanc : les silhouettes doivent donc
 * rester lisibles en aplat, d'où des formes franches et bien distinctes.
 */
export const ELEMENT_ICON: Record<CardElement, LucideIcon> = {
  FIRE: Flame,
  WATER: Droplet,
  NATURE: Leaf,
  EARTH: Mountain,
  LIGHT: Sun,
  DARK: Moon,
}

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
  element: CardElement | null
  set: { id: string; name: string }
  baseHp: number
  baseAtk: number
  baseDef: number
  baseSpd: number
  passiveKey: string | null
}

export type UserCard = {
  id: string
  card: Card
  variant: CardVariant
  quantity: number
  level: number
  palier: number
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
  baseHp: number
  baseAtk: number
  baseDef: number
  baseSpd: number
  passiveKey: string | null
  element: CardElement | null
  set: { id: string; name: string }
}

// Routes
export const CARD_ROUTES = {
  sets: '/sets',
  cards: '/cards',
  collection: (userId: string) => `/users/${userId}/collection`,
  recycle: '/collection/recycle',
  recycleAll: '/collection/recycle-all',
  admin: {
    sets: '/admin/sets',
    set: (id: string) => `/admin/sets/${id}`,
    cards: '/admin/cards',
    card: (id: string) => `/admin/cards/${id}`,
    cardImage: (id: string) => `/admin/cards/${id}/image`,
  },
} as const
