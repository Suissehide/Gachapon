import type { CardRarity } from '../../types/domain/gacha/gacha.types'

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
  /** Short label for UI */
  label: string
  /** Compute the passive's effect for a given palier (1..6) */
  compute(palier: number): PassiveEffect
  /** Human-readable description (uses palier-resolved value) */
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

  // -------------------------------------------------------------------------
  // Nouveaux passifs
  // -------------------------------------------------------------------------

  // Passifs de statistiques (appliqués en début de combat)
  VIGOR: {
    key: 'VIGOR',
    rarityHint: 'EPIC',
    label: 'Vigueur',
    compute(palier) {
      const p = clampPalier(palier)
      return { valuePct: 8 + 2 * p }
    },
    describe(palier) {
      return `+${8 + 2 * clampPalier(palier)} % de PV max`
    },
  },
  HASTE: {
    key: 'HASTE',
    rarityHint: 'EPIC',
    label: 'Célérité',
    compute(palier) {
      const p = clampPalier(palier)
      return { valuePct: 6 + 2 * p }
    },
    describe(palier) {
      return `+${6 + 2 * clampPalier(palier)} % de vitesse`
    },
  },
  FORTIFY: {
    key: 'FORTIFY',
    rarityHint: 'EPIC',
    label: 'Fortification',
    compute(palier) {
      const p = clampPalier(palier)
      return { valuePct: 10 + 4 * p }
    },
    describe(palier) {
      return `+${10 + 4 * clampPalier(palier)} % de défense`
    },
  },
  EMPOWER: {
    key: 'EMPOWER',
    rarityHint: 'EPIC',
    label: 'Puissance',
    compute(palier) {
      const p = clampPalier(palier)
      return { valuePct: 6 + 2 * p }
    },
    describe(palier) {
      return `+${6 + 2 * clampPalier(palier)} % d'ATQ`
    },
  },
  BULWARK: {
    key: 'BULWARK',
    rarityHint: 'LEGENDARY',
    label: 'Bouclier',
    compute(palier) {
      const p = clampPalier(palier)
      return { valuePct: 12 + 3 * p }
    },
    describe(palier) {
      return `Absorbe un bouclier de ${12 + 3 * clampPalier(palier)} % des PV max`
    },
  },

  // Passifs offensifs (appliqués à l'attaque)
  FURY: {
    key: 'FURY',
    rarityHint: 'EPIC',
    label: 'Furie',
    compute(palier) {
      const p = clampPalier(palier)
      return { valuePct: 12 + 4 * p }
    },
    describe(palier) {
      return `+${12 + 4 * clampPalier(palier)} % d'ATQ sous 50 % de PV`
    },
  },
  CRIT: {
    key: 'CRIT',
    rarityHint: 'EPIC',
    label: 'Précision',
    compute(palier) {
      const p = clampPalier(palier)
      return { valuePct: 8 + 3 * p }
    },
    describe(palier) {
      return `${8 + 3 * clampPalier(palier)} % de chance d'infliger le double des dégâts`
    },
  },
  PIERCE: {
    key: 'PIERCE',
    rarityHint: 'EPIC',
    label: 'Perce-armure',
    compute(palier) {
      const p = clampPalier(palier)
      return { valuePct: 15 + 5 * p }
    },
    describe(palier) {
      return `Ignore ${15 + 5 * clampPalier(palier)} % de la défense de la cible`
    },
  },
  NEMESIS: {
    key: 'NEMESIS',
    rarityHint: 'LEGENDARY',
    label: 'Vengeance',
    compute(palier) {
      const p = clampPalier(palier)
      return { valuePct: 6 + 2 * p }
    },
    describe(palier) {
      return `+${6 + 2 * clampPalier(palier)} % d'ATQ par allié tombé`
    },
  },

  // Passif défensif (appliqué à la défense)
  RAMPART: {
    key: 'RAMPART',
    rarityHint: 'EPIC',
    label: 'Rempart',
    compute(palier) {
      const p = clampPalier(palier)
      return { valuePct: 6 + 2 * p }
    },
    describe(palier) {
      return `Réduit de ${6 + 2 * clampPalier(palier)} % les dégâts subis`
    },
  },

  // Passif de soin (appliqué en fin de tour)
  REGEN: {
    key: 'REGEN',
    rarityHint: 'EPIC',
    label: 'Régénération',
    compute(palier) {
      const p = clampPalier(palier)
      return { valuePct: 4 + 2 * p }
    },
    describe(palier) {
      return `Soigne ${4 + 2 * clampPalier(palier)} % des PV max en fin de tour`
    },
  },

  // -------------------------------------------------------------------------
  // Passifs de famille — soin d'allié, dégâts sur la durée, soin sur élimination
  // -------------------------------------------------------------------------

  // Passifs de soin d'allié (appliqués en fin de tour)
  BLESSING: {
    key: 'BLESSING',
    rarityHint: 'LEGENDARY',
    label: 'Bénédiction',
    compute(palier) {
      const p = clampPalier(palier)
      return { valuePct: 6 + 2 * p }
    },
    describe(palier) {
      return `Soigne l'allié le plus faible de ${6 + 2 * clampPalier(palier)} % de ses PV max en fin de tour`
    },
  },
  SANCTUARY: {
    key: 'SANCTUARY',
    rarityHint: 'EPIC',
    label: 'Sanctuaire',
    compute(palier) {
      const p = clampPalier(palier)
      return { valuePct: 3 + p }
    },
    describe(palier) {
      return `Soigne toute l'équipe de ${3 + clampPalier(palier)} % des PV max en fin de tour`
    },
  },

  // Passifs de dégâts sur la durée (appliqués à l'attaque, résolus en fin de tour)
  BURN: {
    key: 'BURN',
    rarityHint: 'EPIC',
    label: 'Brûlure',
    compute(palier) {
      const p = clampPalier(palier)
      return { valuePct: 15 + 5 * p }
    },
    describe(palier) {
      return `Inflige une brûlure : ${15 + 5 * clampPalier(palier)} % de l'ATQ par tour pendant 2 tours`
    },
  },
  POISON: {
    key: 'POISON',
    rarityHint: 'EPIC',
    label: 'Poison',
    compute(palier) {
      const p = clampPalier(palier)
      return { valuePct: 4 + 2 * p }
    },
    describe(palier) {
      return `Empoisonne la cible : ${4 + 2 * clampPalier(palier)} % de ses PV max par tour pendant 2 tours`
    },
  },

  // Passif de soin sur élimination (appliqué après un coup fatal)
  BLOODLUST: {
    key: 'BLOODLUST',
    rarityHint: 'LEGENDARY',
    label: 'Soif de sang',
    compute(palier) {
      const p = clampPalier(palier)
      return { valuePct: 15 + 5 * p }
    },
    describe(palier) {
      return `Se soigne de ${15 + 5 * clampPalier(palier)} % des PV max en éliminant un ennemi`
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
