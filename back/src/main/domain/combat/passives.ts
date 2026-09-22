import { getCurrentLocale } from '../../infra/i18n/locale-context'
import type { CardRarity } from '../../types/domain/gacha/gacha.types'
import { PASSIVE_TEXT } from '../content/passives.definitions'

export type PassiveKey =
  | 'VAMPIRISM'
  | 'AEGIS'
  | 'BANNER'
  | 'RIPOSTE'
  | 'REBIRTH'
  | 'EXECUTION'
  // --- Nouveaux passifs ---
  | 'VIGOR'
  | 'HASTE'
  | 'FORTIFY'
  | 'EMPOWER'
  | 'BULWARK'
  | 'FURY'
  | 'CRIT'
  | 'PIERCE'
  | 'NEMESIS'
  | 'RAMPART'
  | 'REGEN'
  // --- Passifs de famille (soin d'allié, dégâts sur la durée, soin sur élimination) ---
  | 'BLESSING'
  | 'SANCTUARY'
  | 'BURN'
  | 'POISON'
  | 'BLOODLUST'

export interface PassiveEffect {
  /**
   * Numeric value of the passive at a given palier.
   * - Percent-based passives (e.g. VAMPIRISM, AEGIS, BANNER, RIPOSTE, REBIRTH, EXECUTION)
   *   return percent (e.g. 15 for 15%).
   */
  valuePct: number
}

export interface PassiveDefinition {
  key: PassiveKey
  rarityHint: Extract<CardRarity, 'EPIC' | 'LEGENDARY'>
  /** Short label for UI, dans la locale de la requête courante. */
  label: string
  /** Compute the passive's effect for a given palier (1..6) */
  compute(palier: number): PassiveEffect
  /** Human-readable description (uses palier-resolved value), dans la locale de la requête courante. */
  describe(palier: number): string
}

function clampPalier(palier: number): number {
  if (palier < 1) {
    return 1
  }
  if (palier > 6) {
    return 6
  }
  return palier
}

/**
 * Résout le libellé/la description d'un passif dans la locale de la requête
 * courante. Lu à l'accès (getter pour `label`, appel pour `describe()`), pas
 * mémorisé : `PASSIVES` est un singleton de module partagé par toutes les
 * requêtes, donc rien ici ne doit figer une valeur au premier lecteur — voir
 * l'ATTENTION de `localized.extension.ts` sur ce même piège côté Prisma.
 */
function localizedLabel(key: PassiveKey): string {
  const text = PASSIVE_TEXT[key]
  return getCurrentLocale() === 'FR' ? text.labelFr : text.labelEn
}

function localizedDescribe(key: PassiveKey, palier: number): string {
  const text = PASSIVE_TEXT[key]
  return getCurrentLocale() === 'FR'
    ? text.describeFr(palier)
    : text.describeEn(palier)
}

