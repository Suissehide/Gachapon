import type { ScoringConfig } from '../../../../generated/client'
import type { IocContainer } from '../../../types/application/ioc'
import type { IScoringConfigRepository } from '../../../types/infra/orm/repositories/scoring-config.repository.interface'
import type { PostgresPrismaClient } from '../postgres-client'

export class ScoringConfigRepository implements IScoringConfigRepository {
  readonly #prisma: PostgresPrismaClient

  constructor({ postgresOrm }: IocContainer) {
    this.#prisma = postgresOrm.prisma
  }

  async get(): Promise<ScoringConfig> {
    return this.#prisma.scoringConfig.upsert({
      where: { id: 'singleton' },
      update: {},
      create: { id: 'singleton' },
    })
  }

  async upsert(data: Partial<Omit<ScoringConfig, 'id' | 'updatedAt'>>): Promise<ScoringConfig> {
    return this.#prisma.scoringConfig.upsert({
      where: { id: 'singleton' },
      update: data,
      create: { id: 'singleton', ...data },
    })
  }
}
