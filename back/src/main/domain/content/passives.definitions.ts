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
    describeFr: (p) => `${5 + 2 * p} % de chance d'ignorer une attaque`,
    describeEn: (p) => `${5 + 2 * p}% chance to ignore an attack`,
  },
  BANNER: {
    labelFr: 'Bannière',
    labelEn: 'Banner',
    describeFr: (p) => `+${6 + 3 * p} % d'ATQ à toute l'équipe`,
    describeEn: (p) => `+${6 + 3 * p}% ATK to the whole team`,
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
    describeFr: (p) => `+${20 + 5 * p} % de dégâts sous 30 % de PV cible`,
    describeEn: (p) => `+${20 + 5 * p}% damage against targets under 30% HP`,
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
      `Chaque coup encaissé lui donne +${4 + 2 * p} % de défense, cumulable 5 fois`,
    describeEn: (p) =>
      `Each hit taken grants +${4 + 2 * p}% DEF, stacking up to 5 times`,
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
    describeFr: (p) => `Absorbe un bouclier de ${12 + 3 * p} % des PV max`,
    describeEn: (p) => `Absorbs a shield worth ${12 + 3 * p}% of max HP`,
  },

  FURY: {
    labelFr: 'Furie',
    labelEn: 'Fury',
    describeFr: (p) => `+${12 + 4 * p} % d'ATQ sous 50 % de PV`,
    describeEn: (p) => `+${12 + 4 * p}% ATK below 50% HP`,
  },
  CRIT: {
    labelFr: 'Précision',
    labelEn: 'Precision',
    describeFr: () => 'Toutes les 3 attaques, inflige un coup critique garanti',
    describeEn: () => 'Every 3 attacks, deals a guaranteed critical hit',
  },
  PIERCE: {
    labelFr: 'Perce-armure',
    labelEn: 'Armor Piercer',
    describeFr: () =>
      'Le premier coup porté à chaque cible ignore toute sa défense',
    describeEn: () => 'The first hit on each target ignores all of its defense',
  },
  NEMESIS: {
    labelFr: 'Vengeance',
    labelEn: 'Vengeance',
    describeFr: (p) => `+${6 + 2 * p} % d'ATQ par allié tombé`,
    describeEn: (p) => `+${6 + 2 * p}% ATK per fallen ally`,
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
    describeFr: (p) => `Soigne ${4 + 2 * p} % des PV max en fin de tour`,
    describeEn: (p) => `Heals ${4 + 2 * p}% of max HP at the end of the turn`,
  },

  // -------------------------------------------------------------------------
  // Passifs de famille — soin d'allié, dégâts sur la durée, soin sur élimination
  // -------------------------------------------------------------------------
  BLESSING: {
    labelFr: 'Bénédiction',
    labelEn: 'Blessing',
    describeFr: (p) =>
      `Soigne l'allié le plus faible de ${6 + 2 * p} % de ses PV max en fin de tour`,
    describeEn: (p) =>
      `Heals the weakest ally for ${6 + 2 * p}% of their max HP at the end of the turn`,
  },
  SANCTUARY: {
    labelFr: 'Sanctuaire',
    labelEn: 'Sanctuary',
    describeFr: (p) =>
      `Soigne toute l'équipe de ${3 + p} % des PV max en fin de tour`,
    describeEn: (p) =>
      `Heals the whole team for ${3 + p}% of max HP at the end of the turn`,
  },

  BURN: {
    labelFr: 'Brûlure',
    labelEn: 'Burn',
    describeFr: (p) =>
      `Inflige une brûlure : ${15 + 5 * p} % de l'ATQ par tour pendant 2 tours`,
    describeEn: (p) =>
      `Inflicts a burn: ${15 + 5 * p}% of ATK per turn for 2 turns`,
  },
  POISON: {
    labelFr: 'Poison',
    labelEn: 'Poison',
    describeFr: (p) =>
      `Empoisonne la cible : ${4 + 2 * p} % de ses PV max par tour pendant 2 tours`,
    describeEn: (p) =>
      `Poisons the target: ${4 + 2 * p}% of its max HP per turn for 2 turns`,
  },

  BLOODLUST: {
    labelFr: 'Soif de sang',
    labelEn: 'Bloodlust',
    describeFr: (p) =>
      `Se soigne de ${15 + 5 * p} % des PV max en éliminant un ennemi`,
    describeEn: (p) =>
      `Heals for ${15 + 5 * p}% of max HP when finishing off an enemy`,
  },
}
