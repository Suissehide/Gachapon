/**
 * Définitions de la campagne — courbe de difficulté, bestiaire par chapitre,
 * tables de butin et libellés d'étage.
 *
 * Vit sous `src/main/` et non dans `prisma/seed/` parce que du code de
 * PRODUCTION la consomme : le backfill de traductions au démarrage
 * (`domain/i18n/content-translations.bootstrap.ts`) doit lire ces libellés, et
 * `npm run build` ne transpile que `src/main/`. `prisma/seed/campaign.ts` n'y
 * garde que l'écriture en base — même partage que
 * `quests/quest-definitions.ts` / `prisma/seed/quests.ts`.
 */

import type { Element } from '../combat/element'
import {
  FAMILY_ELEMENTS,
  type FamilySlug,
  makeSpriteCursor,
} from './bestiary.definitions'

/**
 * Lecture d'une table indexée par un entier (chapitre, étage, emplacement).
 *
 * `noUncheckedIndexedAccess` étant actif sous `src/main/`, `table[i]` vaut
 * `T | undefined` : sans garde, un index hors table produirait `undefined`
 * puis `NaN` dans une stat seedée, sans rien signaler. Une erreur nommée vaut
 * mieux qu'un étage silencieusement cassé.
 */
function at<T>(table: readonly T[], index: number, what: string): T {
  const value = table[index]
  if (value === undefined) {
    throw new Error(
      `${what} : index ${index} hors table (${table.length} entrées)`,
    )
  }
  return value
}

export const CHAPTER_COUNT = 15
export const STAGES_PER_CHAPTER = 10
const TOTAL_STAGES = CHAPTER_COUNT * STAGES_PER_CHAPTER

// --- Courbe de RÉFÉRENCE ----------------------------------------------------
//
// La difficulté est calibrée sur une campagne de RÉFÉRENCE de 9 chapitres
// (90 étages) : ancres de PV, rareté des ennemis, joueur de référence et
// butin y sont exprimés. Les 15 chapitres réels en sont un étirement :
// `curvePosition` place chaque étage sur cette échelle (1-1 en 1, 15-10 en
// 90, linéairement entre les deux). Les boss, qui tombent entre deux étages
// de référence, ont leur propre facteur (BOSS_GEAR_COMPENSATION).
export const REFERENCE_CHAPTERS = 9
const REFERENCE_STAGES = REFERENCE_CHAPTERS * STAGES_PER_CHAPTER

/** Position d'un étage global (1..150) sur la courbe de référence (1..90). */
export function curvePosition(globalStageNumber: number): number {
  return (
    1 + ((globalStageNumber - 1) * (REFERENCE_STAGES - 1)) / (TOTAL_STAGES - 1)
  )
}

/** Chapitre de référence (1..9) d'une position de la courbe. */
export function referenceChapter(position: number): number {
  return Math.min(
    REFERENCE_CHAPTERS,
    Math.max(1, Math.ceil(Math.round(position) / STAGES_PER_CHAPTER)),
  )
}

// Courbe de difficulté CONTINUE et CONCAVE sur la position de référence
// p (1..90) : mult(p) = (1 + 0.08·(p-1))^2.5.
// Utilisée UNIQUEMENT pour le BUTIN (loot) — plus pour les stats ennemies.
const CURVE_A = 0.08
const CURVE_B = 2.5

// Progression joueur attendue par chapitre : l'ennemi s'y aligne (base de
// rareté + enemyScale) pour que ses stats ET sa vitesse scalent comme le
// joueur sous l'ATB. PV/ATQ/DEF = médianes des 602 cartes
// (scripts/rebalance-cards.py les affiche) ; la vitesse garde ses valeurs
// historiques.
export const RARITY_BASE = {
  COMMON: { hp: 124, atk: 24, def: 14, spd: 89 },
  UNCOMMON: { hp: 162, atk: 35, def: 17, spd: 95 },
  RARE: { hp: 230, atk: 50, def: 20, spd: 97 },
  EPIC: { hp: 454, atk: 76, def: 41, spd: 102 },
  LEGENDARY: { hp: 761, atk: 122, def: 58, spd: 103 },
} as const
// Indexée par chapitre de RÉFÉRENCE (1..9), comme toute la calibration.
const RARITY_BY_CHAPTER = [
  'COMMON',
  'UNCOMMON',
  'RARE',
  'EPIC',
  'EPIC',
  'EPIC',
  'EPIC',
  'EPIC',
  'EPIC',
] as const

// Ennemi normal = base joueur × NORMAL_FACTOR. Conservé à 0.971 lors de la
// refonte du 2026-08-07 : la courbe lissée durcit la campagne d'environ 17 %
// au stage 5-10, et cette hausse est VOULUE. La sim mesure un régime
// doublement pessimiste (elle attribue les éléments du joueur sans regarder
// ceux des ennemis, donc « joueur qui ne contre-pick pas », et tourne PAR
// DÉFAUT sans équipement — profil `none` (`SIM_GEAR=epic|legendary` active
// les régimes équipés côté joueur) — alors que le contre-pick vaut ×1.3 en
// dégâts et que les ennemis, eux, n'en portent jamais.
const NORMAL_FACTOR = 0.971
const BOSS_FACTOR = 0.92 // boss (avant ×PV et AOE)

