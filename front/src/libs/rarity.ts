import type { BadgeVariant } from '../components/ui/badge.tsx'
import i18n from '../i18n/index.ts'

export const RARITY_BADGE_VARIANT: Record<string, BadgeVariant> = {
  COMMON: 'common',
  UNCOMMON: 'uncommon',
  RARE: 'rare',
  EPIC: 'epic',
  LEGENDARY: 'legendary',
}

/** Pour les charts / styles inline uniquement — partout ailleurs, utiliser Badge. */
export const RARITY_COLOR_VAR: Record<string, string> = {
  COMMON: 'var(--rarity-common)',
  UNCOMMON: 'var(--rarity-uncommon)',
  RARE: 'var(--rarity-rare)',
  EPIC: 'var(--rarity-epic)',
  LEGENDARY: 'var(--rarity-legendary)',
}

/**
 * Nommé `_FR` par héritage (lot 1) mais lu dans la langue courante : la
 * valeur vient de `i18n.t()`, résolue une fois au chargement du module — sûr
 * ici parce que `useLocale().switchTo` fait TOUJOURS un rechargement dur de
 * la page (voir `i18n/useLocale.ts`), donc ce module est réévalué à chaque
 * changement de langue. Ne pas renommer sans mettre à jour tous les call
 * sites : hors périmètre de la tâche 6 (composants d'autres domaines).
 */
export const RARITY_LABEL_FR: Record<string, string> = {
  COMMON: i18n.t('common:rarity.common'),
  UNCOMMON: i18n.t('common:rarity.uncommon'),
  RARE: i18n.t('common:rarity.rare'),
  EPIC: i18n.t('common:rarity.epic'),
  LEGENDARY: i18n.t('common:rarity.legendary'),
}
