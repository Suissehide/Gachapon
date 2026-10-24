import type { IocContainer } from '../../types/application/ioc'
import type { ConfigServiceInterface } from '../../types/infra/config/config.service.interface'
import {
  type SimulatorInput,
  type SimulatorResult,
  simulateBattle,
} from './battle-simulator.domain'

export class CombatDebugDomain {
  readonly #configService: ConfigServiceInterface

  constructor({ configService }: IocContainer) {
    this.#configService = configService
  }

  /**
   * Pure orchestration — runs the simulator with the provided teams and the
   * live defense threshold, so a debug fight matches a real one.
   * No persistence, no auth check (route layer enforces SUPER_ADMIN).
   */
  async run(input: SimulatorInput): Promise<SimulatorResult> {
    const defenseK = await this.#configService.get('combat.defMitigationRef')
    return simulateBattle({ ...input, defenseK })
  }
}
