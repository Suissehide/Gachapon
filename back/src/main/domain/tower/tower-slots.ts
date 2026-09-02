import { CardElement, EquipmentSlot } from '../../../generated/client'

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
