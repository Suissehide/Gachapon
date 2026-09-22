import { Coins, type LucideIcon, Sparkles, Star, Zap } from 'lucide-react'

import i18n from '../i18n/index.ts'

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
// Libellés résolus une fois au chargement du module — sûr ici parce que
// `useLocale().switchTo` fait toujours un rechargement dur de la page (voir
// `i18n/useLocale.ts`). Réutilise `common:currency.*` (déjà utilisé pour
// d'autres affichages de devise).
export const REWARD_TYPE_META: Record<RewardType, RewardTypeMeta> = {
  tokens: {
    label: i18n.t('common:currency.tokens.singular'),
    labelPlural: i18n.t('common:currency.tokens.plural'),
    color: '#3b82f6',
    icon: Zap,
  },
  dust: {
    label: i18n.t('common:currency.dust.singular'),
    labelPlural: i18n.t('common:currency.dust.plural'),
    color: '#8b5cf6',
    icon: Sparkles,
  },
  xp: {
    label: i18n.t('common:currency.xp.singular'),
    labelPlural: i18n.t('common:currency.xp.plural'),
    color: '#10b981',
    icon: Star,
  },
  gold: {
    label: i18n.t('common:currency.gold.singular'),
    labelPlural: i18n.t('common:currency.gold.plural'),
    color: '#f59e0b',
    icon: Coins,
  },
}

/** Reward currencies in canonical display order. */
export const REWARD_TYPE_ORDER: RewardType[] = ['tokens', 'dust', 'xp', 'gold']