/**
 * DEF des ennemis, toutes sources confondues (campagne, tour, raid) : la DEF
 * de base du barème × ENEMY_DEF_MULT, SANS l'échelle d'étage. Sous le seuil
 * fixe K = 1 000, `10d / (1000 + 10d)` vaut `d / (100 + d)` : un ennemi garde
 * la réduction de dégâts que lui donnait sa DEF de base face au seuil 100
 * mis à l'échelle. La difficulté d'un étage passe par ses PV et son ATQ.
 */
export const ENEMY_DEF_MULT = 10

// --- Courbe de difficulté : PV par ancres, sans marche ---------------------
//
// Le joueur de référence (`campaignProfile`, harnais `balance-calibration.ts`)
// améliore ses cartes et ses pièces UNE à la fois, plafonne en épiques et
// joue les ultimes de ses archétypes (Mage, Combattant, Soutien). Les
// ancres sont les PV (avant NORMAL_FACTOR) d'un ennemi normal qui donnent
// ~88 % de victoire à ce joueur, une par étage normal, indexée par sa
// POSITION sur la courbe de référence (`curvePosition`) : le joueur change de
// carte par marches, des ancres plus espacées creusaient les étages
// intermédiaires. Entre deux ancres (et pour les boss), interpolation
// GÉOMÉTRIQUE. Les stats suivent les PV : `enemyScale` = PV visés / PV de
// base de la rareté. NB : 5 points de victoire ne valent que ~2 % de stats,
// tant le combat 3v3 est tranché.
//
// Méthode : `SIM_MODE=campaign-fit SIM_STAGES=all` de scripts/tower-sim.ts
// mesure les PV qui donnent la cible à chaque étage ; la courbe retenue en
// est l'ENVELOPPE INFÉRIEURE — jamais au-dessus de la mesure, pas plafonné à
// ×1,2 par étage et ×1,34 à une frontière de chapitre, au moins +0,1 % et
// +2 PV par étage, creux de mesure relevés de 1 % au plus (3 % de stats valent ~11
// points de victoire). Écarts assumés (chapitres de référence) :
// - Chapitre 1 : tutoriel, ~95 % de victoire, 1-1 et 1-2 mesurés sur un
//   joueur SANS équipement (première pièce garantie à la position 3).
// - Chapitre 5 : deux familles seulement (Feu/Eau/Feu), un contre-pick Eau
//   y bat deux ennemis sur trois et la mesure réclamait ×1,8 d'un coup. Le
//   plafond de pas en fait une rampe plus facile que la cible, sans mur.
// - Chapitre 6 : le joueur y stagne (pièces UNCOMMON n12 → RARE n6), la
//   mesure y est plate voire décroissante ; la courbe suit la croissance
//   minimale, son début est plus facile que la cible.
export const NORMAL_HP_ANCHORS: readonly (readonly [number, number])[] = [
  [1.0, 133],
  [1.6, 141],
  [2.19, 143],
  [2.79, 172],
  [3.39, 188],
  [3.99, 225],
  [4.58, 269],
  [5.18, 271],
  [5.78, 326],
  [6.97, 392],
  [7.57, 454],
  [8.17, 455],
  [8.77, 518],
  [9.36, 522],
  [9.96, 576],
  [10.56, 652],
  [11.15, 655],
  [11.75, 697],
  [12.95, 834],
  [13.54, 855],
  [14.14, 875],
  [14.74, 911],
  [15.34, 913],
  [15.93, 1069],
  [16.53, 1116],
  [17.13, 1118],
  [17.72, 1161],
  [18.92, 1226],
  [19.52, 1347],
  [20.11, 1367],
  [20.71, 1557],
  [21.31, 1593],
  [21.91, 1625],
  [22.5, 1949],
  [23.1, 2025],
  [23.7, 2031],
  [24.89, 2612],
  [25.49, 2614],
  [26.09, 3136],
  [26.68, 3266],
  [27.28, 3341],
  [27.88, 3378],
  [28.48, 3382],
  [29.07, 4058],
  [29.67, 4661],
  [30.87, 4779],
  [31.46, 4833],
  [32.06, 4981],
  [32.66, 5443],
  [33.26, 5448],
  [33.85, 5825],
  [34.45, 5871],
  [35.05, 6242],
  [35.64, 6404],
  [36.84, 7381],
  [37.44, 7388],
  [38.03, 7876],
  [38.63, 8075],
  [39.23, 8082],
  [39.83, 9700],
  [40.42, 10122],
  [41.02, 12146],
  [41.62, 12385],
  [42.81, 12891],
  [43.41, 12904],
  [44.01, 13608],
  [44.6, 14210],
  [45.2, 14225],
  [45.8, 14419],
  [46.4, 14434],
  [46.99, 14448],
  [47.59, 14464],
  [48.79, 14477],
  [49.38, 14627],
  [49.98, 15117],
  [50.58, 16989],
  [51.17, 17007],
  [51.77, 17023],
  [52.37, 17041],
  [52.97, 17058],
  [53.56, 17075],
  [54.76, 17093],
  [55.36, 17234],
  [55.95, 17250],
  [56.55, 17569],
  [57.15, 17586],
  [57.74, 17604],
  [58.34, 17622],
  [58.94, 18296],
  [59.54, 18314],
  [60.73, 24234],
  [61.33, 24362],
  [61.93, 24663],
  [62.52, 25666],
  [63.12, 25691],
  [63.72, 26094],
  [64.32, 26119],
  [64.91, 26146],
  [65.51, 26171],
  [66.7, 26197],
  [67.3, 26224],
  [67.9, 27410],
  [68.5, 27863],
  [69.09, 28470],
  [69.69, 29217],
  [70.29, 29457],
  [70.89, 29494],
  [71.48, 29664],
  [72.68, 33440],
  [73.28, 33474],
  [73.87, 34644],
  [74.47, 34679],
  [75.07, 35578],
  [75.66, 35614],
  [76.26, 35649],
  [76.86, 36539],
  [77.46, 36576],
  [78.65, 37913],
  [79.25, 37950],
  [79.85, 37988],
  [80.44, 38472],
  [81.04, 38510],
  [81.64, 38549],
  [82.23, 38588],
  [82.83, 38626],
  [83.43, 38665],
  [84.62, 38703],
  [85.22, 38742],
  [85.82, 38781],
  [86.42, 38819],
  [87.01, 38858],
  [87.61, 38897],
  [88.21, 38936],
  [88.81, 38974],
  [89.4, 39265],
]
const GROWTH_AFTER_LAST_ANCHOR = 1.003

