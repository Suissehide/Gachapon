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
    name: 'Vampirisme',
    describe: (palier) => {
      const p = clampPalierForPassiveDisplay(palier)
      return `Soigne ${10 + 5 * p} % des dégâts infligés.`
    },
  },
  AEGIS: {
    name: 'Égide',
    describe: (palier) => {
      const p = clampPalierForPassiveDisplay(palier)
      return `${5 + 2 * p} % de chance d'ignorer une attaque.`
    },
  },
  BANNER: {
    name: 'Bannière',
    describe: (palier) => {
      const p = clampPalierForPassiveDisplay(palier)
      return `+${6 + 3 * p} % d'ATQ à toute l'équipe.`
    },
  },
  RIPOSTE: {
    name: 'Riposte',
    describe: (palier) => {
      const p = clampPalierForPassiveDisplay(palier)
      return `Renvoie ${8 + 4 * p} % des dégâts subis.`
    },
  },
  REBIRTH: {
    name: 'Renaissance',
    describe: (palier) => {
      const p = clampPalierForPassiveDisplay(palier)
      return `Ressuscite une fois à ${20 + 5 * p} % de PV.`
    },
  },
  EXECUTION: {
    name: 'Exécution',
    describe: (palier) => {
      const p = clampPalierForPassiveDisplay(palier)
      return `+${20 + 5 * p} % de dégâts sous 30 % de PV cible.`
    },
  },
  VIGOR: {
    name: 'Vigueur',
    describe: (palier) => {
      const p = clampPalierForPassiveDisplay(palier)
      return `+${8 + 2 * p} % de PV max.`
    },
  },
  HASTE: {
    name: 'Célérité',
    describe: (palier) => {
      const p = clampPalierForPassiveDisplay(palier)
      return `+${6 + 2 * p} % de vitesse.`
    },
  },
  FORTIFY: {
    name: 'Fortification',
    describe: (palier) => {
      const p = clampPalierForPassiveDisplay(palier)
      return `+${10 + 4 * p} % de défense.`
    },
  },
  EMPOWER: {
    name: 'Puissance',
    describe: (palier) => {
      const p = clampPalierForPassiveDisplay(palier)
      return `+${6 + 2 * p} % d'ATQ.`
    },
  },
  BULWARK: {
    name: 'Bouclier',
    describe: (palier) => {
      const p = clampPalierForPassiveDisplay(palier)
      return `Absorbe un bouclier de ${12 + 3 * p} % des PV max.`
    },
  },
  FURY: {
    name: 'Furie',
    describe: (palier) => {
      const p = clampPalierForPassiveDisplay(palier)
      return `+${12 + 4 * p} % d'ATQ sous 50 % de PV.`
    },
  },
  CRIT: {
    name: 'Précision',
    describe: (palier) => {
      const p = clampPalierForPassiveDisplay(palier)
      return `${8 + 3 * p} % de chance d'infliger le double des dégâts.`
    },
  },
  PIERCE: {
    name: 'Perce-armure',
    describe: (palier) => {
      const p = clampPalierForPassiveDisplay(palier)
      return `Ignore ${15 + 5 * p} % de la défense de la cible.`
    },
  },
  NEMESIS: {
    name: 'Vengeance',
    describe: (palier) => {
      const p = clampPalierForPassiveDisplay(palier)
      return `+${6 + 2 * p} % d'ATQ par allié tombé.`
    },
  },
  RAMPART: {
    name: 'Rempart',
    describe: (palier) => {
      const p = clampPalierForPassiveDisplay(palier)
      return `Réduit de ${6 + 2 * p} % les dégâts subis.`
    },
  },
  REGEN: {
    name: 'Régénération',
    describe: (palier) => {
      const p = clampPalierForPassiveDisplay(palier)
      return `Soigne ${4 + 2 * p} % des PV max en fin de tour.`
    },
  },
  BLESSING: {
    name: 'Bénédiction',
    describe: (palier) => {
      const p = clampPalierForPassiveDisplay(palier)
      return `Soigne l'allié le plus faible de ${6 + 2 * p} % de ses PV max en fin de tour.`
    },
  },
  SANCTUARY: {
    name: 'Sanctuaire',
    describe: (palier) => {
      const p = clampPalierForPassiveDisplay(palier)
      return `Soigne toute l'équipe de ${3 + p} % des PV max en fin de tour.`
    },
  },
  BURN: {
    name: 'Brûlure',
    describe: (palier) => {
      const p = clampPalierForPassiveDisplay(palier)
      return `Inflige une brûlure : ${15 + 5 * p} % de l'ATQ par tour pendant 2 tours.`
    },
  },
  POISON: {
    name: 'Poison',
    describe: (palier) => {
      const p = clampPalierForPassiveDisplay(palier)
      return `Empoisonne la cible : ${4 + 2 * p} % de ses PV max par tour pendant 2 tours.`
    },
  },
  BLOODLUST: {
    name: 'Soif de sang',
    describe: (palier) => {
      const p = clampPalierForPassiveDisplay(palier)
      return `Se soigne de ${15 + 5 * p} % des PV max en éliminant un ennemi.`
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
