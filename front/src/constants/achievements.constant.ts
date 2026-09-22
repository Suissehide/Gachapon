import i18n from '../i18n/index.ts'

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

// Réutilise `common:rarity.*` — troisième copie de ce même libellé
// rencontrée dans le périmètre transverse (voir aussi libs/rarity.ts et
// shared/tcg-card/config.ts, signalé dans task-6-report.md). Résolu une
// fois au chargement du module — sûr ici parce que `useLocale().switchTo`
// fait toujours un rechargement dur de la page (voir `i18n/useLocale.ts`).
export const RARITY_FR: Record<string, string> = {
  COMMON: i18n.t('common:rarity.common'),
  UNCOMMON: i18n.t('common:rarity.uncommon'),
  RARE: i18n.t('common:rarity.rare'),
  EPIC: i18n.t('common:rarity.epic'),
  LEGENDARY: i18n.t('common:rarity.legendary'),
}

// Visual identity per family — hue (0–360 used for HSL tinting in
// section glyphs) and a thematic Lucide icon name (resolved by the
// component since lucide-react doesn't allow dynamic imports).
export const FAMILY_VISUAL: Record<
  string,
  {
    hue: number
    label: string
    icon:
      | 'Sparkles'
      | 'Ticket'
      | 'Gem'
      | 'Zap'
      | 'Coins'
      | 'Flame'
      | 'Cog'
      | 'Layers'
      | 'HelpCircle'
  }
> = {
  pulls: {
    hue: 35,
    label: i18n.t('achievements:family.pulls'),
    icon: 'Ticket',
  },
  dust: { hue: 150, label: i18n.t('achievements:family.dust'), icon: 'Coins' },
  collection_rarity: {
    hue: 270,
    label: i18n.t('achievements:family.collectionRarity'),
    icon: 'Gem',
  },
  collection_variants: {
    hue: 290,
    label: i18n.t('achievements:family.collectionVariants'),
    icon: 'Gem',
  },
  collection_complete: {
    hue: 250,
    label: i18n.t('achievements:family.collectionComplete'),
    icon: 'Layers',
  },
  collection_sets: {
    hue: 230,
    label: i18n.t('achievements:family.collectionSets'),
    icon: 'Layers',
  },
  streak: {
    hue: 15,
    label: i18n.t('achievements:family.streak'),
    icon: 'Flame',
  },
  machines: {
    hue: 320,
    label: i18n.t('achievements:family.machines'),
    icon: 'Cog',
  },
} as const

export const HIDDEN_FAMILY_VISUAL = {
  hue: 190,
  label: i18n.t('achievements:family.hidden'),
  icon: 'HelpCircle' as const,
}
