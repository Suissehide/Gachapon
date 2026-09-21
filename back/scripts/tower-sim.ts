// Simulateur d'équilibrage des TOURS et de la CAMPAGNE face à l'équipement
// réel — pendant de `balance-sim.ts`, dont les profils d'équipement
// (`GEAR_PROFILES`) ne sont que trois pourcentages et ignorent le bloc
// crit / pénétration, la part de l'équipement qui ne dépend NI du niveau NI
// du palier. C'est cette part qui explique l'écart entre le modèle (0 % dès
// le chapitre 3) et ce que les joueurs franchissent réellement.
//
// Le harnais (profils de référence, équipe équipée, mesure) vit dans
// `prisma/seed/balance-calibration.ts` : le test d'équilibrage lit le MÊME
// code, pour qu'il ne puisse pas valider un joueur que ce script n'a jamais
// mesuré.
//
// Usage :
//   node -r @swc-node/register scripts/tower-sim.ts        # grille tour
//   SIM_MODE=fit       …                                   # re-fitte la courbe
//   SIM_MODE=aoe       …                                   # coût d'une unité AOE_3
//   SIM_MODE=campaign  …                                   # la campagne face au stuff
//
// Variables : SIM_RUNS (défaut 200), SIM_EQUIP, SIM_EQUIP_RARITY,
// SIM_GEAR_COUNTS, SIM_LEVELS, SIM_COUNTERPICK=none.

import {
  type ReferenceProfile,
  referenceTeam,
  towerFloorProfile,
  towerWinRate,
} from '../prisma/seed/balance-calibration'
import {
  bossEnemyTeam,
  normalEnemyTeam,
  type RARITY_BASE,
} from '../prisma/seed/campaign'
import {
  TOWER_FLOOR_COUNT,
  towerAoeUnitCount,
  towerEnemyPower,
} from '../prisma/seed/tower'
import type { CardRarity } from '../src/generated/client'
import {
  type SimulatorUnit,
  simulateBattle,
} from '../src/main/domain/combat/battle-simulator.domain'
import {
  ELEMENTS,
  type Element,
  elementRelation,
} from '../src/main/domain/combat/element'
import { buildEnemySimUnits } from '../src/main/domain/combat/sim-units'

const RUNS = Number(process.env.SIM_RUNS ?? 200)
const BASE_STATS = { critRate: 5, critDmg: 150, armorPen: 0, lifesteal: 0 }
const DEF_MITIGATION_REF = 100
const ADV = 1.3
const DISADV = 1 / 1.3

/** Un profil ad hoc pour explorer — `target` n'a de sens que pour le fit. */
function profile(
  level: number,
  equipRarity: CardRarity,
  equipLevel: number,
  gearCount = 7,
): ReferenceProfile {
  return { level, equipRarity, equipLevel, gearCount, target: 0 }
}

function pct(x: number): string {
  return `${Math.round(x * 100)}`.padStart(4)
}

// --- Grille : des profils de joueur face aux 10 étages tels qu'ils sont ----
function grid(): void {
  const levels = (process.env.SIM_LEVELS ?? '20,30,50,70')
    .split(',')
    .map(Number)
  const equips = (process.env.SIM_EQUIP ?? '0,6,12').split(',').map(Number)
  const rarity = (process.env.SIM_EQUIP_RARITY ?? 'EPIC') as CardRarity
  console.log(
    `# Tour — 3 épiques, 7 pièces ${rarity}, contre-pick, ${RUNS} runs par case`,
  )
  for (const level of levels) {
    for (const equipLevel of equips) {
      const p = profile(level, rarity, equipLevel)
      const cells: string[] = []
      for (let floor = 1; floor <= TOWER_FLOOR_COUNT; floor++) {
        cells.push(
          pct(
            towerWinRate({
              floor,
              scale: towerEnemyPower(floor).mitigationScale,
              aoeUnits: towerAoeUnitCount(floor),
              profile: p,
              runs: RUNS,
            }),
          ),
        )
      }
      const label = equipLevel === 0 ? 'nu' : `stuff n${equipLevel}`
      console.log(
        `lvl ${String(level).padStart(2)} · ${label.padEnd(10)}|${cells.join('')}`,
      )
    }
  }
  console.log(
    `${' '.repeat(18)}|${Array.from({ length: TOWER_FLOOR_COUNT }, (_, i) => `${i + 1}`.padStart(4)).join('')}`,
  )
}

// --- Fit : l'échelle qui donne la cible du profil de référence -------------
function fit(): void {
  console.log('# Fit — échelle donnant la cible de chaque étage')
  console.log('étage\tprofil\t\t\tcible\téchelle\tobtenu')
  const fitted: number[] = []
  for (let floor = 1; floor <= TOWER_FLOOR_COUNT; floor++) {
    const p = towerFloorProfile(floor)
    const aoeUnits = towerAoeUnitCount(floor)
    // Dichotomie : le taux de victoire décroît avec l'échelle.
    let lo = 0.5
    let hi = 200
    for (let i = 0; i < 18; i++) {
      const mid = (lo + hi) / 2
      const win = towerWinRate({
        floor,
        scale: mid,
        aoeUnits,
        profile: p,
        runs: RUNS,
      })
      if (win >= p.target) {
        lo = mid
      } else {
        hi = mid
      }
    }
    const scale = Math.round(lo * 10) / 10
    fitted.push(scale)
    const got = towerWinRate({ floor, scale, aoeUnits, profile: p, runs: RUNS })
    console.log(
      `${floor}\tlvl ${p.level} ${p.equipRarity.slice(0, 4)} n${p.equipLevel} ${p.gearCount}p\t${Math.round(p.target * 100)}%\t${scale}\t${Math.round(got * 100)}%`,
    )
  }
  console.log(`\nFLOOR_SCALE = [${fitted.join(', ')}]`)
}

