import * as fs from 'node:fs'
import * as path from 'node:path'

import { bossEnemyTeam, normalEnemyTeam } from '../prisma/seed/campaign'
import { computeTeamPower } from '../src/main/domain/campaign/campaign-power'
import {
  type AttackPattern,
  type SimulatorUnit,
  simulateBattle,
} from '../src/main/domain/combat/battle-simulator.domain'
import { computeFinalStats } from '../src/main/domain/combat/combat-stats.domain'

// Représentation d'un bloc de stats de base « carte joueur type ».
// Baseline COMMON niv.1 ≈ { hp 100, atk 10, def 5, spd 90 } (cf. ENEMY_BASE dans le seed).
type BaseBlock = {
  baseHp: number
  baseAtk: number
  baseDef: number
  baseSpd: number
}

// Re-implementation of the frontend computePower formula (front/src/utils/cardStats.ts).
// computePower({hp,atk,def,spd}) = round((hp/2 + atk*1.5 + def) * (spd/100))
// No threat multiplier — plain player unit power.
function computePower(stats: {
  hp: number
  atk: number
  def: number
  spd: number
}): number {
  return Math.round(
    (stats.hp / 2 + stats.atk * 1.5 + stats.def) * (stats.spd / 100),
  )
}

// levelMultiplier mirrors combat-stats.domain.ts STAT_GROWTH_PER_LEVEL = 0.06
function levelMultiplier(level: number): number {
  return 1 + 0.06 * (level - 1)
}

// Power of a single COMMON palier-1 NORMAL player unit at level L.
function unitPowerAtLevel(level: number): number {
  const stats = computeFinalStats({
    baseHp: COMMON_BASE.baseHp,
    baseAtk: COMMON_BASE.baseAtk,
    baseDef: COMMON_BASE.baseDef,
    baseSpd: COMMON_BASE.baseSpd,
    level,
    palier: 1,
    variant: 'NORMAL',
    equipment: [],
  })
  return computePower(stats)
}

// Binary-search integer L in [1, 400] minimising |3 * unitPower(L) - recPower|.
// unitPower(L) is monotonically increasing with L.
function anchorLevel(recPower: number): number {
  let lo = 1
  let hi = 400
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2)
    const power3 = 3 * unitPowerAtLevel(mid)
    if (power3 < recPower) {
      lo = mid + 1
    } else {
      hi = mid
    }
  }
  // lo is the first L where 3*unitPower(L) >= recPower.
  // Compare with L-1 to pick the closer one.
  if (lo > 1) {
    const below = Math.abs(3 * unitPowerAtLevel(lo - 1) - recPower)
    const at = Math.abs(3 * unitPowerAtLevel(lo) - recPower)
    if (below <= at) {
      return lo - 1
    }
  }
  return lo
}

// Build anchored player team: level chosen so 3-card team power ≈ enemy recommended power.
function anchoredPlayerTeam(
  chapter: number,
  index: number,
): { team: SimulatorUnit[]; level: number; recPower: number } {
  const isBoss = index === 10
  const enemySpecs = isBoss
    ? bossEnemyTeam(chapter, index)
    : normalEnemyTeam(chapter, index)
  const recPower = computeTeamPower(enemySpecs)
  const level = anchorLevel(recPower)
  const team = playerTeam({ level, palier: 1, base: COMMON_BASE })
  return { team, level, recPower }
}

function enemyUnitsForStage(chapter: number, index: number): SimulatorUnit[] {
  const isBoss = index === 10
  const team = isBoss
    ? bossEnemyTeam(chapter, index)
    : normalEnemyTeam(chapter, index)
  return team.map((e, idx) => {
    const stats = computeFinalStats({
      baseHp: e.baseHp,
      baseAtk: e.baseAtk,
      baseDef: e.baseDef,
      baseSpd: e.baseSpd,
      level: e.level,
      palier: e.palier,
      variant: 'NORMAL',
      equipment: [],
    })
    return {
      id: `B${idx}`,
      hp: stats.hp,
      atk: stats.atk,
      def: stats.def,
      spd: stats.spd,
      attackPattern: (e.attackPattern ?? 'BASIC') as AttackPattern,
      passiveKey: (e as { passiveKey?: string | null }).passiveKey ?? null,
      palier: e.palier,
    }
  })
}

// Build enemy units with speed scaled to match anchor level L.
// hp/atk/def unchanged; spd = round(baseSpd * levelMultiplier(L)).
function enemyUnitsLevelMatch(
  chapter: number,
  index: number,
  anchorL: number,
): SimulatorUnit[] {
  const current = enemyUnitsForStage(chapter, index)
  const isBoss = index === 10
  // baseSpd: 85 for normal stages, 100 for boss
  const baseSpd = isBoss ? 100 : 85
  const scaledSpd = Math.round(baseSpd * levelMultiplier(anchorL))
  return current.map((u) => ({ ...u, spd: scaledSpd }))
}