/**
 * PV de base (avant NORMAL_FACTOR) visés à une POSITION de la courbe de
 * référence (1..90, fractionnaire) — voir `curvePosition`.
 */
export function targetHp(position: number): number {
  const suivante = NORMAL_HP_ANCHORS.findIndex(([stage]) => stage >= position)
  if (suivante === -1) {
    const [stage, hp] = at(
      NORMAL_HP_ANCHORS,
      NORMAL_HP_ANCHORS.length - 1,
      'Ancres de PV',
    )
    return hp * GROWTH_AFTER_LAST_ANCHOR ** (position - stage)
  }
  const [stageB, hpB] = at(NORMAL_HP_ANCHORS, suivante, 'Ancres de PV')
  if (suivante === 0 || stageB === position) {
    return hpB
  }
  const [stageA, hpA] = at(NORMAL_HP_ANCHORS, suivante - 1, 'Ancres de PV')
  return hpA * (hpB / hpA) ** ((position - stageA) / (stageB - stageA))
}

/** Base de rareté des ennemis d'un étage global (1..150). */
function rarityBaseAt(globalStageNumber: number) {
  const chapter = referenceChapter(curvePosition(globalStageNumber))
  return RARITY_BASE[
    at(RARITY_BY_CHAPTER, chapter - 1, 'Rareté par chapitre de référence')
  ]
}

/** Multiplicateur de stats ennemies à un étage global (1..150). */
export function enemyScale(globalStageNumber: number): number {
  return (
    targetHp(curvePosition(globalStageNumber)) /
    rarityBaseAt(globalStageNumber).hp
  )
}

/**
 * Facteur propre à chaque BOSS, par-dessus la courbe des étages normaux.
 *
 * Les boss ne peuvent pas partager le facteur des étages normaux : leur cible
 * diffère (70 % contre 88 %) et leurs multiplicateurs propres (PV ×3.25,
 * AOE_3) ne tombent pas au même endroit selon le chapitre. Mesuré : avec le
 * seul facteur des étages normaux, les boss s'étalent de 0 % à 100 % de
 * victoire ; avec celui-ci, ils tiennent leur cible.
 */
// Le boss 1-10 est fitté sur la cible du tutoriel (~95 %), comme le reste du
// chapitre 1.
const BOSS_GEAR_COMPENSATION: readonly number[] = [
  0.92, 1.05, 0.9, 0.93, 1.05, 0.92, 0.86, 1.3, 1.37, 1.15, 0.96, 0.93, 1.21,
  1.22, 1.2,
]

export function bossGearCompensation(chapter: number): number {
  return BOSS_GEAR_COMPENSATION[chapter - 1] ?? 1
}

