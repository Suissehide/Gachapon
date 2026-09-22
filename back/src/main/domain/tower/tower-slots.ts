import { CardElement, EquipmentSlot } from '../../../generated/client'
import { getCurrentLocale } from '../../infra/i18n/locale-context'

/**
 * Les quatre tours élémentaires du cycle (§6 design spec). `LIGHT` et `DARK`
 * n'ont pas de tour et restent des jokers neutres — c'est leur valeur propre.
 *
 * Rien au niveau base n'empêche une tour `LIGHT`/`DARK` : `TowerFloor.element`
 * est typé `CardElement`, qui porte six valeurs. Cette constante est donc la
 * SEULE garantie que le jeu ne seedera ni ne tirera jamais de tour hors cycle
 * — itérer sur elle plutôt que sur `CardElement` partout où « les 4 tours »
 * doit être énuméré.
 */
export const TOWER_ELEMENTS = [
  CardElement.FIRE,
  CardElement.WATER,
  CardElement.NATURE,
  CardElement.EARTH,
] as const

export type TowerElement = (typeof TOWER_ELEMENTS)[number]

/** Nombre d'étages par tour (§6 design spec). */
export const TOWER_FLOOR_COUNT = 10

/**
 * Tour = slot (une tour alimente un slot, tous sets confondus — §6/§8 design
 * spec). Source UNIQUE partagée par le seed (`prisma/seed/tower.ts`) et le
 * tirage de drop de tour (domaine) : ne jamais recopier cette table
 * ailleurs, sous peine qu'une tour drope un slot différent de celui que
 * l'écran annonce.
 */
export const TOWER_SLOT_BY_ELEMENT: Record<TowerElement, EquipmentSlot> = {
  [CardElement.FIRE]: EquipmentSlot.GLOVES,
  [CardElement.WATER]: EquipmentSlot.BOOTS,
  [CardElement.NATURE]: EquipmentSlot.AMULET,
  [CardElement.EARTH]: EquipmentSlot.BELT,
}

/**
 * Nom propre de chaque tour. Source UNIQUE : le seed s'en servait seul, pour
 * fabriquer les libellés d'étage, et le front reconstruisait de son côté un
 * titre « Tour Feu » à partir du nom d'élément — d'où deux noms pour la même
 * tour dans le même écran.
 */
export const TOWER_NAME_BY_ELEMENT: Record<TowerElement, string> = {
  [CardElement.FIRE]: 'Tour de Braise',
  [CardElement.WATER]: 'Tour de Prisme',
  [CardElement.NATURE]: 'Tour de Sève',
  [CardElement.EARTH]: 'Tour de Monolithe',
}

/**
 * Traduction anglaise de `TOWER_NAME_BY_ELEMENT`. Vit ici, à côté du
 * français, et non dans `content/tower.definitions.ts` où elle était
 * née : elle y servait au seul libellé d'étage, si bien qu'un joueur
 * anglophone lisait « Ember Tower — floor 3 » sous un titre
 * « Tour de Braise », le nom de tour n'étant pas traduit.
 */
export const TOWER_NAME_EN_BY_ELEMENT: Record<TowerElement, string> = {
  [CardElement.FIRE]: 'Ember Tower',
  [CardElement.WATER]: 'Prism Tower',
  [CardElement.NATURE]: 'Sap Tower',
  [CardElement.EARTH]: 'Monolith Tower',
}

/**
 * Nom de tour dans la locale de la requête courante.
 *
 * Le nom de tour n'est pas du contenu de base : il est calculé en code, il
 * n'a donc ni colonne `*Fr`/`*En` ni repli à faire — les deux langues
 * existent toujours. `getCurrentLocale()` retombe sur `DEFAULT_LOCALE` hors
 * requête (tâches de fond, scripts), ce qui est le bon défaut ici.
 */
export function towerName(element: TowerElement): string {
  return getCurrentLocale() === 'FR'
    ? TOWER_NAME_BY_ELEMENT[element]
    : TOWER_NAME_EN_BY_ELEMENT[element]
}

/**
 * Les slots réservés aux tours — dérivés de `TOWER_SLOT_BY_ELEMENT`, jamais
 * recopiés. C'est la seule liste qui énumère ces slots par leur nom.
 */
export const TOWER_EQUIPMENT_SLOTS: readonly EquipmentSlot[] = Object.values(
  TOWER_SLOT_BY_ELEMENT,
)

/**
 * Les slots que la campagne a le droit de faire dropper (§5/§6 design spec :
 * « la campagne garde l'or, la poussière et les cartes, la tour a
 * l'équipement »). Calculé comme le complément de `TOWER_EQUIPMENT_SLOTS`
 * dans l'enum `EquipmentSlot` plutôt que recopié, pour qu'un futur slot de
 * tour se retire automatiquement du pool de la campagne sans toucher ce
 * fichier ailleurs.
 */
export const CAMPAIGN_EQUIPMENT_SLOTS: readonly EquipmentSlot[] = Object.values(
  EquipmentSlot,
).filter((slot) => !TOWER_EQUIPMENT_SLOTS.includes(slot))
