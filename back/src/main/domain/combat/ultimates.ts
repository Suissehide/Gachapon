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
 * (`ULTIMATE_CADENCE` actions), il remplace l'attaque simple par le schéma
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

/** Une action sur N est l'ultime. */
export const ULTIMATE_CADENCE = 3
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
  magnitude: (palier: number) => number,
): UltimateDefinition {
  const compute = (palier: number) => ({
    valuePct: magnitude(clampPalier(palier)),
  })
  return {
    archetype,
    kind,
    pattern,
    compute,
    get label() {
      const text = ULTIMATE_TEXT[archetype]
      return getCurrentLocale() === 'FR' ? text.labelFr : text.labelEn
    },
    describe(palier) {
      const text = ULTIMATE_TEXT[archetype]
      const { valuePct } = compute(palier)
      return getCurrentLocale() === 'FR'
        ? text.describeFr(valuePct)
        : text.describeEn(valuePct)
    },
  }
}

// Magnitudes calibrées au banc (scripts/ultimate-bench.ts) : chaque ultime
// vaut à peu près autant en stats d'équipe, l'invariant ultimate-power.test.ts
// garde la bande.
export const ULTIMATES: Record<CardArchetype, UltimateDefinition> = {
  MAGE: define('MAGE', 'ATTACK', 'AOE_3', (p) => 55 + 5 * p),
  RANGER: define('RANGER', 'ATTACK', 'MULTI_2', (p) => 80 + 6 * p),
  ASSASSIN: define('ASSASSIN', 'ATTACK', 'MONO_DOUBLE', (p) => 70 + 6 * p),
  FIGHTER: define('FIGHTER', 'ATTACK', 'MONO_AMPLIFIED', (p) => 160 + 15 * p),
  BALANCED: define('BALANCED', 'ATTACK', 'MONO_AMPLIFIED', (p) => 130 + 10 * p),
  TANK: define('TANK', 'SHIELD', null, (p) => 10 + 2 * p),
  SUPPORT: define('SUPPORT', 'HEAL', null, (p) => 8 + 2 * p),
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
