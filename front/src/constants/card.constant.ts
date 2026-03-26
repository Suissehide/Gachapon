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
