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
 * Difficulté par étage — un étage, un profil de joueur.
 *
 * Chaque valeur est FITTÉE au simulateur (`scripts/tower-sim.ts`, mode
 * `fit`) : c'est l'échelle pour laquelle le joueur que l'étage vise le gagne
 * environ `target` fois sur dix. Les profils et les cibles vivent dans
 * `balance-calibration.ts` — la courbe ci-dessous n'est que leur résultat, et
 * `tower-seed.test.ts` remesure le couple à chaque exécution.
 *
 * La montée suit la campagne : +10 niveaux de joueur par étage jusqu'au
 * plafond de 70 (étages 1-6), puis c'est l'équipement seul qui décide
 * (étages 7-10) — la phase 2 de `seed/campaign.ts`, transposée.
 *
 * POURQUOI ces valeurs et pas les précédentes ([1, 2.2, … 16.9]) : l'ancienne
 * courbe était ancrée sur la JAUGE affichée (`campaign-power.ts`) et non sur
 * les stats. Or la jauge applique une prime de menace ×7 aux attaques AOE_3,
 * et l'étage 10 en alignait TROIS : il atteignait donc les 50 943 points du
 * boss 8-10 avec les stats réelles du stage 5-1. Mesurés, les étages 1 à 9
 * tombaient tous face à une équipe niveau 20 correctement équipée, et le
 * seul mur du jeu était le changement de pattern au sommet.
 *
 * La jauge reste un outil d'AFFICHAGE. Pour calibrer, le simulateur.
 */
const FLOOR_SCALE = [2.5, 5.4, 9.5, 13.5, 26.5, 39.5, 45, 51, 59, 67.5] as const

/**
 * Échelle du BUTIN — délibérément découplée de la difficulté, et gelée sur
 * les valeurs d'avant le recalibrage.
 *
 * `towerFloorLoot` lisait `FLOOR_SCALE` : durcir la tour aurait multiplié or,
 * poussière et XP par quatre au passage. Un rééquilibrage de difficulté n'a
 * pas à déplacer l'économie — celle-ci est réglée ailleurs, et son rythme
 * (packs d'énergie, boutique du jour, courbe d'XP) ne suppose pas que la tour
 * se mette soudain à payer quatre fois plus.
 *
 * Conséquence voulue : la difficulté croît plus vite que le butin, donc
 * farmer un étage déjà franchi reste digne au lieu de devenir la seule
 * option rentable. Même principe que `FARM_EXP` en campagne, obtenu ici par
 * deux courbes séparées plutôt que par un exposant.
 */
const LOOT_SCALE = [1, 2.2, 4, 6.2, 8.6, 11, 13, 14.6, 15.9, 16.9] as const

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

/**
 * Stats d'un ennemi à une échelle ARBITRAIRE. Exportée pour que le
 * simulateur d'équilibrage (`scripts/tower-sim.ts`, via
 * `balance-calibration.ts`) puisse essayer une courbe candidate sans recopier
 * la formule — une copie divergerait du seed en silence, exactement comme
 * l'a fait la table élément → slot avant `tower-slots.ts`.
 */
export function towerEnemyStatsAtScale(scale: number, floor: number) {
  return {
    baseHp: Math.round(BASE.hp * scale),
    baseAtk: Math.round(BASE.atk * scale),
    baseDef: Math.round(BASE.def * scale),
    baseSpd: Math.round(BASE.spd * (1 + 0.02 * (floor - 1))),
    mitigationScale: scale,
  }
}

export function towerEnemyPower(floor: number) {
  assertFloorInRange(floor)
  return towerEnemyStatsAtScale(FLOOR_SCALE[floor - 1], floor)
}

/**
 * Combien des trois ennemis d'un étage frappent en AOE_3.
 *
 * Une unité AOE_3 touche les trois cartes du joueur à chaque tour : en
 * aligner trois, c'est neuf fois les dégâts entrants d'un trio normal. Ce
 * n'est pas un cran de difficulté, c'est un interrupteur — mesuré au
 * simulateur, une équipe épique n12 gagne 100 % contre trois BASIC et 0 %
 * contre trois AOE_3 AUX MÊMES STATS. D'où une seule unité AOE_3 au sommet :
 * le dernier étage reste distinct sans être binaire.
 */
export function towerAoeUnitCount(floor: number): number {
  assertFloorInRange(floor)
  return floor === TOWER_FLOOR_COUNT ? 1 : 0
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
  const aoeUnits = towerAoeUnitCount(floor)
  return sprites.map((appearance, slot) => ({
    ...p,
    level: 1,
    palier: 1,
    attackPattern: slot < aoeUnits ? 'AOE_3' : 'BASIC',
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
  const s = LOOT_SCALE[floor - 1]
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
        // labelEn recopie le francais : la tache 8 traduira.
        labelFr: `${TOWER_NAME_BY_ELEMENT[element]} — étage ${index}`,
        labelEn: `${TOWER_NAME_BY_ELEMENT[element]} — étage ${index}`,
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
        labelFr: etage.labelFr,
        labelEn: etage.labelEn,
        enemyTeam: etage.enemyTeam,
        lootTable: etage.lootTable,
        order: etage.order,
      },
    })
  }
}
