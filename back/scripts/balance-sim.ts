import * as fs from 'node:fs'
import * as path from 'node:path'

import { bossEnemyTeam, normalEnemyTeam } from '../prisma/seed/campaign'
import {
  type AttackPattern,
  type SimulatorUnit,
  simulateBattle,
} from '../src/main/domain/combat/battle-simulator.domain'
import { computeFinalStats } from '../src/main/domain/combat/combat-stats.domain'

type BaseBlock = {
  baseHp: number
  baseAtk: number
  baseDef: number
  baseSpd: number
}

// levelMultiplier mirrors combat-stats.domain.ts STAT_GROWTH_PER_LEVEL = 0.06
function levelMultiplier(level: number): number {
  return 1 + 0.06 * (level - 1)
}

// Real per-rarity base-stat archetypes (median of the seed roster, prisma/seed/cards.ts).
const RARITY_BASE: Record<string, BaseBlock> = {
  COMMON: { baseHp: 105, baseAtk: 10, baseDef: 5, baseSpd: 92 },
  UNCOMMON: { baseHp: 137, baseAtk: 15, baseDef: 7, baseSpd: 99 },
  RARE: { baseHp: 195, baseAtk: 21, baseDef: 10, baseSpd: 104 },
  EPIC: { baseHp: 331, baseAtk: 35, baseDef: 16, baseSpd: 92 },
  LEGENDARY: { baseHp: 591, baseAtk: 53, baseDef: 29, baseSpd: 107 },
}

// Realistic player progression: which rarity a player fields per chapter.
const RARITY_BY_CHAPTER: Record<number, string> = {
  1: 'COMMON',
  2: 'UNCOMMON',
  3: 'RARE',
  4: 'EPIC',
  5: 'LEGENDARY',
}

// Player level at a given stage: fills the palier's 10-level band.
// palier = chapter (optimistic but bounded), level = 10*(chapter-1) + index.
function playerLevelForStage(chapter: number, index: number): number {
  return 10 * (chapter - 1) + index
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

// Realistic 3-card team for the stage's chapter (rarity/level/palier progression).
function realisticPlayerTeam(chapter: number, index: number): SimulatorUnit[] {
  const rarity = RARITY_BY_CHAPTER[chapter]
  const level = playerLevelForStage(chapter, index)
  const palier = chapter
  return playerTeam({ level, palier, base: RARITY_BASE[rarity] })
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

// Enemy units with speed scaled to track the player's level at the stage
// (hp/atk/def unchanged). spd = round(enemyBaseSpd * levelMultiplier(playerLevel)).
function enemyUnitsSpeedScaled(
  chapter: number,
  index: number,
  playerLevel: number,
): SimulatorUnit[] {
  const current = enemyUnitsForStage(chapter, index)
  const isBoss = index === 10
  const baseSpd = isBoss ? 100 : 85
  const scaledSpd = Math.round(baseSpd * levelMultiplier(playerLevel))
  return current.map((u) => ({ ...u, spd: scaledSpd }))
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

const RUNS = 200

function main(): void {
  const header =
    'stage\tboss\trarity\tL\tP\twin%(current)\twin%(spdScaled)\tactions(cur)'
  // eslint-disable-next-line no-console
  console.log(header)
  const rows: string[] = []

  for (let chapter = 1; chapter <= 5; chapter++) {
    for (let index = 1; index <= 10; index++) {
      const isBoss = index === 10
      const level = playerLevelForStage(chapter, index)
      const team = realisticPlayerTeam(chapter, index)
      const enemiesCurrent = enemyUnitsForStage(chapter, index)
      const enemiesScaled = enemyUnitsSpeedScaled(chapter, index, level)

      const cur = runScenario(
        chapter,
        index,
        team,
        enemiesCurrent,
        'current',
        RUNS,
      )
      const scaled = runScenario(
        chapter,
        index,
        team,
        enemiesScaled,
        'spdscaled',
        RUNS,
      )

      const row = [
        `${chapter}-${index}`,
        isBoss ? 'B' : '',
        RARITY_BY_CHAPTER[chapter],
        level,
        chapter,
        `${Math.round(cur.winRate * 100)}%`,
        `${Math.round(scaled.winRate * 100)}%`,
        Math.round(cur.avgActions),
      ].join('\t')
      // eslint-disable-next-line no-console
      console.log(row)
      rows.push(row)
    }
  }

  const reportDir = path.join(__dirname, '..', '..', '.superpowers', 'sdd')
  fs.mkdirSync(reportDir, { recursive: true })
  const mdHeader =
    '| stage | boss | rarity | L | P | win%(current) | win%(spdScaled) | actions(cur) |'
  const mdSep = '|---|---|---|---|---|---|---|---|'
  const mdRows = rows.map((r) => `| ${r.split('\t').join(' | ')} |`)
  const parsePct = (row: string, col: number) =>
    Number.parseInt(row.split('\t')[col].replace('%', ''), 10)
  const cur = rows.map((r) => parsePct(r, 5))
  const scaled = rows.map((r) => parsePct(r, 6))
  const avg = (a: number[]) =>
    Math.round(a.reduce((x, y) => x + y, 0) / a.length)
  const band = (a: number[]) => a.filter((w) => w >= 45 && w <= 90).length
  const verdict =
    `Realistic teams (rarity by chapter). Current avg win: ${avg(cur)}%, ` +
    `spdScaled avg win: ${avg(scaled)}%. In 45-90% band: current ${band(cur)}/50, ` +
    `spdScaled ${band(scaled)}/50.`
  fs.writeFileSync(
    path.join(reportDir, 'D-sim-realistic-report.md'),
    `# D-sim-realistic-report\n\nRealistic per-rarity player teams vs enemy speed scenarios.\n\n${mdHeader}\n${mdSep}\n${mdRows.join('\n')}\n\n**Verdict:** ${verdict}\n`,
  )
  // eslint-disable-next-line no-console
  console.log(`\n${verdict}`)
}

main()
