// Types
export type UnlockedAchievement = {
  key: string
  name: string
  iconKey: string | null
  reward: {
    tokens: number
    dust: number
    xp: number
    cardRarity: string | null
  } | null
}

export type AchievementWithProgress = {
  key: string
  name: string
  description: string
  family: string | null
  tier: number
  hidden: boolean
  iconKey: string | null
  sortOrder: number
  progress: number
  threshold: number
  unlocked: boolean
  unlockedAt: string | null
  reward: {
    tokens: number
    dust: number
    xp: number
    cardRarity: string | null
  } | null
}

export type FamilySummary = {
  family: string
  total: number
  unlocked: number
}

// Routes
export const ACHIEVEMENT_ROUTES = {
  list: '/achievements',
  families: '/achievements/families',
} as const

// Hex colours per card rarity, shared with the design handoff (palette
// commune Profil / Classement / Succès). Used by the achievement card to
// tint the "+ carte {Rareté}" line.
export const RARITY_HEX: Record<string, string> = {
  COMMON: '#22c55e',
  UNCOMMON: '#3b82f6',
  RARE: '#8b5cf6',
  EPIC: '#ec4899',
  LEGENDARY: '#f59e0b',
}

export const RARITY_FR: Record<string, string> = {
  COMMON: 'Commune',
  UNCOMMON: 'Peu commune',
  RARE: 'Rare',
  EPIC: 'Épique',
  LEGENDARY: 'Légendaire',
}

// Visual identity per family — hue (0–360 used for HSL tinting in
// section glyphs) and a thematic Lucide icon name (resolved by the
// component since lucide-react doesn't allow dynamic imports).
export const FAMILY_VISUAL: Record<
  string,
  { hue: number; label: string; icon: 'Sparkles' | 'Gem' | 'Zap' | 'Coins' | 'Flame' | 'Cog' | 'Layers' | 'HelpCircle' }
> = {
  pulls: { hue: 35, label: 'Tirages', icon: 'Sparkles' },
  dust: { hue: 150, label: 'Économie', icon: 'Coins' },
  collection_rarity: { hue: 270, label: 'Collection — Raretés', icon: 'Gem' },
  collection_variants: { hue: 290, label: 'Collection — Variantes', icon: 'Gem' },
  collection_complete: { hue: 250, label: 'Collection — Complétion', icon: 'Layers' },
  collection_sets: { hue: 230, label: 'Collection — Sets', icon: 'Layers' },
  streak: { hue: 15, label: 'Fidélité', icon: 'Flame' },
  machines: { hue: 320, label: 'Machines', icon: 'Cog' },
} as const

export const HIDDEN_FAMILY_VISUAL = {
  hue: 190,
  label: 'Succès cachés',
  icon: 'HelpCircle' as const,
}
