import type { CardRarity } from '../../types/domain/gacha/gacha.types'

export type PassiveKey =
  | 'VAMPIRISM'
  | 'AEGIS'
  | 'BANNER'
  | 'RIPOSTE'
  | 'REBIRTH'
  | 'EXECUTION'

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
  /** Short label for UI */
  label: string
  /** Compute the passive's effect for a given palier (1..6) */
  compute(palier: number): PassiveEffect
  /** Human-readable description (uses palier-resolved value) */
  describe(palier: number): string
}

function clampPalier(palier: number): number {
  if (palier < 1) { return 1 }
  if (palier > 6) { return 6 }
  return palier
}

export const PASSIVES: Record<PassiveKey, PassiveDefinition> = {
  VAMPIRISM: {
    key: 'VAMPIRISM',
    rarityHint: 'EPIC',
    label: 'Vampirisme',
    compute(palier) {
      const p = clampPalier(palier)
      return { valuePct: 10 + 5 * p }
    },
    describe(palier) {
      return `Soigne ${10 + 5 * clampPalier(palier)} % des dégâts infligés`
    },
  },
  AEGIS: {
    key: 'AEGIS',
    rarityHint: 'EPIC',
    label: 'Égide',
    compute(palier) {
      const p = clampPalier(palier)
      return { valuePct: 5 + 2 * p }
    },
    describe(palier) {
      return `${5 + 2 * clampPalier(palier)} % de chance d'ignorer une attaque`
    },
  },
  BANNER: {
    key: 'BANNER',
    rarityHint: 'EPIC',
    label: 'Bannière',
    compute(palier) {
      const p = clampPalier(palier)
      return { valuePct: 6 + 3 * p }
    },
    describe(palier) {
      return `+${6 + 3 * clampPalier(palier)} % d'ATQ à toute l'équipe`
    },
  },
  RIPOSTE: {
    key: 'RIPOSTE',
    rarityHint: 'EPIC',
    label: 'Riposte',
    compute(palier) {
      const p = clampPalier(palier)
      return { valuePct: 8 + 4 * p }
    },
    describe(palier) {
      return `Renvoie ${8 + 4 * clampPalier(palier)} % des dégâts subis`
    },
  },
  REBIRTH: {
    key: 'REBIRTH',
    rarityHint: 'LEGENDARY',
    label: 'Renaissance',
    compute(palier) {
      const p = clampPalier(palier)
      return { valuePct: 20 + 5 * p }
    },
    describe(palier) {
      return `Ressuscite une fois à ${20 + 5 * clampPalier(palier)} % de PV`
    },
  },
  EXECUTION: {
    key: 'EXECUTION',
    rarityHint: 'LEGENDARY',
    label: 'Exécution',
    compute(palier) {
      const p = clampPalier(palier)
      return { valuePct: 20 + 5 * p }
    },
    describe(palier) {
      return `+${20 + 5 * clampPalier(palier)} % de dégâts sous 30 % de PV cible`
    },
  },
}

/**
 * Returns the passive definition for a key, or null if unknown.
 */
export function getPassive(key: string | null | undefined): PassiveDefinition | null {
  if (!key) { return null }
  return PASSIVES[key as PassiveKey] ?? null
}