export const PASSIVES: Record<PassiveKey, PassiveDefinition> = {
  VAMPIRISM: {
    key: 'VAMPIRISM',
    rarityHint: 'EPIC',
    get label() {
      return localizedLabel('VAMPIRISM')
    },
    // La magnitude du vol de vie appartient désormais au stuff (lifesteal).
    // Le passif apporte ce qu'aucun équipement ne peut donner : un doublement
    // conditionnel, sous 50 % de PV.
    compute() {
      return { valuePct: 100 } // bonus de lifesteal en pourcentage relatif
    },
    describe() {
      return localizedDescribe('VAMPIRISM', 0)
    },
  },
  AEGIS: {
    key: 'AEGIS',
    rarityHint: 'EPIC',
    get label() {
      return localizedLabel('AEGIS')
    },
    compute(palier) {
      const p = clampPalier(palier)
      return { valuePct: 5 + 2 * p }
    },
    describe(palier) {
      return localizedDescribe('AEGIS', clampPalier(palier))
    },
  },
  BANNER: {
    key: 'BANNER',
    rarityHint: 'EPIC',
    get label() {
      return localizedLabel('BANNER')
    },
    compute(palier) {
      const p = clampPalier(palier)
      return { valuePct: 6 + 3 * p }
    },
    describe(palier) {
      return localizedDescribe('BANNER', clampPalier(palier))
    },
  },
  RIPOSTE: {
    key: 'RIPOSTE',
    rarityHint: 'EPIC',
    get label() {
      return localizedLabel('RIPOSTE')
    },
    compute(palier) {
      const p = clampPalier(palier)
      return { valuePct: 8 + 4 * p }
    },
    describe(palier) {
      return localizedDescribe('RIPOSTE', clampPalier(palier))
    },
  },
  REBIRTH: {
    key: 'REBIRTH',
    rarityHint: 'LEGENDARY',
    get label() {
      return localizedLabel('REBIRTH')
    },
    compute(palier) {
      const p = clampPalier(palier)
      return { valuePct: 20 + 5 * p }
    },
    describe(palier) {
      return localizedDescribe('REBIRTH', clampPalier(palier))
    },
  },
  EXECUTION: {
    key: 'EXECUTION',
    rarityHint: 'LEGENDARY',
    get label() {
      return localizedLabel('EXECUTION')
    },
    compute(palier) {
      const p = clampPalier(palier)
      return { valuePct: 20 + 5 * p }
    },
    describe(palier) {
      return localizedDescribe('EXECUTION', clampPalier(palier))
    },
  },

  // -------------------------------------------------------------------------
  // Nouveaux passifs
  // -------------------------------------------------------------------------

  // Tâche 10 : VIGOR, HASTE, FORTIFY et EMPOWER dupliquaient un bonus
  // d'équipement figé (+X % PV/VIT/DEF/ATQ dès le début du combat) — un
  // équipement peut faire exactement ça, donc ce n'était pas un passif.
  // Ils deviennent dynamiques : second souffle, tour bonus par cadence,
  // empilement défensif/offensif — voir battle-simulator.domain.ts
  // (runActorTurn / resolveAttackOnTarget).
  VIGOR: {
    key: 'VIGOR',
    rarityHint: 'EPIC',
    get label() {
      return localizedLabel('VIGOR')
    },
    compute(palier) {
      const p = clampPalier(palier)
      return { valuePct: 20 + 4 * p } // part des PV max rendue
    },
    describe(palier) {
      return localizedDescribe('VIGOR', clampPalier(palier))
    },
  },
  HASTE: {
    key: 'HASTE',
    rarityHint: 'EPIC',
    get label() {
      return localizedLabel('HASTE')
    },
    compute() {
      return { valuePct: 3 } // cadence, en nombre d'actions
    },
    describe() {
      return localizedDescribe('HASTE', 0)
    },
  },
  FORTIFY: {
    key: 'FORTIFY',
    rarityHint: 'EPIC',
    get label() {
      return localizedLabel('FORTIFY')
    },
    compute(palier) {
      const p = clampPalier(palier)
      return { valuePct: 4 + 2 * p } // DEF gagnée par charge
    },
    describe(palier) {
      return localizedDescribe('FORTIFY', clampPalier(palier))
    },
  },
  EMPOWER: {
    key: 'EMPOWER',
    rarityHint: 'EPIC',
    get label() {
      return localizedLabel('EMPOWER')
    },
    compute(palier) {
      const p = clampPalier(palier)
      return { valuePct: 3 + p } // ATQ gagnée par charge
    },
    describe(palier) {
      return localizedDescribe('EMPOWER', clampPalier(palier))
    },
  },

  // Passif de statistiques appliqué une fois, en début de combat.
  BULWARK: {
    key: 'BULWARK',
    rarityHint: 'LEGENDARY',
    get label() {
      return localizedLabel('BULWARK')
    },
    compute(palier) {
      const p = clampPalier(palier)
      return { valuePct: 12 + 3 * p }
    },
    describe(palier) {
      return localizedDescribe('BULWARK', clampPalier(palier))
    },
  },

  // Passifs offensifs (appliqués à l'attaque)
  FURY: {
    key: 'FURY',
    rarityHint: 'EPIC',
    get label() {
      return localizedLabel('FURY')
    },
    compute(palier) {
      const p = clampPalier(palier)
      return { valuePct: 12 + 4 * p }
    },
    describe(palier) {
      return localizedDescribe('FURY', clampPalier(palier))
    },
  },
  CRIT: {
    key: 'CRIT',
    rarityHint: 'EPIC',
    get label() {
      return localizedLabel('CRIT')
    },
    // La magnitude du critique appartient désormais aux stats (critRate/critDmg).
    // Le passif apporte ce qu'aucun équipement ne peut donner : la certitude.
    compute() {
      return { valuePct: 3 } // cadence, en nombre d'actions
    },
    describe() {
      return localizedDescribe('CRIT', 0)
    },
  },
  PIERCE: {
    key: 'PIERCE',
    rarityHint: 'EPIC',
    get label() {
      return localizedLabel('PIERCE')
    },
    compute() {
      return { valuePct: 100 } // part de DEF ignorée au premier coup
    },
    describe() {
      return localizedDescribe('PIERCE', 0)
    },
  },
  NEMESIS: {
    key: 'NEMESIS',
    rarityHint: 'LEGENDARY',
    get label() {
      return localizedLabel('NEMESIS')
    },
    compute(palier) {
      const p = clampPalier(palier)
      return { valuePct: 6 + 2 * p }
    },
    describe(palier) {
      return localizedDescribe('NEMESIS', clampPalier(palier))
    },
  },

  // Passif défensif (appliqué à la défense)
  RAMPART: {
    key: 'RAMPART',
    rarityHint: 'EPIC',
    get label() {
      return localizedLabel('RAMPART')
    },
    compute(palier) {
      const p = clampPalier(palier)
      return { valuePct: 6 + 2 * p }
    },
    describe(palier) {
      return localizedDescribe('RAMPART', clampPalier(palier))
    },
  },

  // Passif de soin (appliqué en fin de tour)
  REGEN: {
    key: 'REGEN',
    rarityHint: 'EPIC',
    get label() {
      return localizedLabel('REGEN')
    },
    compute(palier) {
      const p = clampPalier(palier)
      return { valuePct: 4 + 2 * p }
    },
    describe(palier) {
      return localizedDescribe('REGEN', clampPalier(palier))
    },
  },

  // -------------------------------------------------------------------------
  // Passifs de famille — soin d'allié, dégâts sur la durée, soin sur élimination
  // -------------------------------------------------------------------------

  // Passifs de soin d'allié (appliqués en fin de tour)
  BLESSING: {
    key: 'BLESSING',
    rarityHint: 'LEGENDARY',
    get label() {
      return localizedLabel('BLESSING')
    },
    compute(palier) {
      const p = clampPalier(palier)
      return { valuePct: 6 + 2 * p }
    },
    describe(palier) {
      return localizedDescribe('BLESSING', clampPalier(palier))
    },
  },
  SANCTUARY: {
    key: 'SANCTUARY',
    rarityHint: 'EPIC',
    get label() {
      return localizedLabel('SANCTUARY')
    },
    compute(palier) {
      const p = clampPalier(palier)
      return { valuePct: 3 + p }
    },
    describe(palier) {
      return localizedDescribe('SANCTUARY', clampPalier(palier))
    },
  },

  // Passifs de dégâts sur la durée (appliqués à l'attaque, résolus en fin de tour)
  BURN: {
    key: 'BURN',
    rarityHint: 'EPIC',
    get label() {
      return localizedLabel('BURN')
    },
    compute(palier) {
      const p = clampPalier(palier)
      return { valuePct: 15 + 5 * p }
    },
    describe(palier) {
      return localizedDescribe('BURN', clampPalier(palier))
    },
  },
  POISON: {
    key: 'POISON',
    rarityHint: 'EPIC',
    get label() {
      return localizedLabel('POISON')
    },
    compute(palier) {
      const p = clampPalier(palier)
      return { valuePct: 4 + 2 * p }
    },
    describe(palier) {
      return localizedDescribe('POISON', clampPalier(palier))
    },
  },

  // Passif de soin sur élimination (appliqué après un coup fatal)
  BLOODLUST: {
    key: 'BLOODLUST',
    rarityHint: 'LEGENDARY',
    get label() {
      return localizedLabel('BLOODLUST')
    },
    compute(palier) {
      const p = clampPalier(palier)
      return { valuePct: 15 + 5 * p }
    },
    describe(palier) {
      return localizedDescribe('BLOODLUST', clampPalier(palier))
    },
  },
}

/**
 * Returns the passive definition for a key, or null if unknown.
 */
export function getPassive(
  key: string | null | undefined,
): PassiveDefinition | null {
  if (!key) {
    return null
  }
  return PASSIVES[key as PassiveKey] ?? null
}
