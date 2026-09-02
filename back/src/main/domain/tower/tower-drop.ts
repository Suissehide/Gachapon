// Tirage de la pièce garantie d'un run de tour (§6 design spec). Module pur :
// le PRNG est injecté, aucune lecture de config ni de base ici.
//
// « Une pièce garantie par run, jamais zéro » : le slot est dicté par la tour
// (jamais tiré), le set est tiré uniformément parmi les 4, et seule la
// rareté dépend de l'étage — c'est le seul axe difficile.
//
// DEUX chemins, un par nature de combat, mais UN SEUL contrat PRNG :
// set d'abord (1 appel), rareté ensuite (1 appel), toujours dans cet ordre.
// Les tests en dépendent ; le changer casserait tout log rejouable.
//
//  - rollTowerDrop           : farm (étage déjà nettoyé) — rareté pondérée
//    par `TowerFloor.lootTable.farm.equipmentWeights`, propre à l'étage.
//  - rollTowerFirstClearDrop : premier passage de l'étage — rareté avec
//    PLANCHER, via `rollFirstClearEquipmentRarity` (equipment-drop.domain.ts),
//    exactement le mécanisme déjà utilisé par la campagne (§6 design spec :
//    « récompense de premier passage, via FirstClearLoot existant dans
//    equipment-drop.domain.ts »). Le seed de tour pose
//    `guaranteedEquipment.minRarity` = UNCOMMON (RARE à partir de l'étage 7)
//    — ne JAMAIS retomber sur `farm.equipmentWeights` pour ce chemin, sinon
//    le plancher ne se déclenche jamais (bug corrigé en relecture : un
//    premier passage pouvait rendre du COMMON malgré un plancher UNCOMMON).

import {
  type FirstClearLoot,
  rollFirstClearEquipmentRarity,
} from '../combat/equipment-drop.domain'
import { SET_KEYS, type SetKey } from '../equipment/set-bonuses'
import { TOWER_SLOT_BY_ELEMENT, type TowerElement } from './tower-slots'

export interface TowerDrop {
  slot: string
  setKey: SetKey
  rarity: string
}

function resolveTowerSlot(element: string): string {
  const slot = TOWER_SLOT_BY_ELEMENT[element as TowerElement]
  if (!slot) {
    throw new Error(`Élément de tour inconnu : ${element}`)
  }
  return slot
}

// 1er appel PRNG, commun aux deux chemins : le set, uniformément parmi les
// 4. C'est le facteur de dilution du farm : seule une pièce sur 4 sert le
// set visé.
function drawSetKey(prng: () => number): SetKey {
  return SET_KEYS[Math.floor(prng() * SET_KEYS.length)] ?? SET_KEYS[0]
}

/**
 * Drop de FARM (étage déjà nettoyé au moins une fois). 2e appel PRNG : la
 * rareté, pondérée par `weights` (TowerFloor.lootTable.farm.equipmentWeights,
 * propre à l'étage — c'est le seul axe difficile).
 */
export function rollTowerDrop(input: {
  element: string
  weights: Record<string, number>
  prng: () => number
}): TowerDrop {
  const { element, weights, prng } = input
  const slot = resolveTowerSlot(element)
  const setKey = drawSetKey(prng)

  const total = Object.values(weights).reduce((a, b) => a + b, 0)
  if (Object.keys(weights).length === 0 || total <= 0) {
    // Ne doit jamais arriver : le seed de tour pose `farm.equipmentWeights`
    // sur les 40 étages (prisma/seed/tower.ts:towerFloorLoot). Des poids
    // vides signalent un catalogue incomplet — on le signale plutôt que de
    // renvoyer une rareté undefined qui échouerait plus loin sur une erreur
    // Prisma opaque.
    throw new Error(
      `Poids de rareté absents pour l'élément de tour ${element} — seed de tour incomplet`,
    )
  }
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

/**
 * Drop du PREMIER passage d'un étage. Même contrat PRNG que rollTowerDrop
 * (set puis rareté, 1 appel chacun) mais la rareté vient de
 * `rollFirstClearEquipmentRarity`, qui applique le plancher
 * `firstClear.guaranteedEquipment.minRarity` posé par le seed de tour —
 * jamais moins que ce plancher, contrairement au farm qui peut retomber sur
 * du COMMON sur les étages bas.
 */
export function rollTowerFirstClearDrop(input: {
  element: string
  firstClear: FirstClearLoot
  prng: () => number
}): TowerDrop {
  const { element, firstClear, prng } = input
  const slot = resolveTowerSlot(element)
  const setKey = drawSetKey(prng)

  const rarity = rollFirstClearEquipmentRarity(firstClear, prng)
  if (!rarity) {
    // Ne doit jamais arriver : le seed de tour pose `guaranteedEquipment`
    // sur les 40 étages (prisma/seed/tower.ts:towerFloorLoot). Si ce champ
    // manque, le seed est incomplet — on le signale plutôt que de retomber
    // silencieusement sur une rareté non garantie.
    throw new Error(
      `Plancher de première clear absent pour l'élément de tour ${element} — seed de tour incomplet`,
    )
  }

  return { slot, setKey, rarity }
}
