import type {
  CardElement,
  TowerFloor,
  UserTowerProgress,
} from '../../../../generated/client'
import type { IocContainer } from '../../../types/application/ioc'
import type { ITowerRepository } from '../../../types/infra/orm/repositories/tower.repository.interface'
import type { PostgresPrismaClient } from '../postgres-client'

export class TowerRepository implements ITowerRepository {
  readonly #prisma: PostgresPrismaClient

  constructor({ postgresOrm }: IocContainer) {
    this.#prisma = postgresOrm.prisma
  }

  listFloors(element: CardElement): Promise<TowerFloor[]> {
    return this.#prisma.towerFloor.findMany({
      where: { element },
      orderBy: { index: 'asc' },
    })
  }

  getProgress(userId: string): Promise<UserTowerProgress[]> {
    return this.#prisma.userTowerProgress.findMany({ where: { userId } })
  }
}
