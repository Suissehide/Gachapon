// Tirage de la pièce garantie d'un run de tour (§6 design spec). Module pur :
// le PRNG est injecté, aucune lecture de config ni de base ici.
//
// « Une pièce garantie par run, jamais zéro » : le slot est dicté par la tour
// (jamais tiré), le set est tiré uniformément parmi les 4, et seule la
// rareté dépend de l'étage — c'est le seul axe difficile.
//
// Ordre des appels au PRNG, fixé une fois pour toutes : SET d'abord,
// RARETÉ ensuite. Les tests en dépendent ; le changer casserait tout log
// rejouable.

import { SET_KEYS, type SetKey } from '../equipment/set-bonuses'
import { TOWER_SLOT_BY_ELEMENT, type TowerElement } from './tower-slots'

export interface TowerDrop {
  slot: string
  setKey: SetKey
  rarity: string
}

export function rollTowerDrop(input: {
  element: string
  weights: Record<string, number>
  prng: () => number
}): TowerDrop {
  const { element, weights, prng } = input
  const slot = TOWER_SLOT_BY_ELEMENT[element as TowerElement]
  if (!slot) {
    throw new Error(`Élément de tour inconnu : ${element}`)
  }

  // 1. Le set, uniformément parmi les 4. C'est le facteur de dilution du
  //    farm : seule une pièce sur 4 sert le set visé.
  const setKey = SET_KEYS[Math.floor(prng() * SET_KEYS.length)] ?? SET_KEYS[0]

  // 2. La rareté, seul axe difficile — pondérée par étage (weights vient de
  //    TowerFloor.lootTable.farm.equipmentWeights).
  const total = Object.values(weights).reduce((a, b) => a + b, 0)
  let seuil = prng() * total
  let rarity = Object.keys(weights)[0] as string
  for (const [cle, poids] of Object.entries(weights)) {
    seuil -= poids
    if (seuil <= 0) {
      rarity = cle
      break
    }
  }

  return { slot, setKey, rarity }
}
