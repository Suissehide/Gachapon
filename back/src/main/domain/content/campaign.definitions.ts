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

export const CHAPTER_COUNT = 9
export const STAGES_PER_CHAPTER = 10

// Courbe de difficulté CONTINUE et CONCAVE sur le n° de stage global
// n = (chapitre-1)×10 + index (1..90) : mult(n) = (1 + 0.08·(n-1))^2.5.
// Utilisée UNIQUEMENT pour le BUTIN (loot) — plus pour les stats ennemies.
const CURVE_A = 0.08
const CURVE_B = 2.5

// Progression joueur attendue par chapitre : l'ennemi s'y aligne (base de
// rareté + enemyScale) pour que ses stats ET sa vitesse scalent comme le
// joueur sous l'ATB. PV/ATQ/DEF = médianes des 602 cartes après la hausse
// par archétype du 2026-10-07 (scripts/rebalance-cards.py les affiche) ; la
// vitesse, que cette hausse ne touche pas, garde ses valeurs historiques.
export const RARITY_BASE = {
  COMMON: { hp: 124, atk: 24, def: 14, spd: 89 },
  UNCOMMON: { hp: 162, atk: 35, def: 17, spd: 95 },
  RARE: { hp: 230, atk: 50, def: 20, spd: 97 },
  EPIC: { hp: 454, atk: 76, def: 41, spd: 102 },
  LEGENDARY: { hp: 761, atk: 122, def: 58, spd: 103 },
} as const
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

// --- Courbe de difficulté : PV par ancres, sans marche ---------------------
//
// Refonte du 2026-10-07. La courbe précédente (niveau × ascension ×
// compensation d'équipement fittée par chapitre) suivait un joueur qui
// changeait de cartes ET d'équipement EN BLOC à chaque frontière : les
// ennemis y sautaient de ×1,9 à ×3,6 (4-9 → 5-1), et le chapitre 5 supposait
// trois légendaires — un joueur resté en épiques y tombait de 88 % à 0 %.
//
// Désormais le joueur de référence (`campaignProfile`, harnais
// `balance-calibration.ts`) améliore ses cartes et ses pièces UNE à la fois au
// fil des chapitres, et reste en épiques. Les ancres ci-dessous sont les PV
// (avant NORMAL_FACTOR) d'un ennemi normal qui donnent ~88 % de victoire à ce
// joueur. Entre deux ancres, interpolation GÉOMÉTRIQUE étage par étage. Les
// stats suivent les PV : `enemyScale` = PV visés / PV de base de la rareté du
// chapitre.
//
// Refittées le 2026-10-07 (soir), après la hausse des stats de base par
// archétype et le doublement des % d'équipement, puis le 2026-10-08 : les
// cibles, d'abord abaissées à 83 / 65 %, sont revenues à 88 / 70 % (la
// campagne paraissait monter bien plus vite que les cartes). NB : 5 points
// de victoire ne valent que ~2 % de stats ennemies, tant le combat 3v3 est
// tranché.
// UNE ANCRE PAR ÉTAGE normal désormais : avec des ancres aux étages 1/5/9
// seulement, les étages 2 et 8 des chapitres 1-4 tombaient à 40-60 %, parce
// que le joueur de référence change de carte aux étages 3, 6 et 9.
//
// Méthode (reproductible) : `SIM_MODE=campaign-fit SIM_STAGES=all` de
// scripts/tower-sim.ts mesure les PV qui donnent la cible à chaque étage,
// puis la courbe retenue en est l'ENVELOPPE INFÉRIEURE — jamais au-dessus de
// la mesure (un étage ne doit pas être plus dur que sa cible), pas plafonné
// à ×1,2 par étage et ×1,34 à une frontière de chapitre, au moins +0,1 % par
// étage. Un CREUX de mesure (étage qui réclame moins que le précédent) est
// d'abord relevé de 1 % au plus, pour ne pas abaisser tout ce qui le précède
// — pas davantage : 3 % de stats valent ~11 points de victoire ici. Ce qui s'écarte de la mesure, et pourquoi :
// - Chapitre 1 : tutoriel, calé sur ~95 % de victoire (boss compris), et
//   1-1 / 1-2 mesurés sur un joueur SANS équipement (première pièce garantie
//   à l'étage 3) ; le pas plafonné fait du reste du chapitre une rampe plus
//   facile que la mesure.
// - Chapitre 5 : ses étages n'alignent que deux familles (Feu/Eau/Feu), un
//   contre-pick Eau y bat deux ennemis sur trois et la mesure réclamait ×1,8
//   d'un coup après 4-9. Le plafond de pas en fait une rampe : plus facile
//   que la cible (75 à 99 % des PV mesurés), sans mur.
// - Chapitre 6 : le joueur y stagne (pièces UNCOMMON n12 → RARE n6), la
//   mesure y est plate voire décroissante (16 643 PV à 6-1, 15 358 à 6-5) ;
//   la courbe y suit la croissance minimale, son début est plus facile que
//   la cible.
export const NORMAL_HP_ANCHORS: readonly (readonly [number, number])[] = [
  [1, 134],
  [2, 148],
  [3, 178],
  [4, 213],
  [5, 256],
  [6, 307],
  [7, 368],
  [8, 442],
  [9, 530],
  [11, 705],
  [12, 718],
  [13, 862],
  [14, 908],
  [15, 965],
  [16, 1127],
  [17, 1195],
  [18, 1220],
  [19, 1445],
  [21, 1830],
  [22, 1876],
  [23, 2251],
  [24, 2434],
  [25, 2489],
  [26, 2987],
  [27, 3142],
  [28, 3238],
  [29, 3886],
  [31, 4953],
  [32, 5064],
  [33, 5494],
  [34, 5909],
  [35, 6409],
  [36, 6592],
  [37, 6756],
  [38, 6990],
  [39, 7332],
  [41, 9825],
  [42, 11790],
  [43, 13976],
  [44, 14516],
  [45, 14973],
  [46, 14988],
  [47, 15003],
  [48, 15018],
  [49, 15033],
  [51, 15048],
  [52, 15063],
  [53, 15078],
  [54, 15093],
  [55, 15109],
  [56, 15514],
  [57, 15555],
  [58, 15858],
  [59, 15874],
  [61, 20704],
  [62, 21392],
  [63, 21759],
  [64, 22471],
  [65, 23683],
  [66, 24257],
  [67, 24900],
  [68, 25975],
  [69, 26612],
  [71, 27284],
  [72, 27311],
  [73, 27987],
  [74, 29004],
  [75, 29356],
  [76, 29385],
  [77, 30240],
  [78, 30424],
  [79, 31250],
  [81, 31801],
  [82, 31833],
  [83, 31865],
  [84, 31897],
  [85, 31928],
  [86, 31960],
  [87, 31992],
  [88, 32024],
  [89, 32056],
]
const GROWTH_AFTER_LAST_ANCHOR = 1.003