/**
 * Échelle du monstre errant solo (`soloWandererSpec`), étage par étage : ses
 * PV cumulés et son attaque moyenne sont multipliés par cette valeur pour que
 * le joueur de référence de l'étage le batte `WANDERER_TARGET` fois sur cent
 * (balance-calibration.ts) — un peu plus dur qu'un étage normal, moins qu'un
 * boss.
 *
 * Une valeur par étage, pas par chapitre : le monstre frappe toute l'équipe
 * (AOE_3), si bien que le taux de victoire bascule pour quelques % d'échelle,
 * et l'échelle juste zigzague d'un étage à l'autre avec l'élément de tête
 * (LIGHT ⇄ DARK se battent mutuellement : le joueur qui contre-pique est
 * frappé avec avantage, ×0,76 environ) et les paliers d'équipement du joueur.
 * Une constante par chapitre laissait des étages à 0 %.
 *
 * Générée par `SIM_MODE=wanderer` de scripts/tower-sim.ts, remesurée par
 * wandering-monster-balance.test.ts. Ligne = chapitre, colonne = étage 1 à 9.
 */
const WANDERER_SCALE: readonly (readonly number[])[] = [
  [1.14, 1.17, 1.13, 1.27, 1.16, 1.28, 1.19, 1.19, 1.36],
  [0.92, 1.23, 0.92, 0.92, 1.19, 0.91, 0.89, 1.15, 0.88],
  [0.88, 1.14, 1.12, 0.9, 1.16, 1.16, 0.91, 1.18, 1.17],
  [1.26, 1.31, 1.3, 1.3, 1.29, 1.29, 1.38, 1.35, 1.35],
  [1.08, 1.08, 1.12, 1.1, 1.11, 1.09, 1.08, 1.07, 1.03],
  [1.29, 0.98, 1.27, 1.28, 0.95, 1.28, 1.28, 0.97, 1.29],
  [1.18, 0.87, 1.13, 1.15, 0.87, 1.23, 1.16, 0.87, 1.16],
  [1.18, 0.87, 1.15, 1.17, 0.88, 1.18, 1.17, 0.94, 1.28],
  [1.31, 0.98, 1.29, 1.42, 1.07, 1.44, 1.43, 1.01, 1.33],
  [1.28, 0.95, 1.29, 1.31, 0.95, 1.33, 1.32, 0.95, 1.31],
  [1.18, 1.19, 0.85, 1.18, 1.19, 0.89, 1.22, 1.28, 0.95],
  [1.32, 1.34, 1.33, 1.29, 1.31, 1.34, 1.31, 1.32, 1.31],
  [1.21, 0.89, 0.88, 1.17, 0.87, 0.88, 1.18, 0.88, 0.87],
  [0.89, 1.18, 1.21, 0.88, 1.2, 1.2, 0.88, 1.19, 1.19],
  [0.87, 1.17, 1.19, 0.88, 1.2, 1.18, 0.87, 1.18, 1.18],
]

export function wandererSoloScale(chapter: number, index: number): number {
  return WANDERER_SCALE[chapter - 1]?.[index - 1] ?? 1
}

// Boss = check de build : PV ×3.25 + AOE_3 (frappe toute l'équipe, threat ×7
// dans la jauge affichée). L'atk n'est PAS gonflée (×1.0) : l'AOE sur un solo
// est déjà brutal. Mesuré le 2026-08-07 avec la courbe continue : le boss
// est désormais le point haut de son chapitre par construction. En phase 1
// (chapitres 1 à 7, joueur qui progresse par le niveau) l'écart de stats va
// de +10,8 % à +15,6 % selon le chapitre, contre -2,9 % sous l'ancienne
// courbe plate ; en phase 2 (joueur plafonné, chapitres 8-9) il grimpe
// jusqu'à +29,0 % au boss 9-10, le ×3.25 s'empilant donc sur un écart déjà
// défavorable et croissant. Conservé tel quel : la mesure donne 70 % de
// victoire sur les 9 boss en régime de référence (équipement partiel epic,
// joueur qui contre-pick).
const BOSS_HP_MULT = 3.25

// Le butin scale comme mult^exp avec exp < 1 : la difficulté croît plus vite
// que le butin, donc progresser reste optimal et farmer un vieux stage reste
// digne. 0.585 = ln(1.5)/ln(2), le même ratio farm/difficulté que l'ancien
// couple ×1.5 butin / ×2 difficulté par chapitre. First-clear un peu plus
// généreux (0.75) : récompense one-shot, elle finance la montée en niveau.
const FARM_EXP = 0.585
const FIRST_CLEAR_EXP = 0.75
const FARM_GOLD_BASE = 50
const FARM_DUST_BASE = 4
const FARM_XP_BASE = 6
const FIRST_CLEAR_GOLD_BASE = 120
const FIRST_CLEAR_DUST_BASE = 30
// ÷3 (2026-09-15). Le premier passage était le carburant du levelling : à lui
// seul, campagne + tours offraient ~72 800 XP de one-shot, soit 3,5 fois le
// coût du niveau 30 sous l'ancienne courbe — nettoyer le contenu une fois
// suffisait à atteindre le niveau 56. Ramené à ~38 % du niveau 30 sous la
// courbe actuelle, le farm quotidien redevient la colonne vertébrale.
const FIRST_CLEAR_XP_BASE = 7

