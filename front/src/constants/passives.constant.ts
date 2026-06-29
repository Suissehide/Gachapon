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
