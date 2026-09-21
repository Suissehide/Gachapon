// Harnais d'équilibrage de la CAMPAGNE et des TOURS : le profil de joueur que
// chaque étage vise, et de quoi MESURER s'il tient sa promesse.
//
// Module pur, partagé par `scripts/tower-sim.ts` (l'outil qu'on relance en
// changeant une courbe) et les tests d'équilibrage (`tower-seed.test.ts`,
// `campaign-balance.test.ts`). Tous doivent lire la MÊME définition de
// « joueur de référence », sinon un test valide un joueur que le simulateur
// n'a jamais mesuré.
//
// UN SEUL barème d'équipement (GEAR_LADDER) sert aux deux courbes : l'étage N
// de la tour et le chapitre N de la campagne s'adressent au même joueur. Les
// deux progressions s'alimentent — la campagne donne 3 emplacements
// (arme/armure/anneau), la tour les 4 autres — et les calibrer sur deux
// barèmes différents reviendrait à nier cette boucle.
//
// Pourquoi un harnais plutôt que les profils de `scripts/balance-sim.ts` :
// `GEAR_PROFILES` y modélise l'équipement par trois pourcentages
// (hpPct/atkPct/defPct) et ignore le bloc crit / pénétration, lequel ne
// dépend NI du niveau, NI du palier, NI de la variante. Or c'est justement
// ce bloc qui pèse le plus lourd sur une carte de bas niveau : un set épique
// n12 y ajoute +78 points de taux critique, +161 de dégâts critiques et
// +72 % de pénétration, identiques au niveau 1 et au niveau 70. Ici,
// l'équipement vient du VRAI catalogue et passe par les VRAIES règles de
// sous-stats.

import { type CardRarity, EquipmentSlot } from '../../src/generated/client'
import {
  type SimulatorUnit,
  simulateBattle,
} from '../../src/main/domain/combat/battle-simulator.domain'
import { mitigationRefFor } from '../../src/main/domain/combat/combat-stats.domain'
import {
  ELEMENTS,
  type Element,
  elementRelation,
} from '../../src/main/domain/combat/element'
import { computeEquippedCardStats } from '../../src/main/domain/combat/equipped-card-stats'
import { buildEnemySimUnits } from '../../src/main/domain/combat/sim-units'
import {
  EQUIP_SUBSTAT_MILESTONE,
  INITIAL_SUBSTATS_BY_RARITY,
  rollInitialSubstats,
  rollMilestone,
  type Substat,
  type SubstatRanges,
} from '../../src/main/domain/equipment/equipment-progression'
import { setBonusesFromConfig } from '../../src/main/domain/equipment/set-bonuses'
import { bossEnemyTeam, normalEnemyTeam, RARITY_BASE } from './campaign'
import { buildEquipmentCatalog } from './equipment'
import {
  TOWER_FLOOR_COUNT,
  towerAoeUnitCount,
  towerEnemyPower,
  towerEnemyStatsAtScale,
} from './tower'

// --- Valeurs de GlobalConfig -----------------------------------------------
// Recopiées des DEFAULTS de `config.service.ts` : un module pur ne lit pas la
// config, et la calibration doit se faire contre les valeurs par défaut, pas
// contre le réglage d'une base particulière.
const BASE_STATS = { critRate: 5, critDmg: 150, armorPen: 0, lifesteal: 0 }
const DEF_MITIGATION_REF = 100
const ELEMENT_ADVANTAGE_MULT = 1.3
const ELEMENT_DISADVANTAGE_MULT = 1 / 1.3

const SET_DEFS = setBonusesFromConfig({
  'set.fureurCritDmgPct': 55,
  'set.affutCritRatePct': 25,
  'set.perceeArmorPenPct': 25,
  'set.sangsueLifestealPct': 16,
  'set.assautAtkPct': 16,
  'set.colosseHpPct': 10,
  'set.celeriteSpdPct': 10,
})

const SUBSTAT_RANGES: SubstatRanges = {
  hpFlat: { min: 20, max: 60 },
  atkFlat: { min: 5, max: 15 },
  defFlat: { min: 5, max: 15 },
  spdFlat: { min: 1, max: 3 },
  hpPct: { min: 3, max: 8 },
  atkPct: { min: 3, max: 8 },
  defPct: { min: 3, max: 8 },
  critRatePct: { min: 2, max: 5 },
  critDmgPct: { min: 4, max: 10 },
  armorPenPct: { min: 2, max: 6 },
  lifestealPct: { min: 1, max: 4 },
}

