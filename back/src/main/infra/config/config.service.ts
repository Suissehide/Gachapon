// back/src/main/infra/config/config.service.ts
import type { IocContainer } from '../../types/application/ioc'
import type { ConfigServiceInterface } from '../../types/infra/config/config.service.interface'
import type { RedisClientInterface } from '../../types/infra/redis/redis-client'
import type { PostgresPrismaClient } from '../orm/postgres-client'

const REDIS_TTL_SECONDS = 300 // 5 minutes

const DEFAULTS: Record<string, number> = {
  tokenRegenIntervalHours: 4,
  tokenMaxStock: 5,
  pityThreshold: 100,
  dustCommon: 5,
  dustUncommon: 15,
  dustRare: 50,
  dustEpic: 150,
  dustLegendary: 500,
}

export class ConfigService implements ConfigServiceInterface {
  readonly #prisma: PostgresPrismaClient
  readonly #redis: RedisClientInterface
  readonly #envDefaults: Record<string, number>

  constructor({ postgresOrm, redisClient, config }: IocContainer) {
    this.#prisma = postgresOrm.prisma
    this.#redis = redisClient
    this.#envDefaults = {
      ...DEFAULTS,
      tokenRegenIntervalHours: config.tokenRegenIntervalHours,
      tokenMaxStock: config.tokenMaxStock,
      pityThreshold: config.pityThreshold,
    }
  }

  async get(key: string): Promise<number> {
    const redisKey = `config:${key}`

    // 1. Redis cache
    const cached = await this.#redis.get(redisKey)
    if (cached !== null) { return Number(cached) }

    // 2. DB
    const row = await this.#prisma.globalConfig.findUnique({ where: { key } })
    if (row !== null) {
      await this.#redis.set(redisKey, row.value, REDIS_TTL_SECONDS)
      return Number(row.value)
    }

    // 3. Env var / hardcoded default
    const fallback = this.#envDefaults[key] ?? 0
    return fallback
  }

  async set(key: string, value: number): Promise<void> {
    await this.#prisma.globalConfig.upsert({
      where: { key },
      create: { key, value: String(value) },
      update: { value: String(value) },
    })
    await this.#redis.del(`config:${key}`)
  }

  async bootstrap(): Promise<void> {
    for (const [key, defaultValue] of Object.entries(this.#envDefaults)) {
      await this.#prisma.globalConfig.upsert({
        where: { key },
        create: { key, value: String(defaultValue) },
        update: {}, // ne pas écraser les valeurs existantes
      })
    }
  }
}
