import type { PassiveKey } from '../combat/passives'

/**
 * Textes des passifs de carte — libellé court et description dépendante du
 * palier (1..6), dans les deux langues.
 *
 * Contenu de jeu calculé en code (pas de ligne en base, pas de backfill de
 * traduction) : `passives.ts` résout la locale de la requête au moment de la
 * lecture. `describeFr`/`describeEn` prennent un palier DÉJÀ borné à [1, 6]
 * — `clampPalier` reste dans `passives.ts`, qui est aussi le seul appelant
 * de `compute()` ; le dupliquer ici recréerait la dépendance circulaire que
 * le `import type` ci-dessus évite précisément (cette définition ne dépend
 * de `passives.ts` qu'au niveau des TYPES, effacé à la compilation).
 */
export interface PassiveTextDefinition {
  labelFr: string
  labelEn: string
  describeFr: (palier: number) => string
  describeEn: (palier: number) => string
}

/** Valeur à une décimale au plus, avec la virgule en français (soins, poison). */
function pct(value: number, lang: 'fr' | 'en'): string {
  const rounded = Math.round(value * 10) / 10
  return lang === 'fr' ? String(rounded).replace('.', ',') : String(rounded)
}

export const PASSIVE_TEXT: Record<PassiveKey, PassiveTextDefinition> = {
  VAMPIRISM: {
    labelFr: 'Vampirisme',
    labelEn: 'Vampirism',
    describeFr: () => 'Sous 50 % de ses PV, son vol de vie est doublé',
    describeEn: () => 'Below 50% HP, its lifesteal is doubled',
  },
  AEGIS: {
    labelFr: 'Égide',
    labelEn: 'Aegis',
    describeFr: (p) => `${8 + 3 * p} % de chance d'ignorer une attaque`,
    describeEn: (p) => `${8 + 3 * p}% chance to ignore an attack`,
  },
  BANNER: {
    labelFr: 'Bannière',
    labelEn: 'Banner',
    describeFr: (p) => `+${2 + 2 * p} % d'ATQ à toute l'équipe`,
    describeEn: (p) => `+${2 + 2 * p}% ATK to the whole team`,
  },
  RIPOSTE: {
    labelFr: 'Riposte',
    labelEn: 'Riposte',
    describeFr: (p) => `Renvoie ${8 + 4 * p} % des dégâts subis`,
    describeEn: (p) => `Reflects ${8 + 4 * p}% of damage taken`,
  },
  REBIRTH: {
    labelFr: 'Renaissance',
    labelEn: 'Rebirth',
    describeFr: (p) => `Ressuscite une fois à ${20 + 5 * p} % de PV`,
    describeEn: (p) => `Revives once at ${20 + 5 * p}% HP`,
  },
  EXECUTION: {
    labelFr: 'Exécution',
    labelEn: 'Execution',
    describeFr: (p) =>
      `Jusqu'à +${60 + 15 * p} % de dégâts selon les PV manquants de la cible`,
    describeEn: (p) =>
      `Up to +${60 + 15 * p}% damage based on the target's missing HP`,
  },

  // -------------------------------------------------------------------------
  // Nouveaux passifs (tâche 10 du lot combat — voir passives.ts)
  // -------------------------------------------------------------------------
  VIGOR: {
    labelFr: 'Second souffle',
    labelEn: 'Second Wind',
    describeFr: (p) =>
      `La première fois que ses PV passent sous 50 % (y compris sur un coup normalement fatal, alors annulé), il récupère ${20 + 4 * p} % de ses PV max`,
    describeEn: (p) =>
      `The first time its HP drops below 50% (even on a hit that would normally be fatal, which is then cancelled), it recovers ${20 + 4 * p}% of its max HP`,
  },
  HASTE: {
    labelFr: 'Célérité',
    labelEn: 'Haste',
    describeFr: () => 'Toutes les 3 actions, il rejoue immédiatement',
    describeEn: () => 'Every 3 actions, it acts again immediately',
  },
  FORTIFY: {
    labelFr: 'Fortification',
    labelEn: 'Fortification',
    describeFr: (p) =>
      `Chaque coup encaissé lui donne +${10 + 5 * p} % de défense, cumulable 5 fois`,
    describeEn: (p) =>
      `Each hit taken grants +${10 + 5 * p}% DEF, stacking up to 5 times`,
  },
  EMPOWER: {
    labelFr: 'Puissance',
    labelEn: 'Empowerment',
    describeFr: (p) =>
      `Chaque attaque portée lui donne +${3 + p} % d'attaque, cumulable 5 fois`,
    describeEn: (p) =>
      `Each attack landed grants +${3 + p}% ATK, stacking up to 5 times`,
  },

  BULWARK: {
    labelFr: 'Bouclier',
    labelEn: 'Bulwark',
    describeFr: (p) => `Absorbe un bouclier de ${25 + 6 * p} % des PV max`,
    describeEn: (p) => `Absorbs a shield worth ${25 + 6 * p}% of max HP`,
  },

  FURY: {
    labelFr: 'Furie',
    labelEn: 'Fury',
    describeFr: (p) => `+${30 + 10 * p} % d'ATQ sous 50 % de PV`,
    describeEn: (p) => `+${30 + 10 * p}% ATK below 50% HP`,
  },
  CRIT: {
    labelFr: 'Précision',
    labelEn: 'Precision',
    describeFr: () => 'Toutes les 2 attaques, inflige un coup critique garanti',
    describeEn: () => 'Every 2 attacks, deals a guaranteed critical hit',
  },
  HAMPER: {
    labelFr: 'Entrave',
    labelEn: 'Shackle',
    describeFr: (p) =>
      `Chaque coup repousse de ${25 + 8 * p} % la jauge d'action de la cible`,
    describeEn: (p) =>
      `Each hit pushes the target's action gauge back by ${25 + 8 * p}%`,
  },
  NEMESIS: {
    labelFr: 'Vengeance',
    labelEn: 'Vengeance',
    describeFr: (p) =>
      `+${20 + 5 * p} % de dégâts contre les ennemis qui ont frappé un allié, doublé contre ceux qui en ont abattu un`,
    describeEn: (p) =>
      `+${20 + 5 * p}% damage against enemies that hit an ally, doubled against those that took one down`,
  },

  RAMPART: {
    labelFr: 'Rempart',
    labelEn: 'Rampart',
    describeFr: (p) => `Réduit de ${6 + 2 * p} % les dégâts subis`,
    describeEn: (p) => `Reduces damage taken by ${6 + 2 * p}%`,
  },

  REGEN: {
    labelFr: 'Régénération',
    labelEn: 'Regeneration',
    describeFr: (p) =>
      `Soigne ${pct((2 + p) / 2, 'fr')} % des PV max en fin de tour`,
    describeEn: (p) =>
      `Heals ${pct((2 + p) / 2, 'en')}% of max HP at the end of the turn`,
  },

  // -------------------------------------------------------------------------
  // Passifs de famille — soin d'allié, dégâts sur la durée, soin sur élimination
  // -------------------------------------------------------------------------
  BLESSING: {
    labelFr: 'Bénédiction',
    labelEn: 'Blessing',
    describeFr: (p) =>
      `Soigne l'allié le plus faible de ${pct((3 + p) / 2, 'fr')} % de ses PV max en fin de tour`,
    describeEn: (p) =>
      `Heals the weakest ally for ${pct((3 + p) / 2, 'en')}% of their max HP at the end of the turn`,
  },
  SANCTUARY: {
    labelFr: 'Sanctuaire',
    labelEn: 'Sanctuary',
    describeFr: (p) =>
      `Soigne toute l'équipe de ${pct((3 + 2 * p) / 10, 'fr')} % des PV max en fin de tour`,
    describeEn: (p) =>
      `Heals the whole team for ${pct((3 + 2 * p) / 10, 'en')}% of max HP at the end of the turn`,
  },

  BURN: {
    labelFr: 'Brûlure',
    labelEn: 'Burn',
    describeFr: (p) =>
      `Inflige une brûlure : ${4 + 2 * p} % de l'ATQ par tour pendant 2 tours`,
    describeEn: (p) =>
      `Inflicts a burn: ${4 + 2 * p}% of ATK per turn for 2 turns`,
  },
  POISON: {
    labelFr: 'Poison',
    labelEn: 'Poison',
    describeFr: (p) =>
      `Empoisonne la cible : ${pct((2 + 3 * p) / 10, 'fr')} % de ses PV max par tour pendant 2 tours`,
    describeEn: (p) =>
      `Poisons the target: ${pct((2 + 3 * p) / 10, 'en')}% of its max HP per turn for 2 turns`,
  },

  MOMENTUM: {
    labelFr: 'Élan',
    labelEn: 'Momentum',
    describeFr: (p) =>
      `Après chaque action, fait avancer de ${20 + 7 * p} % la jauge de l'allié le plus en retard`,
    describeEn: (p) =>
      `After each action, advances the most delayed ally's action gauge by ${20 + 7 * p}%`,
  },
}