/** PRNG déterministe — le harnais ne doit jamais dépendre de Math.random. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// --- Build de référence ----------------------------------------------------

const CATALOG = buildEquipmentCatalog()

/**
 * Le build de référence : Fureur (4 pièces) + Affût (3), le couple critique
 * qui tient pile dans les 7 emplacements (cf. set-bonuses.ts).
 *
 * L'ORDRE compte : `gearCount` en prend un PRÉFIXE, et ce préfixe doit suivre
 * l'ordre d'acquisition réel — les 3 emplacements que droppe la campagne
 * (arme, armure, anneau : `CAMPAIGN_EQUIPMENT_SLOTS`) d'abord, puis les 4 que
 * droppent les tours (gants, bottes, amulette, ceinture). Un joueur qui n'a
 * pas encore grimpé porte donc exactement les trois premières, et l'étage 1
 * est mesuré contre ce joueur-là.
 */
const REFERENCE_BUILD: {
  slot: EquipmentSlot
  setKey: string
  mainStat: string
}[] = [
  { slot: EquipmentSlot.WEAPON, setKey: 'FUREUR', mainStat: 'atkPct' },
  { slot: EquipmentSlot.ARMOR, setKey: 'FUREUR', mainStat: 'hpPct' },
  { slot: EquipmentSlot.RING, setKey: 'FUREUR', mainStat: 'atkPct' },
  { slot: EquipmentSlot.GLOVES, setKey: 'FUREUR', mainStat: 'critDmgPct' },
  { slot: EquipmentSlot.BOOTS, setKey: 'AFFUT', mainStat: 'critRatePct' },
  { slot: EquipmentSlot.AMULET, setKey: 'AFFUT', mainStat: 'hpPct' },
  { slot: EquipmentSlot.BELT, setKey: 'AFFUT', mainStat: 'armorPenPct' },
]

function catalogPiece(
  slot: EquipmentSlot,
  setKey: string,
  rarity: CardRarity,
  mainStat: string,
) {
  const row = CATALOG.find(
    (r) =>
      r.slot === slot &&
      r.setKey === setKey &&
      r.rarity === rarity &&
      r.mainStat === mainStat,
  )
  if (!row) {
    throw new Error(
      `Pièce introuvable au catalogue : ${slot}/${setKey}/${rarity}/${mainStat}`,
    )
  }
  return row
}

/**
 * Sous-stats d'une pièce au niveau donné : tirage initial selon la rareté,
 * puis un palier tous les 3 niveaux — les vraies règles de
 * `equipment-progression.ts`, pas une approximation.
 */
function substatsFor(
  rarity: CardRarity,
  level: number,
  rng: () => number,
): Substat[] {
  let substats = rollInitialSubstats(
    INITIAL_SUBSTATS_BY_RARITY[
      rarity as keyof typeof INITIAL_SUBSTATS_BY_RARITY
    ],
    SUBSTAT_RANGES,
    rng,
  )
  for (
    let l = EQUIP_SUBSTAT_MILESTONE;
    l <= level;
    l += EQUIP_SUBSTAT_MILESTONE
  ) {
    substats = rollMilestone(substats, SUBSTAT_RANGES, rng).substats
  }
  return substats
}

/** Le joueur de référence d'un étage : ses cartes et son équipement. */
export interface ReferenceProfile {
  /** Niveau des trois cartes, palier déduit : 10 niveaux par palier. */
  level: number
  /**
   * Rareté des cartes. Défaut EPIC — le roster d'un joueur qui grimpe une
   * tour. La campagne la fait varier par chapitre (RARITY_BY_CHAPTER), comme
   * `balance-sim.ts`, pour rester comparable à lui.
   */
  cardRarity?: keyof typeof RARITY_BASE
  equipRarity: CardRarity
  /**
   * Rareté des TROIS premiers emplacements (arme, armure, anneau), ceux que
   * droppe la campagne. Absent = `equipRarity` comme les autres.
   *
   * Ils méritent leur propre rareté parce que la campagne est, elle aussi,
   * une source d'équipement — et une source généreuse : elle garantit une
   * pièce à chaque premier passage, avec un plancher qui monte
   * (`firstClearFloorAt`), et ses boss garantissent RARE dès le chapitre 1,
   * EPIC dès le 4 et LEGENDARY au 9-10 (`bossFloor`). Les modéliser à la
   * rareté des emplacements de tour sous-estime lourdement le joueur.
   */
  campaignSlotRarity?: CardRarity
  /** 0 = aucune pièce portée (et non « des pièces au niveau 0 »). */
  equipLevel: number
  /** Nombre de pièces portées, préfixe de REFERENCE_BUILD. */
  gearCount: number
  /** Taux de victoire visé pour ce profil. */
  target: number
}