// Le farm du boss N-10 vaut celui de l'étage (N+1)-2 : un peu plus que les
// étages qu'il clôt, moins que le reste du chapitre suivant, plus dur. Une
// prime au-delà ferait du boss le meilleur farm de tout le chapitre N+1 et
// viderait la progression de son intérêt.
const BOSS_FARM_STAGE_LEAD = 2

function globalStage(chapter: number, stageIndex: number): number {
  return (chapter - 1) * STAGES_PER_CHAPTER + stageIndex
}

export function difficultyMult(chapter: number, stageIndex: number): number {
  return lootMult(globalStage(chapter, stageIndex))
}

function lootMult(globalStageNumber: number): number {
  return (1 + CURVE_A * (curvePosition(globalStageNumber) - 1)) ** CURVE_B
}

// Le bestiaire (familles, sprites, élément par famille) vit dans
// `seed/bestiary.ts` : les tours y puisent aussi, et une seule table évite
// qu'un monstre ait un élément en campagne et un autre en tour.
//
// Comme chaque étage tire ses 3 slots dans 3 familles différentes (voir
// STAGE_LOOKS), les étages de tous les chapitres sauf le 5 présentent
// naturellement 3 éléments distincts. Exception : le chapitre 5 (CHAPTER_FAMILIES) n'a que
// 2 familles (krakens, wyverns), donc ses étages ne présentent que 2 éléments
// distincts sur 3 slots.

// Élément du boss de chaque chapitre (index 0 = chapitre 1). Chaque fois un
// élément absent des mobs du chapitre : le boss demande un ajustement d'équipe
// plutôt que la compo des 9 étages précédents.
export const BOSS_ELEMENT_BY_CHAPTER: readonly Element[] = [
  'DARK',
  'FIRE',
  'LIGHT',
  'DARK',
  'EARTH',
  'LIGHT', // ch.6 mobs : FIRE · EARTH · DARK
  'DARK', // ch.7 mobs : WATER · FIRE · LIGHT
  'NATURE', // ch.8 mobs : WATER · FIRE · DARK
  'EARTH', // ch.9 mobs : WATER · NATURE · DARK
  'WATER', // ch.10 mobs : EARTH · FIRE · DARK
  'DARK', // ch.11 mobs : LIGHT · FIRE · NATURE
  'LIGHT', // ch.12 mobs : WATER · FIRE · EARTH
  'NATURE', // ch.13 mobs : LIGHT · WATER · DARK
  'EARTH', // ch.14 mobs : FIRE · DARK · NATURE
  'FIRE', // ch.15 mobs : EARTH · DARK · WATER
]

// Familles peuplant chaque chapitre (difficulté croissante), étages 1-9.
const CHAPTER_FAMILIES: FamilySlug[][] = [
  ['slimes', 'mushrooms', 'kobolds'],
  ['wisps', 'gnolls', 'wolves'],
  ['mimics', 'specters', 'elementals'],
  ['minotaurs', 'basilisks', 'hydras'],
  ['krakens', 'wyverns'],
  ['wyverns', 'basilisks', 'specters'], // FIRE · EARTH · DARK
  ['krakens', 'minotaurs', 'wisps'], // WATER · FIRE · LIGHT
  ['hydras', 'elementals', 'gnolls'], // WATER · FIRE · DARK
  ['hydras', 'mimics', 'specters'], // WATER · NATURE · DARK
  ['basilisks', 'wyverns', 'gnolls'], // EARTH · FIRE · DARK
  ['wisps', 'minotaurs', 'wolves'], // LIGHT · FIRE · NATURE
  ['krakens', 'elementals', 'basilisks'], // WATER · FIRE · EARTH
  ['wisps', 'hydras', 'gnolls'], // LIGHT · WATER · DARK
  ['minotaurs', 'specters', 'wolves'], // FIRE · DARK · NATURE
  ['basilisks', 'specters', 'krakens'], // EARTH · DARK · WATER
]

// Boss (étage 10 de chaque chapitre) : cards/monsters/bosses/BOSS-NNN.
// BOSS-010..013 sont les boss de RAID (raid.definitions.ts) : la campagne ne
// les prend jamais. Les chapitres 9 à 14 prennent les six images libres
// (014..019), le 15 prend la 009.
const BOSS_SLUG = 'bosses'
const BOSS_SPRITE_BY_CHAPTER: readonly number[] = [
  1, 2, 3, 4, 5, 6, 7, 8, 14, 15, 16, 17, 18, 19, 9,
]

