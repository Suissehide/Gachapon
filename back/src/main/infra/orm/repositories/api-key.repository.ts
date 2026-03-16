import { randomBytes } from 'node:crypto'
import type { IocContainer } from '../../../types/application/ioc.js'
import type { PostgresPrismaClient } from '../postgres-client.js'
import type { ApiKey } from '../../../generated/client.js'

export class ApiKeyRepository {
  readonly #prisma: PostgresPrismaClient

  constructor({ postgresOrm }: IocContainer) {
    this.#prisma = postgresOrm.prisma
  }

  #generate(): string {
    return `gp_${randomBytes(32).toString('hex')}`
  }

  create(userId: string, name: string): Promise<ApiKey> {
    return this.#prisma.apiKey.create({ data: { key: this.#generate(), name, userId } })
  }

  findByKey(key: string): Promise<ApiKey | null> {
    return this.#prisma.apiKey.findUnique({ where: { key } })
  }

  findByUser(userId: string): Promise<ApiKey[]> {
    return this.#prisma.apiKey.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } })
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.#prisma.apiKey.deleteMany({ where: { id, userId } })
  }

  updateLastUsed(id: string): Promise<ApiKey> {
    return this.#prisma.apiKey.update({ where: { id }, data: { lastUsedAt: new Date() } })
  }
}
