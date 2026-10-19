import type { IocContainer } from '../../types/application/ioc'
import type { IReturnBonusDomain } from '../../types/domain/return-bonus/return-bonus.domain.interface'
import type { ConfigServiceInterface } from '../../types/infra/config/config.service.interface'
import type {
  PostgresORMInterface,
  PrimaTransactionClient,
} from '../../types/infra/orm/client'
import {
  computeReturnChest,
  type ReturnChestAmounts,
} from './return-bonus-rules'

const CHEST_SELECT = {
  days: true,
  cappedDays: true,
  tokens: true,
  energy: true,
} as const

export class ReturnBonusDomain implements IReturnBonusDomain {
  readonly #postgresOrm: PostgresORMInterface
  readonly #configService: ConfigServiceInterface

  constructor({
    postgresOrm,
    configService,
  }: Pick<IocContainer, 'postgresOrm' | 'configService'>) {
    this.#postgresOrm = postgresOrm
    this.#configService = configService
  }

  async grantInTx(
    tx: PrimaTransactionClient,
    userId: string,
    dayGap: number,
  ): Promise<void> {
    const cfg = await this.#configService.getMany(
      'returnBonus.minDays',
      'returnBonus.maxDays',
      'returnBonus.tokensPerDay',
      'returnBonus.energyPerDay',
    )
    const chest = computeReturnChest(dayGap, {
      minDays: cfg['returnBonus.minDays'],
      maxDays: cfg['returnBonus.maxDays'],
      tokensPerDay: cfg['returnBonus.tokensPerDay'],
      energyPerDay: cfg['returnBonus.energyPerDay'],
    })
    if (!chest) {
      return
    }
    // Un coffre en attente reste tel quel : jamais recalculé ni cumulé.
    await tx.returnChest.upsert({
      where: { userId },
      create: { userId, ...chest },
      update: {},
    })
  }

  findPending(userId: string): Promise<ReturnChestAmounts | null> {
    return this.#postgresOrm.prisma.returnChest.findUnique({
      where: { userId },
      select: CHEST_SELECT,
    })
  }
}
