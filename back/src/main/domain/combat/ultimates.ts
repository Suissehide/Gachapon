import { getCurrentLocale } from '../../infra/i18n/locale-context'
import {
  CARD_ARCHETYPES,
  type CardArchetype,
} from '../../types/domain/combat/archetype.types'
import {
  ARCHETYPE_LABEL,
  ULTIMATE_TEXT,
} from '../content/ultimates.definitions'
import type { AttackPattern } from './battle-simulator.domain'
import { clampPalier } from './passives'

/**
 * Ultime d'une carte, déterminé par son archétype. Déclenché par cadence
 * (`cadence` actions jouées, propre à l'archétype), il remplace l'attaque simple par le schéma
 * de l'archétype (ATTACK) ou par un bouclier / soin d'équipe (SHIELD / HEAL).
 * Même magnitude pour toutes les raretés : seul le palier la fait grandir,
 * les stats de base font le reste.
 */
export type UltimateKind = 'ATTACK' | 'SHIELD' | 'HEAL'

export interface UltimateDefinition {
  archetype: CardArchetype
  kind: UltimateKind
  /** Schéma de frappe, ATTACK seulement. */
  pattern: AttackPattern | null
  /** Actions jouées entre deux ultimes : la jauge a autant de crans. */
  cadence: number
  /**
   * ATTACK : multiplicateur de dégâts par cible ou par coup, en % (100 = ×1).
   * SHIELD / HEAL : part des PV max de chaque allié, en %.
   */
  compute(palier: number): { valuePct: number }
  /** Libellé court de l'ultime, dans la locale de la requête courante. */
  readonly label: string
  /** Description au palier donné, dans la locale de la requête courante. */
  describe(palier: number): string
}

/** Le bouclier du Tank ne porte jamais un allié au-delà de cette part de ses PV max. */
export const ULTIMATE_SHIELD_CAP_PCT = 50

/**
 * Libellé de l'archétype lui-même, dans la locale de la requête courante.
 * Lu à l'accès, jamais mémorisé : voir l'ATTENTION de `passives.ts`.
 */
export function archetypeLabel(archetype: CardArchetype): string {
  const text = ARCHETYPE_LABEL[archetype]
  return getCurrentLocale() === 'FR' ? text.fr : text.en
}

function define(
  archetype: CardArchetype,
  kind: UltimateKind,
  pattern: AttackPattern | null,
  cadence: number,
  magnitude: (palier: number) => number,
): UltimateDefinition {
  const compute = (palier: number) => ({
    valuePct: magnitude(clampPalier(palier)),
  })
  return {
    archetype,
    kind,
    pattern,
    cadence,
    compute,
    get label() {
      const text = ULTIMATE_TEXT[archetype]
      return getCurrentLocale() === 'FR' ? text.labelFr : text.labelEn
    },
    describe(palier) {
      const text = ULTIMATE_TEXT[archetype]
      const { valuePct } = compute(palier)
      return getCurrentLocale() === 'FR'
        ? text.describeFr(valuePct, cadence)
        : text.describeEn(valuePct, cadence)
    },
  }
}

// Magnitudes calibrées au banc (scripts/ultimate-bench.ts) : chaque ultime
// vaut à peu près autant en stats d'équipe, l'invariant ultimate-power.test.ts
// garde la bande.
export const ULTIMATES: Record<CardArchetype, UltimateDefinition> = {
  MAGE: define('MAGE', 'ATTACK', 'AOE_3', 3, (p) => 55 + 5 * p),
  RANGER: define('RANGER', 'ATTACK', 'MULTI_2', 3, (p) => 80 + 6 * p),
  ASSASSIN: define('ASSASSIN', 'ATTACK', 'MONO_DOUBLE', 2, (p) => 62 + 6 * p),
  FIGHTER: define(
    'FIGHTER',
    'ATTACK',
    'MONO_AMPLIFIED',
    3,
    (p) => 150 + 13 * p,
  ),
  BALANCED: define(
    'BALANCED',
    'ATTACK',
    'MONO_AMPLIFIED',
    3,
    (p) => 140 + 11 * p,
  ),
  // Bouclier et soin touchent toute l'équipe toutes les trois actions : ils
  // ne valent presque rien dans un combat court et beaucoup dans un combat
  // long, d'où des parts de PV bien plus petites que les multiplicateurs.
  TANK: define('TANK', 'SHIELD', null, 4, (p) => 4 + 0.8 * p),
  SUPPORT: define('SUPPORT', 'HEAL', null, 4, (p) => 4 + 0.8 * p),
}

/** Définition d'ultime d'un archétype, ou null si la valeur est inconnue. */
export function getUltimate(
  archetype: string | null | undefined,
): UltimateDefinition | null {
  if (
    !archetype ||
    !(CARD_ARCHETYPES as readonly string[]).includes(archetype)
  ) {
    return null
  }
  return ULTIMATES[archetype as CardArchetype]
}
