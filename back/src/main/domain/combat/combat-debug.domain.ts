import {
  simulateBattle,
  type SimulatorInput,
  type SimulatorResult,
} from './battle-simulator.domain'

export class CombatDebugDomain {
  /**
   * Pure orchestration — runs the simulator with the provided teams.
   * No persistence, no auth check (route layer enforces SUPER_ADMIN).
   */
  run(input: SimulatorInput): SimulatorResult {
    return simulateBattle(input)
  }
}