// Apparence cosmétique ET élément par étage : clé `${chapter}-${index}`, valeur
// = une entrée par slot d'ennemi. `appearance` = sous-chemin MinIO (sans cards/
// ni .png), `family` = clé dans FAMILY_ELEMENTS (= fam.slug, le dossier MinIO).
// Vrai pour les étages 1-9 : le sprite et l'élément sortent du même tirage et
// ne peuvent pas diverger. Faux pour les boss (étage 10) : leur élément vient
// de BOSS_ELEMENT_BY_CHAPTER, pas de `family` — voir `family` optionnel ci-dessous.
type StageLook = { appearance: string; family?: FamilySlug }

const STAGE_LOOKS: Record<string, StageLook[]> = (() => {
  const looks: Record<string, StageLook[]> = {}
  const nextSprite = makeSpriteCursor()
  const nextLook = (slug: FamilySlug): StageLook => ({
    appearance: nextSprite(slug),
    family: slug,
  })
  CHAPTER_FAMILIES.forEach((fams, ci) => {
    const chapter = ci + 1
    for (let stage = 1; stage < STAGES_PER_CHAPTER; stage++) {
      looks[`${chapter}-${stage}`] = [0, 1, 2].map((slot) =>
        nextLook(
          at(
            fams,
            (stage + slot) % fams.length,
            `Familles du chapitre ${chapter}`,
          ),
        ),
      )
    }
    const bossNum = String(
      at(BOSS_SPRITE_BY_CHAPTER, ci, 'Sprite de boss par chapitre'),
    ).padStart(3, '0')
    // Pas de `family` pour le boss : son élément vient de
    // BOSS_ELEMENT_BY_CHAPTER (voir bossEnemyTeam), pas de FAMILY_ELEMENTS.
    looks[`${chapter}-${STAGES_PER_CHAPTER}`] = [
      {
        appearance: `monsters/${BOSS_SLUG}/BOSS-${bossNum}`,
      },
    ]
  })
  return looks
})()

function looksForStage(chapter: number, stageIndex: number): StageLook[] {
  return STAGE_LOOKS[`${chapter}-${stageIndex}`] ?? []
}

export function enemyPower(chapter: number, stageIndex: number) {
  const rb = rarityBaseAt(globalStage(chapter, stageIndex))
  const scale = enemyScale(globalStage(chapter, stageIndex))
  return {
    baseHp: Math.round(rb.hp * NORMAL_FACTOR * scale),
    baseAtk: Math.round(rb.atk * NORMAL_FACTOR * scale),
    baseDef: Math.round(rb.def * NORMAL_FACTOR * ENEMY_DEF_MULT),
    // La vitesse ne suit PLUS l'échelle d'étage : comme celle du joueur, elle
    // reste la valeur de base. Seul le rapport entre les deux camps compte
    // sous ATB, et le faire croître des deux côtés ne changeait rien au combat
    // tout en gonflant la jauge de puissance (un boss d'étage 80 y paraissait
    // 23 fois plus fort qu'il ne l'est).
    baseSpd: rb.spd,
  }
}

export function normalEnemyTeam(chapter: number, stageIndex: number) {
  const p = enemyPower(chapter, stageIndex)
  const looks = looksForStage(chapter, stageIndex)
  return [0, 1, 2].map((slot) => {
    const look = at(
      looks,
      slot,
      `Apparences de l'étage ${chapter}-${stageIndex}`,
    )
    if (!look.family) {
      throw new Error(
        `Stage look ${chapter}-${stageIndex} slot ${slot} has no family (normal stages must set one)`,
      )
    }
    return {
      ...p,
      level: 1,
      palier: 1,
      attackPattern: 'BASIC',
      appearance: look.appearance,
      element: FAMILY_ELEMENTS[look.family],
    }
  })
}

export function bossEnemyTeam(chapter: number, stageIndex: number) {
  const rb = rarityBaseAt(globalStage(chapter, stageIndex))
  const looks = looksForStage(chapter, stageIndex)
  const scale =
    enemyScale(globalStage(chapter, stageIndex)) * bossGearCompensation(chapter)
  return [
    {
      baseHp: Math.round(rb.hp * BOSS_HP_MULT * BOSS_FACTOR * scale),
      baseAtk: Math.round(rb.atk * BOSS_FACTOR * scale),
      baseDef: Math.round(rb.def * 1.2 * BOSS_FACTOR * ENEMY_DEF_MULT),
      baseSpd: rb.spd,
      level: 1,
      palier: 1,
      attackPattern: 'AOE_3',
      appearance: at(looks, 0, `Apparence du boss ${chapter}-${stageIndex}`)
        .appearance,
      element: at(BOSS_ELEMENT_BY_CHAPTER, chapter - 1, 'Élément de boss'),
    },
  ]
}

// Ordre croissant des raretés — sert à interpoler les poids de farm et à
// nommer les planchers de premier passage.
const RARITY_LADDER = [
  'COMMON',
  'UNCOMMON',
  'RARE',
  'EPIC',
  'LEGENDARY',
] as const

