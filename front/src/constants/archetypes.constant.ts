import {
  Crosshair,
  HeartPulse,
  type LucideIcon,
  Scale,
  Shield,
  Sparkles,
  Sword,
  Swords,
} from 'lucide-react'

import i18n, { currentLocale } from '../i18n/index.ts'
import { formatPct } from '../libs/utils.ts'
import { CARD_ARCHETYPES, type CardArchetype } from './card.constant.ts'

/**
 * Miroir de `clampPalier()` et des magnitudes de
 * `back/src/main/domain/combat/ultimates.ts`. Le back plafonne l'ultime au
 * palier 6 comme les passifs ; le front reproduit exactement les mêmes
 * formules pour ne jamais afficher une valeur que le combat n'applique pas.
 */
function clampPalierForUltimateDisplay(palier: number): number {
  if (palier < 1) {
    return 1
  }
  if (palier > 6) {
    return 6
  }
  return palier
}

const ULTIMATE_VALUE: Record<CardArchetype, (palier: number) => number> = {
  MAGE: (p) => 55 + 5 * p,
  RANGER: (p) => 80 + 6 * p,
  ASSASSIN: (p) => 62 + 6 * p,
  FIGHTER: (p) => 150 + 13 * p,
  BALANCED: (p) => 140 + 11 * p,
  TANK: (p) => 4 + 0.8 * p,
  SUPPORT: (p) => 4 + 0.8 * p,
}

export const ARCHETYPE_ICONS: Record<CardArchetype, LucideIcon> = {
  TANK: Shield,
  SUPPORT: HeartPulse,
  FIGHTER: Sword,
  BALANCED: Scale,
  RANGER: Crosshair,
  ASSASSIN: Swords,
  MAGE: Sparkles,
}

export function archetypeName(archetype: CardArchetype): string {
  return i18n.t(`archetypes:${archetype}.name`)
}

export function ultimateName(archetype: CardArchetype): string {
  return i18n.t(`archetypes:${archetype}.ultimateName`)
}

/** Description de l'ultime au palier donné, dans la langue courante. */
export function describeUltimate(
  archetype: CardArchetype,
  palier: number,
): string {
  const p = clampPalierForUltimateDisplay(palier)
  return i18n.t(`archetypes:${archetype}.ultimateDescribe`, {
    value: formatPct(ULTIMATE_VALUE[archetype](p), currentLocale()),
  })
}

/** Options `Select` des sept archétypes (admin). */
export const ARCHETYPE_OPTIONS = CARD_ARCHETYPES.map((archetype) => ({
  value: archetype,
  label: archetypeName(archetype),
}))
