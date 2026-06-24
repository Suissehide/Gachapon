import type { BattleLogEntry, SimulatorUnit } from '../../api/combat.api'

export type SceneUnit = SimulatorUnit & {
  maxHp: number
  currentHp: number
  alive: boolean
  side: 'A' | 'B'
}

export type SceneSpeed = 1 | 2 | 4

export interface BattleScenePlayhead {
  currentLogIndex: number
  /** "playing", "paused", "done" */
  status: 'playing' | 'paused' | 'done'
}

export type { BattleLogEntry, SimulatorUnit }