/** PV de base (avant NORMAL_FACTOR) visés à un étage global. */
export function targetHp(globalStageNumber: number): number {
  const suivante = NORMAL_HP_ANCHORS.findIndex(
    ([stage]) => stage >= globalStageNumber,
  )
  if (suivante === -1) {
    const [stage, hp] = at(
      NORMAL_HP_ANCHORS,
      NORMAL_HP_ANCHORS.length - 1,
      'Ancres de PV',
    )
    return hp * GROWTH_AFTER_LAST_ANCHOR ** (globalStageNumber - stage)
  }
  const [stageB, hpB] = at(NORMAL_HP_ANCHORS, suivante, 'Ancres de PV')
  if (suivante === 0 || stageB === globalStageNumber) {
    return hpB
  }
  const [stageA, hpA] = at(NORMAL_HP_ANCHORS, suivante - 1, 'Ancres de PV')
  return hpA * (hpB / hpA) ** ((globalStageNumber - stageA) / (stageB - stageA))
}

/** Multiplicateur de stats ennemies à un étage global (1..90). */
export function enemyScale(globalStageNumber: number): number {
  const chapter = Math.min(
    CHAPTER_COUNT,
    Math.max(1, Math.ceil(globalStageNumber / STAGES_PER_CHAPTER)),
  )
  const rarity = at(RARITY_BY_CHAPTER, chapter - 1, 'Rareté par chapitre')
  return targetHp(globalStageNumber) / RARITY_BASE[rarity].hp
}

/**
 * Facteur propre à chaque BOSS, par-dessus la courbe des étages normaux.
 *
 * Les boss ne peuvent pas partager le facteur des étages normaux : leur cible
 * diffère (70 % contre 88 %) et leurs multiplicateurs propres (PV ×3.25,
 * AOE_3) ne tombent pas au même endroit selon le chapitre. Mesuré : avec le
 * seul facteur des étages normaux, les neuf boss s'étalent de 0 % à 100 % de
 * victoire ; avec celui-ci, ils tiennent leur cible (refit du 2026-10-07).
 */