function playerTeam(opts: {
  level: number
  palier: number
  base: BaseBlock
  passiveKey?: string | null
  size?: number
}): SimulatorUnit[] {
  const size = opts.size ?? 3
  return Array.from({ length: size }, (_, idx) => {
    const stats = computeFinalStats({
      baseHp: opts.base.baseHp,
      baseAtk: opts.base.baseAtk,
      baseDef: opts.base.baseDef,
      baseSpd: opts.base.baseSpd,
      level: opts.level,
      palier: opts.palier,
      variant: 'NORMAL',
      equipment: [],
    })
    return {
      id: `A${idx}`,
      hp: stats.hp,
      atk: stats.atk,
      def: stats.def,
      spd: stats.spd,
      attackPattern: 'BASIC' as AttackPattern,
      passiveKey: opts.passiveKey ?? null,
      palier: opts.palier,
    }
  })
}

function runScenario(
  chapter: number,
  index: number,
  playerUnits: SimulatorUnit[],
  enemies: SimulatorUnit[],
  scenario: string,
  runs: number,
): { winRate: number; avgActions: number } {
  let wins = 0
  let totalActions = 0
  for (let k = 0; k < runs; k++) {
    const sim = simulateBattle({
      teamA: playerUnits.map((u) => ({ ...u })),
      teamB: enemies.map((u) => ({ ...u })),
      seed: `sim-${chapter}-${index}-${scenario}-${k}`,
    })
    if (sim.won === 'A') {
      wins++
    }
    totalActions += sim.turns
  }
  return { winRate: wins / runs, avgActions: totalActions / runs }
}

const COMMON_BASE: BaseBlock = {
  baseHp: 100,
  baseAtk: 10,
  baseDef: 5,
  baseSpd: 90,
}
const RUNS = 200

function main(): void {
  const header =
    'stage\tboss\trecPower\tanchorL\twin%(current)\twin%(levelmatch)\tavgActions(levelmatch)'
  // eslint-disable-next-line no-console
  console.log(header)

  const tableRows: string[] = []

  for (let chapter = 1; chapter <= 5; chapter++) {
    for (let index = 1; index <= 10; index++) {
      const isBoss = index === 10

      // Anchored player team
      const {
        team: anchorTeam,
        level: anchorL,
        recPower,
      } = anchoredPlayerTeam(chapter, index)

      // Enemy units for each scenario
      const enemiesCurrent = enemyUnitsForStage(chapter, index)
      const enemiesLevelMatch = enemyUnitsLevelMatch(chapter, index, anchorL)

      // Run scenarios
      const currentResult = runScenario(
        chapter,
        index,
        anchorTeam,
        enemiesCurrent,
        'current',
        RUNS,
      )
      const levelMatchResult = runScenario(
        chapter,
        index,
        anchorTeam,
        enemiesLevelMatch,
        'levelmatch',
        RUNS,
      )

      const row = [
        `${chapter}-${index}`,
        isBoss ? 'B' : '',
        recPower,
        anchorL,
        `${Math.round(currentResult.winRate * 100)}%`,
        `${Math.round(levelMatchResult.winRate * 100)}%`,
        Math.round(levelMatchResult.avgActions),
      ].join('\t')

      // eslint-disable-next-line no-console
      console.log(row)
      tableRows.push(row)
    }
  }

  // Write report to .superpowers/sdd/D-sim-anchored-report.md
  // __dirname = back/scripts/ → back/ → repo-root/ → .superpowers/sdd/
  const reportDir = path.join(__dirname, '..', '..', '.superpowers', 'sdd')
  fs.mkdirSync(reportDir, { recursive: true })

  const mdHeader =
    '| stage | boss | recPower | anchorL | win%(current) | win%(levelmatch) | avgActions(levelmatch) |'
  const mdSep = '|---|---|---|---|---|---|---|'
  const mdRows = tableRows.map((row) => {
    const cols = row.split('\t')
    return `| ${cols.join(' | ')} |`
  })

  const parsePct = (row: string, col: number) =>
    Number.parseInt(row.split('\t')[col].replace('%', ''), 10)
  const currWins = tableRows.map((r) => parsePct(r, 4))
  const lmWins = tableRows.map((r) => parsePct(r, 5))
  const avgCurr = Math.round(
    currWins.reduce((a, b) => a + b, 0) / currWins.length,
  )
  const avgLm = Math.round(lmWins.reduce((a, b) => a + b, 0) / lmWins.length)
  const inBand = lmWins.filter((w) => w >= 30 && w <= 70).length
  const verdict =
    `Levelmatch avg win-rate: ${avgLm}% vs current: ${avgCurr}%. ` +
    `${inBand}/50 stages in the 30–70% competitive band under levelmatch — ` +
    (inBand >= 30
      ? 'enemy speed scaling brings most fights into a sane competitive range.'
      : 'many stages remain outside the 30–70% band; speed scaling alone may not balance the difficulty curve.')

  const reportContent = `# D-sim-anchored-report

Generated: CATB-D balance simulation — anchored player model + enemy speed scenarios
Branch: feat/combat-atb-power

${mdHeader}
${mdSep}
${mdRows.join('\n')}

**Verdict:** ${verdict}
`

  fs.writeFileSync(
    path.join(reportDir, 'D-sim-anchored-report.md'),
    reportContent,
  )
}

main()