/**
 * Avancement dans la campagne, 0 à l'étage 1-1 et 1 au boss final.
 *
 * Tout ce qui touche à la rareté du butin s'appuie dessus plutôt que sur
 * `stageIndex` seul. L'ancienne version ne regardait que l'index dans le
 * chapitre : les paliers se réinitialisaient à chaque chapitre, si bien que
 * l'étage 9-3 lâchait exactement le même butin que le 1-3 — 80 % de communes
 * en fin de partie — et que le plancher COMMUNE des premiers passages ne
 * tombait que sur 9 étages sur 90 (l'index 3, seul point où « index <= 3 »
 * pour le plancher et « index >= 3 » pour la présence du drop se recoupent).
 */
function campaignProgress(chapter: number, stageIndex: number): number {
  return (globalStage(chapter, stageIndex) - 1) / (TOTAL_STAGES - 1)
}

/**
 * Poids de rareté du farm, interpolés linéairement entre le premier et le
 * dernier étage. Les deux bornes somment 100, donc l'interpolation aussi :
 * les poids se lisent directement comme des pourcentages.
 *
 * Les communes dominent au départ puis s'éteignent complètement ; les hautes
 * raretés n'apparaissent qu'en montant. Le boss farme comme deux étages plus
 * loin (voir BOSS_FARM_STAGE_LEAD).
 */
const FARM_WEIGHTS_START: Record<string, number> = { COMMON: 90, UNCOMMON: 10 }
const FARM_WEIGHTS_END: Record<string, number> = {
  UNCOMMON: 35,
  RARE: 45,
  EPIC: 17,
  LEGENDARY: 3,
}

function farmWeightsAt(progress: number): Record<string, number> {
  const weights: Record<string, number> = {}
  for (const rarity of RARITY_LADDER) {
    const from = FARM_WEIGHTS_START[rarity] ?? 0
    const to = FARM_WEIGHTS_END[rarity] ?? 0
    const w = Math.round((from + (to - from) * progress) * 10) / 10
    // Une rareté à poids nul est omise plutôt que stockée à 0 : le tirage
    // (pickWeightedRarity) itère sur les entrées, autant qu'il ne voie que
    // ce qui peut réellement tomber.
    if (w > 0) {
      weights[rarity] = w
    }
  }
  return weights
}

/**
 * Plancher de rareté du premier passage, par quart de campagne. Un plancher
 * seulement : `pickFirstClearRarity` tire ensuite parmi les raretés au-dessus,
 * avec une décroissance forte (equipment-drop.domain.ts).
 */
function firstClearFloorAt(progress: number): string {
  if (progress < 0.25) {
    return 'COMMON'
  }
  if (progress < 0.55) {
    return 'UNCOMMON'
  }
  if (progress < 0.85) {
    return 'RARE'
  }
  return 'EPIC'
}

// --- Butin : total de la campagne CONSTANT malgré l'étirement ---------------
//
// Le total de la campagne est celui de la campagne de référence : l'étirer ne
// doit pas multiplier ce qu'elle rapporte. Le FARM d'un étage est un
// rendement par combat, il suit simplement la position (`difficultyMult`).
// Les gains one-shot sont répartis :
// - premier passage normal : ×81/135, pour que les 135 étages normaux
//   paient ce que paient les 81 de référence ;
// - équipement garanti au premier passage : seulement à l'étage où la
//   position franchit un entier, soit une pièce par étage de référence ;
// - boss : le facteur ×1,5 par chapitre suit le chapitre de RÉFÉRENCE
//   (fractionnaire), et BOSS_LOOT_SHARE ramène la somme des 15 boss à celle
//   des 9 de référence. Carte garantie seulement aux boss où le chapitre de
//   référence franchit un entier : 9 cartes (3 rares, 5 épiques,
//   1 légendaire).
const NORMAL_STAGES = TOTAL_STAGES - CHAPTER_COUNT
const FIRST_CLEAR_SHARE =
  (REFERENCE_STAGES - REFERENCE_CHAPTERS) / NORMAL_STAGES

/** Chapitre de référence FRACTIONNAIRE d'un boss : 1 au chapitre 1, 9 au 15. */
function bossReferenceChapter(chapter: number): number {
  return 1 + ((chapter - 1) * (REFERENCE_CHAPTERS - 1)) / (CHAPTER_COUNT - 1)
}

const BOSS_LOOT_SHARE = (() => {
  let reference = 0
  for (let k = 1; k <= REFERENCE_CHAPTERS; k++) {
    reference += 1.5 ** (k - 1)
  }
  let stretched = 0
  for (let c = 1; c <= CHAPTER_COUNT; c++) {
    stretched += 1.5 ** (bossReferenceChapter(c) - 1)
  }
  return reference / stretched
})()