/** Le budget d'équipement d'un palier de progression. */
export interface GearTier {
  equipRarity: CardRarity
  equipLevel: number
  gearCount: number
}

/**
 * Barème d'équipement par palier de progression (1..10) — la référence
 * COMMUNE au chapitre N de la campagne et à l'étage N de la tour.
 *
 * Il est STRICTEMENT croissant : chaque palier ajoute soit une pièce, soit
 * un niveau, soit une rareté, jamais ne recule. Un barème non monotone
 * produirait une courbe non monotone en compensation, donc un chapitre plus
 * facile que le précédent.
 *
 * Le nombre de pièces suit l'acquisition réelle : on démarre avec les 3
 * emplacements que droppe la campagne (arme, armure, anneau —
 * `CAMPAIGN_EQUIPMENT_SLOTS`) et chaque étage de tour franchi en ouvre un
 * autre, jusqu'aux 7. Les raretés suivent les tables de drop des tours
 * (`RARITY_WEIGHTS` dans `seed/tower.ts`) : du commun en bas, de l'épique
 * seulement au sommet.
 *
 * Le palier 10 n'existe que pour la tour — la campagne s'arrête au 9.
 */
export const GEAR_LADDER: readonly GearTier[] = [
  { equipRarity: 'COMMON', equipLevel: 3, gearCount: 3 },
  { equipRarity: 'COMMON', equipLevel: 6, gearCount: 4 },
  { equipRarity: 'COMMON', equipLevel: 9, gearCount: 5 },
  { equipRarity: 'UNCOMMON', equipLevel: 6, gearCount: 6 },
  { equipRarity: 'UNCOMMON', equipLevel: 9, gearCount: 7 },
  { equipRarity: 'UNCOMMON', equipLevel: 12, gearCount: 7 },
  { equipRarity: 'RARE', equipLevel: 6, gearCount: 7 },
  { equipRarity: 'RARE', equipLevel: 9, gearCount: 7 },
  { equipRarity: 'RARE', equipLevel: 12, gearCount: 7 },
  // Palier 10 — tour uniquement (la campagne s'arrête au 9). Légendaire :
  // c'est ce que la table de drop de l'étage 10 propose (5 % légendaire,
  // 35 % épique), et il FAUT que ce joueur soit nettement au-dessus de celui
  // de l'étage 9, sinon l'unité AOE_3 du sommet — qui vaut ~1,45× en échelle
  // équivalente — force l'étage 10 à des stats INFÉRIEURES au 9 pour tenir sa
  // cible, et la courbe cesse d'être croissante.
  { equipRarity: 'LEGENDARY', equipLevel: 12, gearCount: 7 },
]

export function gearTier(tier: number): GearTier {
  const gear = GEAR_LADDER[tier - 1]
  if (!gear) {
    throw new Error(
      `Palier d'équipement hors bornes : ${tier} (attendu 1..${GEAR_LADDER.length})`,
    )
  }
  return gear
}

