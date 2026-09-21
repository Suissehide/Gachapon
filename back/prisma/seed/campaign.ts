import type { PrismaClient } from '../../src/generated/client'
import { MAX_PALIER } from '../../src/main/domain/card-leveling/card-leveling.domain'
import type { Element } from '../../src/main/domain/combat/element'
import { FAMILY_ELEMENTS, type FamilySlug, makeSpriteCursor } from './bestiary'

export const CHAPTER_COUNT = 9
export const STAGES_PER_CHAPTER = 10

// Courbe de difficulté CONTINUE et CONCAVE sur le n° de stage global
// n = (chapitre-1)×10 + index (1..90) : mult(n) = (1 + 0.08·(n-1))^2.5.
// Utilisée UNIQUEMENT pour le BUTIN (loot) — plus pour les stats ennemies.
const CURVE_A = 0.08
const CURVE_B = 2.5

// Progression joueur attendue par chapitre : l'ennemi s'y aligne (base de
// rareté + enemyScale) pour que ses stats ET sa vitesse scalent comme le
// joueur sous l'ATB. Valeurs = médianes du roster (prisma/seed/cards.ts).
export const RARITY_BASE = {
  COMMON: { hp: 101, atk: 20, def: 5, spd: 89 },
  UNCOMMON: { hp: 135, atk: 29, def: 7, spd: 95 },
  RARE: { hp: 192, atk: 40, def: 10, spd: 97 },
  EPIC: { hp: 338, atk: 62, def: 17, spd: 102 },
  LEGENDARY: { hp: 587, atk: 98, def: 30, spd: 103 },
} as const
const RARITY_BY_CHAPTER = [
  'COMMON',
  'UNCOMMON',
  'RARE',
  'EPIC',
  'LEGENDARY',
  'LEGENDARY',
  'LEGENDARY',
  'LEGENDARY',
  'LEGENDARY',
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

// --- Courbe de difficulté : continue, en deux phases -----------------------
//
// Phase 1 (étages 1-70) — le joueur progresse par le NIVEAU.
//   L'ascension ennemie est continue sur l'étage global (plus de marche aux
//   frontières de chapitre) et avance un peu plus vite que celle du joueur :
//   0.105/étage contre 0.10, soit un palier tous les 9.5 étages au lieu de 10.
//   Comme le joueur ascensionne EN BLOC au changement de chapitre, l'écart
//   repart près de zéro à chaque chapitre puis monte jusqu'au boss — qui est
//   donc le point haut de son chapitre, par construction.
//
// Phase 2 (étages 71-90) — le joueur est au plafond, il progresse par
//   l'ÉQUIPEMENT. L'ascension ennemie est figée (elle sature à l'étage
//   10 × MAX_PALIER) et le gain de niveau est divisé par deux : l'amplitude
//   d'un chapitre tombe de ~14 à ~6 points.
const ENEMY_STAT_GROWTH_PER_LEVEL = 0.09
const ENEMY_GROWTH_LATE = 0.03
const ENEMY_ASCENSION_BONUS = 0.15
const ENEMY_ASCENSION_PER_STAGE = 0.105
const PLAYER_CAP_STAGE = 10 * MAX_PALIER // 70

/**
 * Durcissement de la campagne — montée puis plateau, jamais de redescente.
 *
 * Mesuré au simulateur avec le roster réel rapporté par le joueur (1 épique +
 * 2 rares niveau 10, trois pièces rares, un passif, un bonus de set à 3) :
 * chapitres 1 et 2 gagnés à 100 %, en 7 à 18 actions. Le début de campagne ne
 * demande rien.
 *
 * Le facteur ne touche PAS le chapitre 1, qui sert de tutoriel, monte jusqu'à
 * l'étage 20 puis reste au plafond. Une bosse qui redescendrait rendrait
 * l'étage 45 plus facile que le 25 — une campagne doit rester monotone, et un
 * test d'équilibrage le vérifie.
 *
 * Au-delà du chapitre 3, le modèle diverge de l'expérience réelle : il annonce
 * 0 % là où le joueur passe. L'équipement s'accumule en jouant, ce qu'un
 * roster figé ne capture pas. Ce facteur est donc calibré sur le DÉBUT, la
 * seule zone où mesure et partie concordent.
 */
// 1,12 de durcissement × 1,15 de compensation du gel de la vitesse (le joueur
// y gagne environ 15 % de vitesse relative). Les deux passent par la MONTÉE
// progressive plutôt que par un facteur plat : appliquée dès l'étage 1, la
// compensation rendait le tout premier combat INGAGNABLE avec trois communes
// médiocres — 1 % de victoire contre 47 % avant. Un tutoriel doit rester
// franchissable avec la pire main de départ.
const ENEMY_DIFFICULTY_MAX = 1.12 * 1.15
const DIFFICULTY_START_STAGE = 10
const DIFFICULTY_PEAK_STAGE = 20

function difficultyFactor(globalStageNumber: number): number {
  const t =
    (globalStageNumber - DIFFICULTY_START_STAGE) /
    (DIFFICULTY_PEAK_STAGE - DIFFICULTY_START_STAGE)
  return 1 + (ENEMY_DIFFICULTY_MAX - 1) * Math.max(0, Math.min(1, t))
}

/**
 * Courbe de base — niveau, ascension, durcissement de 2026-08-07. Elle ne
 * connaît que la progression en NIVEAU du joueur ; la compensation
 * d'équipement s'applique par-dessus (voir `enemyScale`).
 */
export function baseEnemyScale(globalStageNumber: number): number {
  const capped = Math.min(globalStageNumber, PLAYER_CAP_STAGE)
  const overflow = Math.max(0, globalStageNumber - PLAYER_CAP_STAGE)
  const level =
    1 +
    ENEMY_STAT_GROWTH_PER_LEVEL * (capped - 1) +
    ENEMY_GROWTH_LATE * overflow
  const ascension =
    (1 + ENEMY_ASCENSION_BONUS) ** (ENEMY_ASCENSION_PER_STAGE * (capped - 1))
  return level * ascension * difficultyFactor(globalStageNumber)
}

/**
 * Compensation d'ÉQUIPEMENT (2026-09-21) — ce que la courbe de base ignorait.
 *
 * `baseEnemyScale` ne suit que le niveau et le palier du joueur. Or celui-ci
 * s'équipe en jouant, et l'équipement pèse lourd : mesuré au simulateur avec
 * le vrai catalogue, la campagne ENTIÈRE — boss 9-10 compris — se gagnait à
 * 100 % avec sept pièces rares niveau 3. Le modèle qui avait servi à la
 * calibrer (`GEAR_PROFILES` de `balance-sim.ts`) réduit l'équipement à trois
 * pourcentages et ignore le bloc crit / pénétration, lequel ne dépend ni du
 * niveau ni du palier — d'où l'écart entre « le modèle annonce 0 % dès le
 * chapitre 3 » et « les joueurs passent ».
 *
 * Deux bornes par chapitre (étage 1 et étage 9), interpolées linéairement.
 * Pourquoi pas une formule lisse sur les 90 étages : le taux de victoire est
 * une fonction QUASI BINAIRE des stats — 23 % d'écart séparent 90 % et 10 %
 * de victoire — et la compensation requise n'est pas monotone d'un chapitre
 * à l'autre (le joueur gagne par paliers : 7e pièce, montée en rareté). La
 * meilleure rampe à deux paramètres qu'on ait trouvée ratait sa cible de
 * 61 points. Ces bornes sont donc MESURÉES chapitre par chapitre
 * (`scripts/tower-sim.ts`, harnais `balance-calibration.ts`) et
 * `campaign-balance.test.ts` les remesure à chaque exécution.
 *
 * Le chapitre 1 démarre à 1.0 : le tout premier combat reste exactement ce
 * qu'il était, comme le veut la règle du tutoriel (cf. `difficultyFactor`).
 */
const GEAR_COMPENSATION_BY_CHAPTER: readonly (readonly [number, number])[] = [
  [1.0, 1.14],
  [1.73, 1.21],
  [1.45, 1.28],
  [1.28, 1.12],
  [2.18, 1.95],
  [1.94, 1.73],
  [1.92, 1.71],
  [1.91, 1.83],
  [2.1, 1.99],
]

function rawGearCompensation(globalStageNumber: number): number {
  const chapter = Math.min(
    CHAPTER_COUNT,
    Math.max(1, Math.ceil(globalStageNumber / STAGES_PER_CHAPTER)),
  )
  const bornes = GEAR_COMPENSATION_BY_CHAPTER[chapter - 1]
  if (!bornes) {
    return 1
  }
  const [debut, fin] = bornes
  const index = globalStageNumber - (chapter - 1) * STAGES_PER_CHAPTER
  // Interpolation sur les NEUF étages normaux : le boss (index 10) prolonge
  // la borne de fin, il a son propre facteur (BOSS_GEAR_COMPENSATION).
  const t = Math.max(0, Math.min(1, (index - 1) / 8))
  return debut + (fin - debut) * t
}

/**
 * Échelle finale par étage, RENDUE MONOTONE par maximum courant.
 *
 * La compensation décroît à l'intérieur d'un chapitre (le joueur y est figé
 * pendant que l'ennemi monte) puis remonte au chapitre suivant. En phase 2
 * (étages 71-90) la courbe de base ne gagne que 0,4 % par étage, moins vite
 * que la compensation ne descend : le produit y reculerait. Le maximum
 * courant l'en empêche — une campagne doit rester monotone, et un test le
 * vérifie. Seize étages sur quatre-vingt-dix sont relevés par cette
 * contrainte, d'au plus quelques points de taux de victoire.
 */
const MONOTONIC_FLOOR_GROWTH = 1.001

const ENEMY_SCALE_BY_STAGE: readonly number[] = (() => {
  const total = CHAPTER_COUNT * STAGES_PER_CHAPTER
  const echelles: number[] = [0]
  let plancher = 0
  for (let g = 1; g <= total; g++) {
    // +0,1 % minimum d'un étage au suivant : un simple `Math.max` produirait
    // un PLATEAU, deux étages consécutifs aux ennemis identiques — illisible
    // pour le joueur, et refusé par le test de croissance stricte.
    plancher = Math.max(
      plancher * MONOTONIC_FLOOR_GROWTH,
      baseEnemyScale(g) * rawGearCompensation(g),
    )
    echelles.push(plancher)
  }
  return echelles
})()

/** Multiplicateur de stats ennemies à un étage global (1..90). */
export function enemyScale(globalStageNumber: number): number {
  return (
    ENEMY_SCALE_BY_STAGE[globalStageNumber] ??
    baseEnemyScale(globalStageNumber) * rawGearCompensation(globalStageNumber)
  )
}

/**
 * Facteur propre à chaque BOSS, par-dessus la compensation d'équipement.
 *
 * Les boss ne peuvent pas partager le facteur des étages normaux : leur cible
 * diffère (70 % contre 88 %) et leurs multiplicateurs propres (PV ×3.25,
 * AOE_3) ne tombent pas au même endroit selon le chapitre. Mesuré : avec le
 * seul facteur des étages normaux, les neuf boss s'étalent de 0 % à 100 % de
 * victoire ; avec celui-ci, de 68 % à 72 %.
 */
const BOSS_GEAR_COMPENSATION: readonly number[] = [
  0.91, 1.14, 0.91, 1.01, 1.07, 1.03, 0.9, 1.21, 1.23,
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
        nextLook(fams[(stage + slot) % fams.length]),
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
  const rb = RARITY_BASE[RARITY_BY_CHAPTER[chapter - 1]]
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
    const look = looks[slot]
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
  const rb = RARITY_BASE[RARITY_BY_CHAPTER[chapter - 1]]
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
      appearance: looks[0].appearance,
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

export async function seedCampaign(
  tx: Parameters<Parameters<PrismaClient['$transaction']>[0]>[0],
) {
  let order = 0
  for (let chapter = 1; chapter <= CHAPTER_COUNT; chapter++) {
    for (let i = 1; i <= STAGES_PER_CHAPTER; i++) {
      order += 1
      const isBoss = i === STAGES_PER_CHAPTER
      const data = {
        chapter,
        index: i,
        label: isBoss ? `${chapter}-${i} Boss` : `${chapter}-${i}`,
        isBoss,
        enemyTeam: isBoss
          ? bossEnemyTeam(chapter, i)
          : normalEnemyTeam(chapter, i),
        lootTable: isBoss ? bossLoot(chapter) : lootTableNormal(chapter, i),
        order,
      }
      await tx.campaignStage.upsert({
        where: { chapter_index: { chapter, index: i } },
        create: data,
        update: {
          label: data.label,
          isBoss: data.isBoss,
          enemyTeam: data.enemyTeam,
          lootTable: data.lootTable,
          order: data.order,
        },
      })
    }
    console.log(
      `  Campaign chapter ${chapter} : ${STAGES_PER_CHAPTER} stages created`,
    )
  }
}
