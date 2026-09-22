import i18n from '../i18n/index.ts'

export type PassiveLabel = {
  name: string
  describe: (palier: number) => string
}

/**
 * Miroir volontaire de `clampPalier()` dans
 * `back/src/main/domain/combat/passives.ts`. Le back plafonne le calcul des
 * passifs au palier 6 — décision d'équilibrage délibérée, les ennemis
 * n'ayant pas de passifs — et ne compte pas monter ce plafond avec le palier
 * 7 des cartes. Le front doit reproduire exactement le même plafond pour ne
 * jamais afficher une valeur de passif que le combat n'applique pas.
 */
function clampPalierForPassiveDisplay(palier: number): number {
  if (palier < 1) {
    return 1
  }
  if (palier > 6) {
    return 6
  }
  return palier
}

export const PASSIVE_LABELS: Record<string, PassiveLabel> = {
  VAMPIRISM: {
    name: i18n.t('passives:VAMPIRISM.name'),
    // La magnitude du vol de vie appartient désormais au stuff (lifesteal) :
    // ce passif ne dépend plus du palier, il apporte un doublement
    // conditionnel sous 50 % de PV.
    describe: () => i18n.t('passives:VAMPIRISM.describe'),
  },
  AEGIS: {
    name: i18n.t('passives:AEGIS.name'),
    describe: (palier) => {
      const p = clampPalierForPassiveDisplay(palier)
      return i18n.t('passives:AEGIS.describe', { value: 5 + 2 * p })
    },
  },
  BANNER: {
    name: i18n.t('passives:BANNER.name'),
    describe: (palier) => {
      const p = clampPalierForPassiveDisplay(palier)
      return i18n.t('passives:BANNER.describe', { value: 6 + 3 * p })
    },
  },
  RIPOSTE: {
    name: i18n.t('passives:RIPOSTE.name'),
    describe: (palier) => {
      const p = clampPalierForPassiveDisplay(palier)
      return i18n.t('passives:RIPOSTE.describe', { value: 8 + 4 * p })
    },
  },
  REBIRTH: {
    name: i18n.t('passives:REBIRTH.name'),
    describe: (palier) => {
      const p = clampPalierForPassiveDisplay(palier)
      return i18n.t('passives:REBIRTH.describe', { value: 20 + 5 * p })
    },
  },
  EXECUTION: {
    name: i18n.t('passives:EXECUTION.name'),
    describe: (palier) => {
      const p = clampPalierForPassiveDisplay(palier)
      return i18n.t('passives:EXECUTION.describe', { value: 20 + 5 * p })
    },
  },
  VIGOR: {
    name: i18n.t('passives:VIGOR.name'),
    describe: (palier) => {
      const p = clampPalierForPassiveDisplay(palier)
      return i18n.t('passives:VIGOR.describe', { value: 20 + 4 * p })
    },
  },
  HASTE: {
    name: i18n.t('passives:HASTE.name'),
    // La cadence est fixe (toutes les 3 actions), plus de palier.
    describe: () => i18n.t('passives:HASTE.describe'),
  },
  FORTIFY: {
    name: i18n.t('passives:FORTIFY.name'),
    describe: (palier) => {
      const p = clampPalierForPassiveDisplay(palier)
      return i18n.t('passives:FORTIFY.describe', { value: 4 + 2 * p })
    },
  },
  EMPOWER: {
    name: i18n.t('passives:EMPOWER.name'),
    describe: (palier) => {
      const p = clampPalierForPassiveDisplay(palier)
      return i18n.t('passives:EMPOWER.describe', { value: 3 + p })
    },
  },
  BULWARK: {
    name: i18n.t('passives:BULWARK.name'),
    describe: (palier) => {
      const p = clampPalierForPassiveDisplay(palier)
      return i18n.t('passives:BULWARK.describe', { value: 12 + 3 * p })
    },
  },
  FURY: {
    name: i18n.t('passives:FURY.name'),
    describe: (palier) => {
      const p = clampPalierForPassiveDisplay(palier)
      return i18n.t('passives:FURY.describe', { value: 12 + 4 * p })
    },
  },
  CRIT: {
    name: i18n.t('passives:CRIT.name'),
    // La magnitude du critique appartient désormais aux stats (critRate/critDmg) :
    // ce passif ne dépend plus du palier, il apporte la certitude.
    describe: () => i18n.t('passives:CRIT.describe'),
  },
  PIERCE: {
    name: i18n.t('passives:PIERCE.name'),
    // Ne dépend plus du palier : le premier coup ignore toute la défense.
    describe: () => i18n.t('passives:PIERCE.describe'),
  },
  NEMESIS: {
    name: i18n.t('passives:NEMESIS.name'),
    describe: (palier) => {
      const p = clampPalierForPassiveDisplay(palier)
      return i18n.t('passives:NEMESIS.describe', { value: 6 + 2 * p })
    },
  },
  RAMPART: {
    name: i18n.t('passives:RAMPART.name'),
    describe: (palier) => {
      const p = clampPalierForPassiveDisplay(palier)
      return i18n.t('passives:RAMPART.describe', { value: 6 + 2 * p })
    },
  },
  REGEN: {
    name: i18n.t('passives:REGEN.name'),
    describe: (palier) => {
      const p = clampPalierForPassiveDisplay(palier)
      return i18n.t('passives:REGEN.describe', { value: 4 + 2 * p })
    },
  },
  BLESSING: {
    name: i18n.t('passives:BLESSING.name'),
    describe: (palier) => {
      const p = clampPalierForPassiveDisplay(palier)
      return i18n.t('passives:BLESSING.describe', { value: 6 + 2 * p })
    },
  },
  SANCTUARY: {
    name: i18n.t('passives:SANCTUARY.name'),
    describe: (palier) => {
      const p = clampPalierForPassiveDisplay(palier)
      return i18n.t('passives:SANCTUARY.describe', { value: 3 + p })
    },
  },
  BURN: {
    name: i18n.t('passives:BURN.name'),
    describe: (palier) => {
      const p = clampPalierForPassiveDisplay(palier)
      return i18n.t('passives:BURN.describe', { value: 15 + 5 * p })
    },
  },
  POISON: {
    name: i18n.t('passives:POISON.name'),
    describe: (palier) => {
      const p = clampPalierForPassiveDisplay(palier)
      return i18n.t('passives:POISON.describe', { value: 4 + 2 * p })
    },
  },
  BLOODLUST: {
    name: i18n.t('passives:BLOODLUST.name'),
    describe: (palier) => {
      const p = clampPalierForPassiveDisplay(palier)
      return i18n.t('passives:BLOODLUST.describe', { value: 15 + 5 * p })
    },
  },
}

export const describePassive = (
  passiveKey: string | null | undefined,
  palier: number,
): string | null => {
  if (!passiveKey) {
    return null
  }
  const def = PASSIVE_LABELS[passiveKey]
  if (!def) {
    return null
  }
  return `${def.name}. ${def.describe(palier)}`
}
