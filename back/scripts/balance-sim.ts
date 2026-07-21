import { bossEnemyTeam, normalEnemyTeam } from '../prisma/seed/campaign'
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

function winRate(
  chapter: number,
  index: number,
  team: SimulatorUnit[],
  runs: number,
): { winRate: number; avgActions: number } {
  const enemies = enemyUnitsForStage(chapter, index)
  let wins = 0
  let totalActions = 0
  for (let k = 0; k < runs; k++) {
    const sim = simulateBattle({
      teamA: team.map((u) => ({ ...u })),
      teamB: enemies.map((u) => ({ ...u })),
      seed: `sim-${chapter}-${index}-${k}`,
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

function palierForChapter(chapter: number): number {
  return chapter // hypothèse simple : 1 palier par chapitre (ajustable)
}

function main(): void {
  const levels = [5, 10, 20, 30, 40, 50, 60]
  // En-tête
  const header = ['stage', 'boss', ...levels.map((l) => `L${l}`)].join('\t')
  // eslint-disable-next-line no-console
  console.log(header)
  for (let chapter = 1; chapter <= 5; chapter++) {
    for (let index = 1; index <= 10; index++) {
      const palier = palierForChapter(chapter)
      const cells = levels.map((level) => {
        const team = playerTeam({ level, palier, base: COMMON_BASE })
        const { winRate: wr } = winRate(chapter, index, team, RUNS)
        return `${Math.round(wr * 100)}%`
      })
      const row = [
        `${chapter}-${index}`,
        index === 10 ? 'B' : '',
        ...cells,
      ].join('\t')
      // eslint-disable-next-line no-console
      console.log(row)
    }
  }
}

main()