export function lootTableNormal(chapter: number, stageIndex: number) {
  const d = difficultyMult(chapter, stageIndex)
  const firstClearScale = d ** FIRST_CLEAR_EXP
  const minRarity = firstClearFloorAt(campaignProgress(chapter, stageIndex))

  const firstClear: {
    gold: number
    dust: number
    xp: number
    guaranteedEquipment?: { minRarity: string }
  } = {
    gold: Math.round(
      FIRST_CLEAR_GOLD_BASE * firstClearScale * FIRST_CLEAR_SHARE,
    ),
    dust: Math.round(
      FIRST_CLEAR_DUST_BASE * firstClearScale * FIRST_CLEAR_SHARE,
    ),
    xp: Math.round(FIRST_CLEAR_XP_BASE * firstClearScale * FIRST_CLEAR_SHARE),
  }
  // Équipement garanti à partir de la position 3 de la courbe (le temps que
  // le joueur voie quelques combats avant de recevoir du stuff), et
  // seulement là où la position franchit un entier — voir FIRST_CLEAR_SHARE.
  const g = globalStage(chapter, stageIndex)
  const position = curvePosition(g)
  if (
    position >= 3 &&
    Math.floor(position) > Math.floor(curvePosition(g - 1))
  ) {
    firstClear.guaranteedEquipment = { minRarity }
  }

  return {
    firstClear,
    farm: farmAt(globalStage(chapter, stageIndex)),
  }
}

/**
 * Butin de farm d'un étage global. Tout suit la position dans la campagne,
 * chances de drop comprises : indexées sur l'étage du chapitre, elles
 * retombaient à chaque début de chapitre et le N-9 lâchait plus
 * d'équipement que les premiers étages du N+1.
 */
function farmAt(globalStageNumber: number) {
  const farmScale = lootMult(globalStageNumber) ** FARM_EXP
  // Le boss final farme au-delà du dernier étage : l'avancement plafonne.
  const progress = Math.min(1, (globalStageNumber - 1) / (TOTAL_STAGES - 1))
  return {
    gold: Math.round(FARM_GOLD_BASE * farmScale),
    dust: Math.round(FARM_DUST_BASE * farmScale),
    xp: Math.round(FARM_XP_BASE * farmScale),
    equipmentDropChance: Math.round((0.15 + 0.05 * progress) * 1e4) / 1e4,
    equipmentWeights: farmWeightsAt(progress),
    cardChance: Math.round((0.005 + 0.005 * progress) * 1e5) / 1e5,
  }
}

// Plancher garanti des boss : RARE pour les chapitres de référence 1-3, EPIC
// pour les 4-8, LEGENDARY pour le boss final (référence 9). La légendaire
// terminale est une récompense one-shot en fin de campagne, à mettre en
// regard du taux de tirage de 0,20 %.
//
// Carte ET équipement suivent la MÊME échelle : l'équipement était figé à
// RARE pour les neuf boss, si bien que le boss final garantissait la même
// pièce que le boss du chapitre 1.
function bossFloor(chapter: number): string {
  const reference = Math.floor(bossReferenceChapter(chapter))
  return reference <= 3 ? 'RARE' : reference <= 8 ? 'EPIC' : 'LEGENDARY'
}

/** Ce boss garantit-il une carte ? Voir BOSS_LOOT_SHARE. */
function bossGivesCard(chapter: number): boolean {
  return (
    chapter === 1 ||
    Math.floor(bossReferenceChapter(chapter)) >
      Math.floor(bossReferenceChapter(chapter - 1))
  )
}

export function bossLoot(chapter: number) {
  const m = 1.5 ** (bossReferenceChapter(chapter) - 1) * BOSS_LOOT_SHARE
  return {
    firstClear: {
      // ÷3 (spec 2026-07-20) : l'or des boss finançait ~900 jetons en boutique
      gold: Math.round(1650 * m),
      dust: Math.round(1000 * m),
      // ÷3 avec FIRST_CLEAR_XP_BASE (2026-09-15) : le facteur géométrique
      // 1.5^(chapitre-1) n'est pas borné, le boss 9 valait 5 126 XP à lui
      // seul — autant que les 30 premiers niveaux réunis.
      xp: Math.round(65 * m),
      guaranteedEquipment: { minRarity: bossFloor(chapter) },
      ...(bossGivesCard(chapter)
        ? { guaranteedCard: { minRarity: bossFloor(chapter) } }
        : {}),
    },
    farm: farmAt(
      globalStage(chapter, STAGES_PER_CHAPTER) + BOSS_FARM_STAGE_LEAD,
    ),
  }
}

/**
 * Libellé d'un étage de campagne — le gabarit, jamais l'occurrence.
 *
 * Il ne dépend PAS de la langue : « 3-10 Boss » s'écrit de la même façon en
 * français et en anglais (« boss » est le mot anglais, emprunté tel quel par
 * le français). Le seed écrit donc la même valeur dans `labelFr` et
 * `labelEn` — ce n'est pas une traduction oubliée, et
 * `content-translations.test.ts` l'inscrit à ce titre dans ses exceptions.
 */
export function campaignStageLabel(chapter: number, index: number): string {
  return index === STAGES_PER_CHAPTER
    ? `${chapter}-${index} Boss`
    : `${chapter}-${index}`
}
