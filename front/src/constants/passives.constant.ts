export type PassiveLabel = {
  name: string
  describe: (palier: number) => string
}

export const PASSIVE_LABELS: Record<string, PassiveLabel> = {
  VAMPIRISM: {
    name: 'Vampirisme',
    describe: (p) => `Soigne ${10 + 5 * p} % des dégâts infligés.`,
  },
  AEGIS: {
    name: 'Égide',
    describe: (p) => `${5 + 2 * p} % de chance d'ignorer une attaque.`,
  },
  BANNER: {
    name: 'Bannière',
    describe: (p) => `+${6 + 3 * p} % d'ATQ à toute l'équipe.`,
  },
  RIPOSTE: {
    name: 'Riposte',
    describe: (p) => `Renvoie ${8 + 4 * p} % des dégâts subis.`,
  },
  REBIRTH: {
    name: 'Renaissance',
    describe: (p) => `Ressuscite une fois à ${20 + 5 * p} % de PV.`,
  },
  EXECUTION: {
    name: 'Exécution',
    describe: (p) => `+${20 + 5 * p} % de dégâts sous 30 % de PV cible.`,
  },
  VIGOR: {
    name: 'Vigueur',
    describe: (p) => `+${8 + 2 * p} % de PV max.`,
  },
  HASTE: {
    name: 'Célérité',
    describe: (p) => `+${6 + 2 * p} % de vitesse.`,
  },
  FORTIFY: {
    name: 'Fortification',
    describe: (p) => `+${10 + 4 * p} % de défense.`,
  },
  EMPOWER: {
    name: 'Puissance',
    describe: (p) => `+${6 + 2 * p} % d'ATQ.`,
  },
  BULWARK: {
    name: 'Bouclier',
    describe: (p) => `Absorbe un bouclier de ${12 + 3 * p} % des PV max.`,
  },
  FURY: {
    name: 'Furie',
    describe: (p) => `+${12 + 4 * p} % d'ATQ sous 50 % de PV.`,
  },
  CRIT: {
    name: 'Précision',
    describe: (p) => `${8 + 3 * p} % de chance d'infliger le double des dégâts.`,
  },
  PIERCE: {
    name: 'Perce-armure',
    describe: (p) => `Ignore ${15 + 5 * p} % de la défense de la cible.`,
  },
  NEMESIS: {
    name: 'Vengeance',
    describe: (p) => `+${6 + 2 * p} % d'ATQ par allié tombé.`,
  },
  RAMPART: {
    name: 'Rempart',
    describe: (p) => `Réduit de ${6 + 2 * p} % les dégâts subis.`,
  },
  REGEN: {
    name: 'Régénération',
    describe: (p) => `Soigne ${4 + 2 * p} % des PV max en fin de tour.`,
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
