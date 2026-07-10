import type { BadgeVariant } from '../components/ui/badge.tsx'

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

export const RARITY_LABEL_FR: Record<string, string> = {
  COMMON: 'Commune',
  UNCOMMON: 'Peu commune',
  RARE: 'Rare',
  EPIC: 'Épique',
  LEGENDARY: 'Légendaire',
}
