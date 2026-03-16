import type { IocContainer } from '../../types/application/ioc'
import type { GachaDomainInterface } from '../../types/domain/gacha/gacha.domain.interface'
import type { PullResult } from '../../types/domain/gacha/gacha.types'

export class GachaDomain implements GachaDomainInterface {
  // biome-ignore lint/complexity/noUselessConstructor: placeholder — will be implemented in Task 5
  // biome-ignore lint/suspicious/noEmptyBlockStatements: placeholder constructor
  constructor(_: IocContainer) {}
  pull(_userId: string): Promise<PullResult> {
    throw new Error('Not implemented yet')
  }
}
