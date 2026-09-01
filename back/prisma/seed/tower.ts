import type { PrismaClient } from '../../src/generated/client'
import { RARITY_BASE } from './campaign'

// La table élément -> slot vit dans le domaine, pas ici : le seed et le
// tirage de drop doivent lire la MÊME source, sinon une tour peut dropper
// un slot différent de celui que l'écran annonce.
import {
  TOWER_ELEMENTS,
  TOWER_FLOOR_COUNT,
  type TowerElement,
} from '../../src/main/domain/tower/tower-slots'

export { TOWER_ELEMENTS, TOWER_FLOOR_COUNT }
export type { TowerElement }

// Type juste : le vrai appelant (prisma/seed.ts) passe le client de
// transaction (tx), structurellement plus étroit que PrismaClient (pas de
// $transaction/$connect) — même motif que seedCampaign/seedEquipment/seedSkills.
type Tx = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0]

const ELEMENT_LABEL: Record<TowerElement, string> = {
  FIRE: 'Tour de Braise',
  WATER: 'Tour de Prisme',
  NATURE: 'Tour de Sève',
  EARTH: 'Tour de Monolithe',
}

/**
 * Marches de difficulté par étage. Volontairement irrégulières : l'étage 10
 * n'est pas « l'étage 1 en plus dur », c'est un mur qui suppose une équipe finie
 * et le contre-pick élémentaire. Farmer le 10 est le but ; les étages bas ne
 * servent qu'au passage.
 *
 * Deux marches franches, pas une accélération lisse : 1-6 est une montée
 * douce (passage), 6→7 marque l'entrée en régime « endgame » (le COMMON
 * disparaît du loot, le LEGENDARY apparaît — voir RARITY_WEIGHTS), et 9→10
 * est LE mur, délibérément disproportionné par rapport à toutes les autres.
 *
 * Point de calibrage ouvert (§12 de la spec) : à comparer à enemyScale de la
 * campagne et à rejouer sur le simulateur réel.
 */
const FLOOR_SCALE = [1, 1.2, 1.45, 1.75, 2.1, 2.5, 3.8, 5, 6.6, 13] as const

// Profil épique de campagne (source unique : RARITY_BASE.EPIC dans
// campaign.ts) — pas de littéral recopié, sinon un futur rééquilibrage de
// campagne diverge en silence de la puissance ennemie des tours.
const BASE = RARITY_BASE.EPIC

// Garde-fou : floor doit rester dans 1..TOWER_FLOOR_COUNT, sinon
// FLOOR_SCALE[floor-1]/RARITY_WEIGHTS[floor] renverraient undefined et un
// NaN silencieux se propagerait dans les stats ennemies ou le loot.
function assertFloorInRange(floor: number): void {
  if (floor < 1 || floor > TOWER_FLOOR_COUNT) {
    throw new Error(`Étage de tour hors bornes : ${floor} (attendu 1..${TOWER_FLOOR_COUNT})`)
  }
}

export function towerEnemyPower(floor: number) {
  assertFloorInRange(floor)
  const s = FLOOR_SCALE[floor - 1]
  return {
    baseHp: Math.round(BASE.hp * s),
    baseAtk: Math.round(BASE.atk * s),
    baseDef: Math.round(BASE.def * s),
    baseSpd: Math.round(BASE.spd * (1 + 0.02 * (floor - 1))),
    mitigationScale: s,
  }
}

export function towerEnemyTeam(element: TowerElement, floor: number) {
  const p = towerEnemyPower(floor)
  return [0, 1, 2].map(() => ({
    ...p,
    level: 1,
    palier: 1,
    attackPattern: floor === TOWER_FLOOR_COUNT ? 'AOE_3' : 'BASIC',
    appearance: null,
    element, // couleur seule : aucune restriction sur l'équipe du joueur
  }))
}

/**
 * Une pièce garantie par run — jamais zéro. Le slot est fixé par la tour,
 * le set tiré uniformément parmi les 4 par le domaine ; seule la rareté
 * dépend de l'étage, et c'est le seul axe difficile.
 */
const RARITY_WEIGHTS: Record<number, Record<string, number>> = {
  1: { COMMON: 70, UNCOMMON: 30 },
  2: { COMMON: 70, UNCOMMON: 30 },
  3: { COMMON: 45, UNCOMMON: 40, RARE: 15 },
  4: { COMMON: 45, UNCOMMON: 40, RARE: 15 },
  5: { COMMON: 20, UNCOMMON: 45, RARE: 30, EPIC: 5 },
  6: { COMMON: 20, UNCOMMON: 45, RARE: 30, EPIC: 5 },
  7: { UNCOMMON: 30, RARE: 50, EPIC: 19, LEGENDARY: 1 },
  8: { UNCOMMON: 30, RARE: 50, EPIC: 19, LEGENDARY: 1 },
  9: { UNCOMMON: 15, RARE: 52, EPIC: 30, LEGENDARY: 3 },
  10: { UNCOMMON: 5, RARE: 45, EPIC: 46, LEGENDARY: 4 },
}

export function towerFloorLoot(floor: number) {
  assertFloorInRange(floor)
  const s = FLOOR_SCALE[floor - 1]
  return {
    firstClear: {
      gold: Math.round(200 * s),
      dust: Math.round(120 * s),
      xp: Math.round(60 * s),
      guaranteedEquipment: { minRarity: floor >= 7 ? 'RARE' : 'UNCOMMON' },
    },
    farm: {
      gold: Math.round(40 * s),
      dust: Math.round(25 * s),
      xp: Math.round(15 * s),
      equipmentDropChance: 1,
      equipmentWeights: RARITY_WEIGHTS[floor],
      cardChance: 0,
    },
  }
}

export function buildTowerFloors() {
  const etages = []
  let ordre = 0
  for (const element of TOWER_ELEMENTS) {
    for (let index = 1; index <= TOWER_FLOOR_COUNT; index++) {
      etages.push({
        element,
        index,
        label: `${ELEMENT_LABEL[element]} — étage ${index}`,
        enemyTeam: towerEnemyTeam(element, index),
        lootTable: towerFloorLoot(index),
        order: ordre++,
      })
    }
  }
  return etages
}

export async function seedTowerFloors(tx: Tx): Promise<void> {
  for (const etage of buildTowerFloors()) {
    await tx.towerFloor.upsert({
      where: { element_index: { element: etage.element, index: etage.index } },
      create: etage,
      update: {
        label: etage.label,
        enemyTeam: etage.enemyTeam,
        lootTable: etage.lootTable,
        order: etage.order,
      },
    })
  }
}
