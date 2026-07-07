import { Coins, type LucideIcon, Sparkles, Star, Zap } from 'lucide-react'

/** The four reward currencies a quest / reward can grant. */
export type RewardType = 'tokens' | 'dust' | 'xp' | 'gold'

export type RewardTypeMeta = {
  /** Singular French label used in chips. */
  label: string
  /** Plural French label (defaults to `label` when a currency is invariable). */
  labelPlural: string
  /** Accent color for the icon/value/tint. */
  color: string
  icon: LucideIcon
}

/**
 * Single source of truth for how each reward currency is displayed
 * (icon + accent color). Reused by quest cards, reward chips, etc.
 */
export const REWARD_TYPE_META: Record<RewardType, RewardTypeMeta> = {
  tokens: {
    label: 'jeton',
    labelPlural: 'jetons',
    color: '#3b82f6',
    icon: Zap,
  },
  dust: {
    label: 'poussière',
    labelPlural: 'poussière',
    color: '#8b5cf6',
    icon: Sparkles,
  },
  xp: {
    label: 'XP',
    labelPlural: 'XP',
    color: '#10b981',
    icon: Star,
  },
  gold: {
    label: 'or',
    labelPlural: 'or',
    color: '#f59e0b',
    icon: Coins,
  },
}

/** Reward currencies in canonical display order. */
export const REWARD_TYPE_ORDER: RewardType[] = ['tokens', 'dust', 'xp', 'gold']