// Le boss 1-10 est fitté sur la cible du tutoriel (~95 %), comme le reste du
// chapitre 1.
const BOSS_GEAR_COMPENSATION: readonly number[] = [
  0.9, 1.2, 0.92, 1.09, 1.29, 0.91, 0.93, 1.25, 1.23,
]

export function bossGearCompensation(chapter: number): number {
  return BOSS_GEAR_COMPENSATION[chapter - 1] ?? 1
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

// Prime de farm du boss par rapport à un stage normal de même position.
// Alignée sur son surcoût de difficulté réel (+2 à +5 niveaux requis, fight
// mono-cible) — l'ancien ×2.5 rendait le boss N-10 plus rentable que TOUS les
// stages normaux du chapitre N+1 (boss 2-10 : 45 dust vs 23 pour un 3-7
// pourtant plus dur), vidant la progression de son intérêt.
const BOSS_FARM_PREMIUM = 1.25

function globalStage(chapter: number, stageIndex: number): number {
  return (chapter - 1) * STAGES_PER_CHAPTER + stageIndex
}

export function difficultyMult(chapter: number, stageIndex: number): number {
  return (1 + CURVE_A * (globalStage(chapter, stageIndex) - 1)) ** CURVE_B
}

// Le bestiaire (familles, sprites, élément par famille) vit dans
// `seed/bestiary.ts` : les tours y puisent aussi, et une seule table évite
// qu'un monstre ait un élément en campagne et un autre en tour.
//
// Comme chaque étage tire ses 3 slots dans 3 familles différentes (voir
// STAGE_LOOKS), les étages des chapitres 1-4 et 6-9 présentent naturellement
// 3 éléments distincts. Exception : le chapitre 5 (CHAPTER_FAMILIES) n'a que
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
  'FIRE', // ch.9 mobs : EARTH · DARK · WATER
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
  ['basilisks', 'specters', 'krakens'], // EARTH · DARK · WATER
]

// Boss (étage 10 de chaque chapitre) : cards/monsters/bosses/BOSS-001..019.
const BOSS_SLUG = 'bosses'
const BOSS_COUNT = 19

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
    for (let stage = 1; stage <= 9; stage++) {
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
    const bossNum = String(((chapter - 1) % BOSS_COUNT) + 1).padStart(3, '0')
    // Pas de `family` pour le boss : son élément vient de
    // BOSS_ELEMENT_BY_CHAPTER (voir bossEnemyTeam), pas de FAMILY_ELEMENTS.
    looks[`${chapter}-10`] = [
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
  const rb =
    RARITY_BASE[at(RARITY_BY_CHAPTER, chapter - 1, 'Rareté par chapitre')]
  const scale = enemyScale(globalStage(chapter, stageIndex))
  return {
    baseHp: Math.round(rb.hp * NORMAL_FACTOR * scale),
    baseAtk: Math.round(rb.atk * NORMAL_FACTOR * scale),
    baseDef: Math.round(rb.def * NORMAL_FACTOR * scale),
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
  const scale = enemyScale(globalStage(chapter, stageIndex))
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
      // La puissance de l'ennemi est pré-cuite dans ses stats de base par
      // enemyPower(), donc son niveau vaut 1 et ne peut pas servir à dériver
      // sa mitigation. On transporte le facteur d'échelle explicitement.
      mitigationScale: scale,
      attackPattern: 'BASIC',
      appearance: look.appearance,
      element: FAMILY_ELEMENTS[look.family],
    }
  })
}

export function bossEnemyTeam(chapter: number, stageIndex: number) {
  const rb =
    RARITY_BASE[at(RARITY_BY_CHAPTER, chapter - 1, 'Rareté par chapitre')]
  const looks = looksForStage(chapter, stageIndex)
  const scale =
    enemyScale(globalStage(chapter, stageIndex)) * bossGearCompensation(chapter)
  return [
    {
      baseHp: Math.round(rb.hp * BOSS_HP_MULT * BOSS_FACTOR * scale),
      baseAtk: Math.round(rb.atk * BOSS_FACTOR * scale),
      baseDef: Math.round(rb.def * 1.2 * BOSS_FACTOR * scale),
      baseSpd: rb.spd,
      level: 1,
      palier: 1,
      // Même raison que normalEnemyTeam : niveau figé à 1, la mitigation
      // suit le facteur d'échelle plutôt que le niveau.
      mitigationScale: scale,
      attackPattern: 'AOE_3',
      appearance: at(looks, 0, `Apparence du boss ${chapter}-${stageIndex}`)
        .appearance,
      element: BOSS_ELEMENT_BY_CHAPTER[chapter - 1],
    },
  ]
}