export function referenceTeam(
  profile: ReferenceProfile,
  opts: { element: string | null; seed: number },
): SimulatorUnit[] {
  const base = RARITY_BASE[profile.cardRarity ?? 'EPIC']
  const palier = Math.min(7, Math.ceil(profile.level / 10))
  const rng = mulberry32(opts.seed)
  const build = REFERENCE_BUILD.slice(
    0,
    profile.equipLevel === 0 ? 0 : profile.gearCount,
  )
  // Les 3 premières entrées de REFERENCE_BUILD sont les emplacements que
  // droppe la campagne (cf. son commentaire) : elles prennent
  // `campaignSlotRarity` quand il est fourni.
  const rarityOf = (index: number): CardRarity =>
    index < 3
      ? (profile.campaignSlotRarity ?? profile.equipRarity)
      : profile.equipRarity
  return [0, 1, 2].map((idx) => {
    const pieces = build.map((b, i) => {
      const rarity = rarityOf(i)
      const row = catalogPiece(b.slot, b.setKey, rarity, b.mainStat)
      return {
        bonuses: row.bonuses as Record<string, number>,
        level: profile.equipLevel,
        substats: substatsFor(rarity, profile.equipLevel, rng),
        baseBoost: 0,
        setKey: row.setKey as string,
      }
    })
    const stats = computeEquippedCardStats({
      baseHp: base.hp,
      baseAtk: base.atk,
      baseDef: base.def,
      baseSpd: base.spd,
      level: profile.level,
      palier,
      variant: 'NORMAL',
      pieces,
      setDefs: SET_DEFS,
      baseStats: BASE_STATS,
    })
    return {
      id: `A${idx}`,
      ...stats,
      attackPattern: 'BASIC' as const,
      passiveKey: null,
      element: opts.element,
      palier,
      mitigationRef: mitigationRefFor({
        level: profile.level,
        palier,
        variant: 'NORMAL',
        defMitigationRef: DEF_MITIGATION_REF,
      }),
    }
  })
}

/**
 * Les trois ennemis d'un étage à une échelle et un compte d'AOE donnés.
 * Les stats viennent de `towerEnemyStatsAtScale` (le seed), jamais d'une
 * copie de la formule.
 */
export function towerEnemiesAtScale(
  floor: number,
  scale: number,
  aoeUnits: number,
): SimulatorUnit[] {
  const stats = towerEnemyStatsAtScale(scale, floor)
  const specs = [0, 1, 2].map((slot) => ({
    ...stats,
    level: 1,
    palier: 1,
    attackPattern: slot < aoeUnits ? 'AOE_3' : 'BASIC',
    element: 'FIRE',
    appearance: null,
  }))
  return buildEnemySimUnits(specs as never, {
    defMitigationRef: DEF_MITIGATION_REF,
    baseStats: BASE_STATS,
    resolveImage: () => null,
  })
}

/**
 * Taux de victoire d'un profil sur un étage, à une échelle donnée.
 *
 * La graine de bataille ne dépend PAS de l'échelle : sinon le taux devient
 * une fonction bruitée de l'échelle et toute recherche par dichotomie
 * converge sur le bruit.
 */
export function towerWinRate(opts: {
  floor: number
  scale: number
  aoeUnits: number
  profile: ReferenceProfile
  runs: number
  /** Élément des cartes du joueur. Défaut : le contre de FIRE. */
  element?: string | null
}): number {
  const element = opts.element === undefined ? 'WATER' : opts.element
  let wins = 0
  for (let k = 0; k < opts.runs; k++) {
    const sim = simulateBattle({
      teamA: referenceTeam(opts.profile, { element, seed: 1000 + k }),
      teamB: towerEnemiesAtScale(opts.floor, opts.scale, opts.aoeUnits),
      seed: `tower-calib-${opts.floor}-${k}`,
      elementAdvantageMult: ELEMENT_ADVANTAGE_MULT,
      elementDisadvantageMult: ELEMENT_DISADVANTAGE_MULT,
    })
    if (sim.won === 'A') {
      wins++
    }
  }
  return wins / opts.runs
}

/**
 * Taux de victoire visé par étage de tour.
 *
 * Décroissant : le bas de la tour est une porte d'entrée, le sommet un
 * contrôle de build qu'on ne passe pas du premier coup. C'est la seule partie
 * PROPRE à la tour — le niveau et l'équipement du joueur de référence, eux,
 * sortent du barème commun (GEAR_LADDER).
 */
const TOWER_FLOOR_TARGETS: Record<number, number> = {
  1: 0.85,
  2: 0.75,
  3: 0.7,
  4: 0.65,
  5: 0.6,
  6: 0.6,
  7: 0.6,
  8: 0.55,
  9: 0.5,
  10: 0.45,
}