// --- AOE : ce que coûte vraiment une unité qui frappe toute l'équipe -------
function aoe(): void {
  const profils: [string, ReferenceProfile][] = [
    ['RARE n12', profile(70, 'RARE', 12)],
    ['EPIC n9 ', profile(70, 'EPIC', 9)],
    ['EPIC n12', profile(70, 'EPIC', 12)],
    ['LEGE n12', profile(70, 'LEGENDARY', 12)],
  ]
  console.log('# Étage 10 — taux de victoire selon le nombre d’unités AOE_3')
  for (const aoeUnits of [0, 1, 2, 3]) {
    for (const scale of [48, 54, 58, 64]) {
      const cells = profils.map(
        ([nom, p]) =>
          `${nom} ${pct(towerWinRate({ floor: 10, scale, aoeUnits, profile: p, runs: RUNS }))}%`,
      )
      console.log(
        `${aoeUnits} AOE · échelle ${String(scale).padStart(2)} | ${cells.join('  ')}`,
      )
    }
  }
}

// --- Campagne : les 9 chapitres face au même équipement réel ---------------
const CAMPAIGN_RARITY: readonly (keyof typeof RARITY_BASE)[] = [
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

function campaignEnemies(chapter: number, index: number): SimulatorUnit[] {
  const team =
    index === 10
      ? bossEnemyTeam(chapter, index)
      : normalEnemyTeam(chapter, index)
  return buildEnemySimUnits(team as never, {
    defMitigationRef: DEF_MITIGATION_REF,
    baseStats: BASE_STATS,
    resolveImage: () => null,
  })
}

/**
 * L'élément qui BAT le plus fréquent d'en face, via `elementRelation` — la
 * source de vérité de la roue. Une table recopiée à la main ici renvoyait
 * l'élément battu au lieu du contre, et faisait donc jouer le joueur en
 * DÉSAVANTAGE sur trois éléments sur quatre.
 */
function counterPick(enemies: SimulatorUnit[]): Element | null {
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

/** Taux de victoire d'un profil sur un étage de campagne donné. */
function campaignWinRate(
  chapter: number,
  index: number,
  p: ReferenceProfile,
  counterpick: boolean,
): number {
  let wins = 0
  for (let k = 0; k < RUNS; k++) {
    const enemies = campaignEnemies(chapter, index)
    const sim = simulateBattle({
      teamA: referenceTeam(p, {
        element: counterpick ? counterPick(enemies) : null,
        seed: 1000 + k,
      }),
      teamB: enemies,
      seed: `camp-${chapter}-${index}-${k}`,
      elementAdvantageMult: ADV,
      elementDisadvantageMult: DISADV,
    })
    if (sim.won === 'A') {
      wins++
    }
  }
  return wins / RUNS
}

/** Une ligne de la grille campagne : un profil face aux 9 chapitres. */
function campaignRow(p: ReferenceProfile, counterpick: boolean): string {
  const cells: string[] = []
  for (let chapter = 1; chapter <= 9; chapter++) {
    for (const index of [5, 10]) {
      const level = Math.min(10 * (chapter - 1) + index, 70)
      cells.push(
        pct(
          campaignWinRate(
            chapter,
            index,
            { ...p, level, cardRarity: CAMPAIGN_RARITY[chapter - 1] },
            counterpick,
          ),
        ),
      )
    }
  }
  return cells.join('')
}

function campaign(): void {
  const equipRarity = (process.env.SIM_EQUIP_RARITY ?? 'COMMON') as CardRarity
  const equips = (process.env.SIM_EQUIP ?? '0,6').split(',').map(Number)
  const gearCounts = (process.env.SIM_GEAR_COUNTS ?? '3,5,7')
    .split(',')
    .map(Number)
  const counterpick = process.env.SIM_COUNTERPICK !== 'none'
  console.log(
    `# Campagne — niveau = étage global (plafond 70), pièces ${equipRarity}, ${counterpick ? 'contre-pick' : 'neutre'}, ${RUNS} runs`,
  )
  // La rareté des CARTES suit le chapitre (CAMPAIGN_RARITY), comme
  // `balance-sim.ts` : sans ça on mesurerait un joueur épique au chapitre 1
  // et un joueur épique au chapitre 9, deux fictions opposées.
  for (const equipLevel of equips) {
    // « nu » ne dépend pas du nombre de pièces : une seule ligne.
    const counts = equipLevel === 0 ? [0] : gearCounts
    for (const gearCount of counts) {
      const label = equipLevel === 0 ? 'nu' : `${gearCount}p n${equipLevel}`
      const row = campaignRow(
        profile(0, equipRarity, equipLevel, gearCount),
        counterpick,
      )
      console.log(`${label.padEnd(9)}|${row}`)
    }
  }
  const head: string[] = []
  for (let c = 1; c <= 9; c++) {
    head.push(`${c}-5`.padStart(4), `${c}-10`.padStart(4))
  }
  console.log(`${' '.repeat(9)}|${head.join('')}`)
  console.log(`# raretés de carte par chapitre : ${CAMPAIGN_RARITY.join(' ')}`)
}

const MODES: Record<string, () => void> = { grid, fit, aoe, campaign }
const mode = process.env.SIM_MODE ?? 'grid'
const run = MODES[mode]
if (!run) {
  throw new Error(
    `SIM_MODE inconnu : ${mode} (attendu ${Object.keys(MODES).join(' | ')})`,
  )
}
run()
