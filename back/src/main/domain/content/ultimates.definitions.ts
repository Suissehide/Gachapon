import type { CardArchetype } from '../../types/domain/combat/archetype.types'

/**
 * Textes des archétypes et de leurs ultimes — libellé court et description
 * dépendante du palier (1..6), dans les deux langues.
 *
 * Même contrat que `passives.definitions.ts` : contenu calculé en code,
 * `describeFr`/`describeEn` reçoivent un palier DÉJÀ borné à [1, 6] et la
 * magnitude déjà résolue par `ultimates.ts`, seul appelant de `compute()`.
 * Rien ici ne dépend du domaine autrement que par ses types.
 */
export interface UltimateTextDefinition {
  labelFr: string
  labelEn: string
  describeFr: (valuePct: number) => string
  describeEn: (valuePct: number) => string
}

/** Nom de l'archétype lui-même (la carte « est » un Tank, un Mage…). */
export const ARCHETYPE_LABEL: Record<
  CardArchetype,
  { fr: string; en: string }
> = {
  TANK: { fr: 'Tank', en: 'Tank' },
  SUPPORT: { fr: 'Soutien', en: 'Support' },
  FIGHTER: { fr: 'Combattant', en: 'Fighter' },
  BALANCED: { fr: 'Équilibré', en: 'Balanced' },
  RANGER: { fr: 'Tireur', en: 'Ranger' },
  ASSASSIN: { fr: 'Assassin', en: 'Assassin' },
  MAGE: { fr: 'Mage', en: 'Mage' },
}

/** Valeur à une décimale au plus, avec la virgule en français (bouclier, soin). */
function pct(value: number, lang: 'fr' | 'en'): string {
  const rounded = Math.round(value * 10) / 10
  return lang === 'fr' ? String(rounded).replace('.', ',') : String(rounded)
}

export const ULTIMATE_TEXT: Record<CardArchetype, UltimateTextDefinition> = {
  MAGE: {
    labelFr: 'Déluge',
    labelEn: 'Deluge',
    describeFr: (v) =>
      `Une action sur trois, frappe tous les ennemis à ${v} % de ses dégâts`,
    describeEn: (v) =>
      `Every third action, hits every enemy for ${v}% of its damage`,
  },
  RANGER: {
    labelFr: 'Tir double',
    labelEn: 'Twin Shot',
    describeFr: (v) =>
      `Une action sur trois, frappe deux ennemis à ${v} % de ses dégâts`,
    describeEn: (v) =>
      `Every third action, hits two enemies for ${v}% of its damage`,
  },
  ASSASSIN: {
    labelFr: 'Lames jumelles',
    labelEn: 'Twin Blades',
    describeFr: (v) =>
      `Une action sur trois, frappe deux fois la même cible à ${v} % de ses dégâts`,
    describeEn: (v) =>
      `Every third action, hits the same target twice for ${v}% of its damage`,
  },
  FIGHTER: {
    labelFr: 'Coup de boutoir',
    labelEn: 'Crushing Blow',
    describeFr: (v) =>
      `Une action sur trois, porte un coup à ${v} % de ses dégâts`,
    describeEn: (v) =>
      `Every third action, lands a single blow for ${v}% of its damage`,
  },
  BALANCED: {
    labelFr: 'Assaut',
    labelEn: 'Onslaught',
    describeFr: (v) =>
      `Une action sur trois, porte un coup à ${v} % de ses dégâts`,
    describeEn: (v) =>
      `Every third action, lands a single blow for ${v}% of its damage`,
  },
  TANK: {
    labelFr: 'Mur de boucliers',
    labelEn: 'Shield Wall',
    describeFr: (v) =>
      `Une action sur trois, au lieu d'attaquer, donne à chaque allié un bouclier de ${pct(v, 'fr')} % de ses PV max`,
    describeEn: (v) =>
      `Every third action, instead of attacking, grants every ally a shield worth ${pct(v, 'en')}% of their max HP`,
  },
  SUPPORT: {
    labelFr: 'Prière',
    labelEn: 'Prayer',
    describeFr: (v) =>
      `Une action sur trois, au lieu d'attaquer, soigne chaque allié de ${pct(v, 'fr')} % de ses PV max`,
    describeEn: (v) =>
      `Every third action, instead of attacking, heals every ally for ${pct(v, 'en')}% of their max HP`,
  },
}