/**
 * Le joueur que l'étage N de la tour doit accueillir : niveau 10×N jusqu'au
 * plafond de 70, équipement du palier N.
 *
 * Au-delà du 7e étage le joueur est plafonné en niveau : la tour ne demande
 * plus que de l'ÉQUIPEMENT — exactement la phase 2 de la courbe de campagne
 * (`seed/campaign.ts`), où le joueur au plafond ne progresse plus que par son
 * stuff.
 */
export function towerFloorProfile(floor: number): ReferenceProfile {
  const target = TOWER_FLOOR_TARGETS[floor]
  if (target === undefined) {
    throw new Error(
      `Aucune cible pour l'étage de tour ${floor} (attendu 1..${TOWER_FLOOR_COUNT})`,
    )
  }
  return {
    level: Math.min(10 * floor, 70),
    cardRarity: 'EPIC',
    ...gearTier(floor),
    // Le grimpeur de l'étage N est le joueur du chapitre N : ses trois
    // emplacements de campagne portent ce que les boss de campagne lui ont
    // garanti, pas la rareté que droppe la tour.
    campaignSlotRarity: campaignSlotRarityAt(floor),
    target,
  }
}

/**
 * Taux de victoire du profil de référence d'un étage contre l'étage TEL QU'IL
 * EST SEEDÉ. C'est la mesure que le test d'équilibrage surveille.
 */
export function towerReferenceWinRate(floor: number, runs = 80): number {
  return towerWinRate({
    floor,
    // L'échelle réellement seedée pour cet étage : `mitigationScale` EST
    // l'échelle (cf. towerEnemyStatsAtScale), on ne la recopie donc pas.
    scale: towerEnemyPower(floor).mitigationScale,
    aoeUnits: towerAoeUnitCount(floor),
    profile: towerFloorProfile(floor),
    runs,
  })
}

// --- Campagne --------------------------------------------------------------

/**
 * Cibles de la campagne. Ce sont celles que le design visait DÉJÀ (mesures du
 * 2026-08-07 : « calibrer sur counterpick, 92 % global, boss 70 % ») — elles
 * n'avaient simplement jamais été mesurées contre un joueur réellement
 * équipé, `GEAR_PROFILES` de `balance-sim.ts` ignorant le bloc crit /
 * pénétration.
 */
export const CAMPAIGN_TARGETS = { normal: 0.88, boss: 0.7 } as const

/** Rareté des cartes du joueur par chapitre — même table que balance-sim. */
const CAMPAIGN_CARD_RARITY: readonly (keyof typeof RARITY_BASE)[] = [
  'COMMON',
  'UNCOMMON',
  'RARE',
  'EPIC',
  'LEGENDARY',
  'LEGENDARY',
  'LEGENDARY',
  'LEGENDARY',
  'LEGENDARY',
]

/**
 * Le joueur que l'étage `chapter-index` doit accueillir : niveau = étage
 * global (plafond 70), rareté de carte du chapitre, équipement du palier
 * `chapter` — LE MÊME que l'étage `chapter` de la tour.
 */
/**
 * Le joueur que l'étage `chapter-index` doit accueillir : niveau = étage
 * global (plafond 70), rareté de carte du chapitre, équipement du palier
 * `chapter` — LE MÊME que l'étage `chapter` de la tour.
 */
/**
 * Rareté des 3 emplacements que droppe la CAMPAGNE, pour un joueur qui ENTRE
 * dans le chapitre N — donc ce que le boss du chapitre N-1 lui a garanti
 * (`bossFloor` dans `campaign.ts` : RARE jusqu'au chapitre 3, EPIC jusqu'au
 * 8, LEGENDARY au 9). C'est un plancher GARANTI au premier passage, pas une
 * chance de drop : le joueur les a forcément.
 *
 * Le chapitre 1 n'a pas de boss précédent : son joueur n'a que les pièces des
 * premiers passages, dont le plancher est COMMON en début de campagne
 * (`firstClearFloorAt`). Lui attribuer du RARE dès l'étage 1-5 — le boss 1-10
 * ne l'a pas encore lâché — gonflait la compensation requise de ×1,23 à
 * ×1,55 sur ce seul étage.
 *
 * Corollaire : LEGENDARY n'apparaît jamais PENDANT la campagne, il n'est
 * garanti qu'au boss 9-10 qui la termine.
 */
