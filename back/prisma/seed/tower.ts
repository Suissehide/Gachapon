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
import {
  FAMILIES_BY_ELEMENT,
  type FamilySlug,
  makeSpriteCursor,
} from './bestiary'
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
 * Ancrage : l'étage 10 pèse autant que l'étage 80 de la campagne (50 943 de
 * puissance d'équipe), et l'étage 1 reste franchissable par un joueur qui
 * sort du début de campagne.
 *
 * La courbe précédente visait 537 943 — la valeur de l'étage 80 AVANT le gel
 * de la vitesse. Le gel a divisé les puissances de campagne par dix sans
 * toucher celles de la tour, dont la vitesse ne suivait déjà pas l'échelle :
 * l'ancrage pointait donc dans le vide, et l'étage 1 était infranchissable
 * même à niveau 30 avec de l'équipement.
 *
 * La forme suit la demande : les rapports entre étages consécutifs partent de
 * ×2,2 et retombent à ×1,06. Le bas filtre, le haut se joue à peu de chose.
 *
 * L'étage 10 aligne trois ennemis en AOE_3 : sa puissance AFFICHÉE bondit
 * (prime de menace ×7 dans la jauge) alors que ses stats réelles ne montent
 * que de 6 % par rapport à l'étage 9.
 */
const FLOOR_SCALE = [1, 2.2, 4, 6.2, 8.6, 11, 13, 14.6, 15.9, 16.9] as const

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

// Un triplet, pas un `string[]` : l'étage a EXACTEMENT trois ennemis, et le
// dire au type évite que `appearance` remonte en `string | undefined` jusque
// dans le JSON seedé — c'est précisément ce champ optionnel qui a permis au
// `null` de passer inaperçu.
type FloorSprites = readonly [string, string, string]

/**
 * Sprites d'une tour — mêmes règles que la campagne, source commune
 * (`seed/bestiary.ts`), mais curseur SÉPARÉ : les tours ne doivent pas
 * décaler les monstres des 90 étages de campagne déjà en base.
 *
 * Une tour ne puise que dans les familles de SON élément (`FAMILIES_BY_ELEMENT`),
 * si bien que le sprite et l'`element` de l'ennemi ne peuvent pas diverger et
 * que le contre-pick reste lisible : une tour = un élément à contrer. Elle
 * alterne en revanche entre plusieurs familles — la Tour de Braise aligne
 * kobolds, élémentaires, minotaures et wyvernes.
 *
 * Le décalage `(floor + slot) % fams.length` est celui de la campagne : il
 * garantit 3 familles différentes par étage dès que l'élément en compte au
 * moins 3. La Tour de Monolithe fait exception — TERRE n'a que les basilics,
 * donc ses 30 emplacements recyclent 7 sprites (jamais deux fois le même dans
 * un étage, `count` étant supérieur au nombre d'emplacements).
 */
const TOWER_LOOKS: Record<TowerElement, readonly FloorSprites[]> = (() => {
  const nextSprite = makeSpriteCursor()
  const looks = {} as Record<TowerElement, readonly FloorSprites[]>
  for (const element of TOWER_ELEMENTS) {
    const fams: readonly FamilySlug[] = FAMILIES_BY_ELEMENT[element]
    if (fams.length === 0) {
      throw new Error(
        `Aucune famille de bestiaire pour la tour ${element} : ses ennemis n'auraient pas de sprite.`,
      )
    }
    looks[element] = Array.from({ length: TOWER_FLOOR_COUNT }, (_, i) => {
      const floor = i + 1
      const spriteAt = (slot: number): string => {
        const slug = fams[(floor + slot) % fams.length]
        if (!slug) {
          throw new Error(
            `Famille introuvable pour la tour ${element}, étage ${floor}, emplacement ${slot}.`,
          )
        }
        return nextSprite(slug)
      }
      return [spriteAt(0), spriteAt(1), spriteAt(2)] as const
    })
  }
  return looks
})()

export function towerEnemyTeam(element: TowerElement, floor: number) {
  assertFloorInRange(floor)
  const p = towerEnemyPower(floor)
  const sprites = TOWER_LOOKS[element][floor - 1]
  if (!sprites) {
    throw new Error(`Aucun sprite pour la tour ${element}, étage ${floor}.`)
  }
  return sprites.map((appearance) => ({
    ...p,
    level: 1,
    palier: 1,
    attackPattern: floor === TOWER_FLOOR_COUNT ? 'AOE_3' : 'BASIC',
    appearance,
    // L'élément de la tour, qui est aussi celui de la famille du sprite
    // (voir TOWER_LOOKS) : aucune restriction sur l'équipe du joueur, mais
    // le contre-pick garde du sens.
    element,
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
      // ÷3 avec le premier passage de campagne (2026-09-15) : les 4 tours
      // offraient 22 416 XP de one-shot, plus que le coût du niveau 30.
      xp: Math.round(20 * s),
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
