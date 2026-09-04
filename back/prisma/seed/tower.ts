import type { PrismaClient } from '../../src/generated/client'
// La table élément -> slot vit dans le domaine, pas ici : le seed et le
// tirage de drop doivent lire la MÊME source, sinon une tour peut dropper
// un slot différent de celui que l'écran annonce.
import {
  TOWER_ELEMENTS,
  TOWER_FLOOR_COUNT,
  TOWER_NAME_BY_ELEMENT,
  type TowerElement,
} from '../../src/main/domain/tower/tower-slots'
import { RARITY_BASE } from './campaign'

export { TOWER_ELEMENTS, TOWER_FLOOR_COUNT }
export type { TowerElement }

// Type juste : le vrai appelant (prisma/seed.ts) passe le client de
// transaction (tx), structurellement plus étroit que PrismaClient (pas de
// $transaction/$connect) — même motif que seedCampaign/seedEquipment/seedSkills.
type Tx = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0]

/**
 * Difficulté par étage — montée RAPIDE puis paliers FINS.
 *
 * Ancrage : l'étage 10 pèse autant que l'étage 80 de la campagne (537 943 de
 * puissance d'équipe). L'ancienne courbe linéaire y plafonnait à 19 293, soit
 * vingt-huit fois moins — d'où trois cartes niveau 10 qui franchissaient
 * l'étage 8 sans effort.
 *
 * La forme : les rapports entre étages consécutifs partent de ×3,3 et
 * retombent à ×1,05 en haut. Le bas filtre vite, le haut se joue à peu de
 * chose — un niveau de carte ou une pièce doit suffire à franchir la marche
 * suivante, plutôt qu'un mur.
 *
 * L'étage 10 fait combattre trois ennemis en AOE_3 : sa puissance AFFICHÉE
 * bondit (prime de menace ×7 dans la jauge) alors que ses stats réelles ne
 * montent que de 4,7 % par rapport à l'étage 9. Qui franchit le 9 n'est donc
 * pas loin du 10 — c'est la jauge qui exagère, pas la marche.
 */
const FLOOR_SCALE = [3, 10, 25, 50, 85, 120, 145, 160, 172, 180] as const

// Profil épique de campagne (source unique : RARITY_BASE.EPIC dans
// campaign.ts) — pas de littéral recopié, sinon un futur rééquilibrage de
// campagne diverge en silence de la puissance ennemie des tours.
const BASE = RARITY_BASE.EPIC

// Garde-fou : floor doit rester dans 1..TOWER_FLOOR_COUNT, sinon
// FLOOR_SCALE[floor-1]/RARITY_WEIGHTS[floor] renverraient undefined et un
// NaN silencieux se propagerait dans les stats ennemies ou le loot.
function assertFloorInRange(floor: number): void {
  if (floor < 1 || floor > TOWER_FLOOR_COUNT) {
    throw new Error(
      `Étage de tour hors bornes : ${floor} (attendu 1..${TOWER_FLOOR_COUNT})`,
    )
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
  2: { COMMON: 60, UNCOMMON: 35, RARE: 5 },
  3: { COMMON: 50, UNCOMMON: 38, RARE: 12 },
  4: { COMMON: 40, UNCOMMON: 40, RARE: 19, EPIC: 1 },
  5: { COMMON: 30, UNCOMMON: 42, RARE: 25, EPIC: 3 },
  6: { COMMON: 22, UNCOMMON: 40, RARE: 31, EPIC: 6, LEGENDARY: 1 },
  7: { COMMON: 15, UNCOMMON: 36, RARE: 36, EPIC: 11, LEGENDARY: 2 },
  8: { COMMON: 9, UNCOMMON: 30, RARE: 41, EPIC: 17, LEGENDARY: 3 },
  9: { COMMON: 4, UNCOMMON: 22, RARE: 45, EPIC: 25, LEGENDARY: 4 },
  10: { UNCOMMON: 15, RARE: 45, EPIC: 35, LEGENDARY: 5 },
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
        label: `${TOWER_NAME_BY_ELEMENT[element]} — étage ${index}`,
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