function campaignSlotRarityAt(chapter: number): CardRarity {
  if (chapter <= 1) {
    return 'COMMON'
  }
  return chapter <= 4 ? 'RARE' : 'EPIC'
}

/**
 * Le joueur que l'étage `chapter-index` doit accueillir : niveau = étage
 * global (plafond 70), rareté de carte du chapitre, et un équipement à DEUX
 * sources — les 3 emplacements de campagne à la rareté que ses boss
 * garantissent, les autres au palier `chapter` de la tour.
 */
export function campaignProfile(
  chapter: number,
  index: number,
): ReferenceProfile {
  const globalStage = (chapter - 1) * 10 + index
  return {
    level: Math.min(globalStage, 70),
    cardRarity: CAMPAIGN_CARD_RARITY[chapter - 1] ?? 'LEGENDARY',
    ...gearTier(chapter),
    campaignSlotRarity: campaignSlotRarityAt(chapter),
    target: index === 10 ? CAMPAIGN_TARGETS.boss : CAMPAIGN_TARGETS.normal,
  }
}

/**
 * Ennemis d'un étage de campagne, éventuellement mis à l'échelle par `mult`.
 * `mult` ne sert QU'AU FIT (chercher la compensation d'équipement) : à 1, ce
 * sont exactement les ennemis que le seed écrit.
 */
export function campaignEnemies(
  chapter: number,
  index: number,
  mult = 1,
): SimulatorUnit[] {
  const team =
    index === 10
      ? bossEnemyTeam(chapter, index)
      : normalEnemyTeam(chapter, index)
  const scaled = (team as unknown as Record<string, number>[]).map((e) => ({
    ...e,
    baseHp: Math.round(e.baseHp * mult),
    baseAtk: Math.round(e.baseAtk * mult),
    baseDef: Math.round(e.baseDef * mult),
    mitigationScale: (e.mitigationScale ?? 1) * mult,
  }))
  return buildEnemySimUnits(scaled as never, {
    defMitigationRef: DEF_MITIGATION_REF,
    baseStats: BASE_STATS,
    resolveImage: () => null,
  })
}

/**
 * L'élément qui BAT le plus fréquent d'en face, via `elementRelation` — la
 * source de vérité de la roue. Une table recopiée à la main renvoie vite
 * l'élément battu au lieu du contre, et fait alors jouer le joueur en
 * DÉSAVANTAGE sans que rien ne le signale.
 */
export function counterPickElement(enemies: SimulatorUnit[]): Element | null {
  const counts = new Map<Element, number>()
  for (const e of enemies) {
    if (e.element && (ELEMENTS as readonly string[]).includes(e.element)) {
      const el = e.element as Element
      counts.set(el, (counts.get(el) ?? 0) + 1)
    }
  }
  let dominant: Element | null = null
  let best = 0
  for (const el of ELEMENTS) {
    const n = counts.get(el) ?? 0
    if (n > best) {
      best = n
      dominant = el
    }
  }
  if (!dominant) {
    return null
  }
  const cible = dominant
  return (
    ELEMENTS.find((el) => elementRelation(el, cible) === 'ADVANTAGE') ?? null
  )
}

/**
 * Taux de victoire du profil de référence sur un étage de campagne. `mult`
 * à 1 mesure l'étage TEL QU'IL EST SEEDÉ — c'est ce que surveille
 * `campaign-balance.test.ts`.
 */
export function campaignWinRate(opts: {
  chapter: number
  index: number
  runs: number
  mult?: number
  profile?: ReferenceProfile
}): number {
  const profile = opts.profile ?? campaignProfile(opts.chapter, opts.index)
  let wins = 0
  for (let k = 0; k < opts.runs; k++) {
    const enemies = campaignEnemies(opts.chapter, opts.index, opts.mult ?? 1)
    const sim = simulateBattle({
      teamA: referenceTeam(profile, {
        element: counterPickElement(enemies),
        seed: 1000 + k,
      }),
      teamB: enemies,
      seed: `camp-calib-${opts.chapter}-${opts.index}-${k}`,
      elementAdvantageMult: ELEMENT_ADVANTAGE_MULT,
      elementDisadvantageMult: ELEMENT_DISADVANTAGE_MULT,
    })
    if (sim.won === 'A') {
      wins++
    }
  }
  return wins / opts.runs
}