const TOTAL_STAGES = CHAPTER_COUNT * STAGES_PER_CHAPTER

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
 * raretés n'apparaissent qu'en montant. Le boss reste légèrement au-dessus de
 * l'étage normal de fin de campagne (voir `bossLoot`), et sa chance de drop
 * est deux fois plus élevée.
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

export function lootTableNormal(chapter: number, stageIndex: number) {
  const d = difficultyMult(chapter, stageIndex)
  const farmScale = d ** FARM_EXP
  const firstClearScale = d ** FIRST_CLEAR_EXP
  const progress = campaignProgress(chapter, stageIndex)
  const minRarity = firstClearFloorAt(progress)
  const farmWeights = farmWeightsAt(progress)
  const t = (stageIndex - 1) / 8

  const firstClear: {
    gold: number
    dust: number
    xp: number
    guaranteedEquipment?: { minRarity: string }
  } = {
    gold: Math.round(FIRST_CLEAR_GOLD_BASE * firstClearScale),
    dust: Math.round(FIRST_CLEAR_DUST_BASE * firstClearScale),
    xp: Math.round(FIRST_CLEAR_XP_BASE * firstClearScale),
  }
  // Équipement garanti partout SAUF sur les deux tout premiers étages de la
  // campagne, le temps que le joueur voie un combat avant de recevoir du
  // stuff. C'était « index >= 3 », donc réinitialisé à chaque chapitre : les
  // étages 9-1 et 9-2 ne donnaient toujours rien.
  if (globalStage(chapter, stageIndex) >= 3) {
    firstClear.guaranteedEquipment = { minRarity }
  }

  return {
    firstClear,
    farm: {
      gold: Math.round(FARM_GOLD_BASE * farmScale),
      dust: Math.round(FARM_DUST_BASE * farmScale),
      xp: Math.round(FARM_XP_BASE * farmScale),
      equipmentDropChance: 0.15 + 0.05 * t,
      equipmentWeights: farmWeights,
      cardChance: 0.005 + 0.005 * t,
    },
  }
}

// Plancher garanti des boss : RARE pour les chapitres 1-3, EPIC pour les 4-8,
// LEGENDARY pour le boss 9-10 qui conclut la campagne. La légendaire terminale
// est une récompense one-shot après 90 étages, à mettre en regard du taux de
// tirage de 0,20 %.
//
// Carte ET équipement suivent la MÊME échelle : l'équipement était figé à
// RARE pour les neuf boss, si bien que le boss final garantissait la même
// pièce que le boss du chapitre 1.
// Avance de butin du boss sur les étages normaux de son chapitre, exprimée
// dans l'unité de `campaignProgress` : ~13 étages d'avance.
const BOSS_LOOT_PROGRESS_BONUS = 0.15

function bossFloor(chapter: number): string {
  return chapter <= 3 ? 'RARE' : chapter <= 8 ? 'EPIC' : 'LEGENDARY'
}

export function bossLoot(chapter: number) {
  const m = 1.5 ** (chapter - 1)
  const atBossStage = lootTableNormal(chapter, STAGES_PER_CHAPTER)
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
      guaranteedCard: { minRarity: bossFloor(chapter) },
    },
    farm: {
      gold: Math.round(atBossStage.farm.gold * BOSS_FARM_PREMIUM),
      dust: Math.round(atBossStage.farm.dust * BOSS_FARM_PREMIUM),
      xp: Math.round(atBossStage.farm.xp * BOSS_FARM_PREMIUM),
      equipmentDropChance: 0.3,
      // Même courbe que les étages normaux, prise un cran plus loin dans la
      // campagne — plutôt qu'une table figée identique pour les neuf boss,
      // qui faisait lâcher au boss du chapitre 1 le même butin qu'au boss
      // final (40/40/18/2, soit 18 % d'épiques dès le premier chapitre).
      // Le boss garde par ailleurs le double de chance de drop et sa prime
      // d'or/poussière.
      equipmentWeights: farmWeightsAt(
        Math.min(
          1,
          campaignProgress(chapter, STAGES_PER_CHAPTER) +
            BOSS_LOOT_PROGRESS_BONUS,
        ),
      ),
      cardChance: 0.02,
    },
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
