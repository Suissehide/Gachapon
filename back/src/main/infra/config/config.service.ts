import type { IocContainer } from '../../types/application/ioc'
import type {
  ConfigKey,
  ConfigServiceInterface,
} from '../../types/infra/config/config.service.interface'
import type { RedisClientInterface } from '../../types/infra/redis/redis-client'
import type { PostgresPrismaClient } from '../orm/postgres-client'

const REDIS_TTL_SECONDS = 300 // 5 minutes

const DEFAULTS: Record<ConfigKey, number> = {
  tokenRegenIntervalMinutes: 240,
  tokenMaxStock: 5,
  pityThreshold: 100,
  dustCommon: 5,
  dustUncommon: 15,
  dustRare: 50,
  dustEpic: 150,
  dustLegendary: 500,
  holoRateRare: 0,
  holoRateEpic: 0,
  holoRateLegendary: 0,
  brilliantRateRare: 0,
  brilliantRateEpic: 0,
  brilliantRateLegendary: 0,
  variantMultiplierHolo: 2,
  variantMultiplierBrilliant: 3,
}


export class ConfigService implements ConfigServiceInterface {
  readonly #prisma: PostgresPrismaClient
  readonly #redis: RedisClientInterface
  readonly #envDefaults: Record<ConfigKey, number>

  constructor({ postgresOrm, redisClient }: IocContainer) {
    this.#prisma = postgresOrm.prisma
    this.#redis = redisClient
    this.#envDefaults = { ...DEFAULTS }
  }

  async get(key: ConfigKey): Promise<number> {
    const redisKey = `config:${key}`

    // 1. Redis cache
    const cached = await this.#redis.get(redisKey)
    if (cached !== null) {
      return Number(cached)
    }

    // 2. DB
    const row = await this.#prisma.globalConfig.findUnique({ where: { key } })
    if (row !== null) {
      await this.#redis.set(redisKey, row.value, REDIS_TTL_SECONDS)
      return Number(row.value)
    }

    // 3. Env var / hardcoded default
    return this.#envDefaults[key] ?? 0
  }

  async getMany<K extends ConfigKey>(...keys: K[]): Promise<Record<K, number>> {
    const values = await Promise.all(keys.map((k) => this.get(k)))
    return Object.fromEntries(keys.map((k, i) => [k, values[i]])) as Record<
      K,
      number
    >
  }

  async set(key: ConfigKey, value: number): Promise<void> {
    await this.#prisma.globalConfig.upsert({
      where: { key },
      create: { key, value: String(value) },
      update: { value: String(value) },
    })
    await this.#redis.del(`config:${key}`)
  }

  async bootstrap(): Promise<void> {
    for (const [key, defaultValue] of Object.entries(this.#envDefaults) as [
      ConfigKey,
      number,
    ][]) {
      await this.#prisma.globalConfig.upsert({
        where: { key },
        create: { key, value: String(defaultValue) },
        update: {}, // ne pas écraser les valeurs existantes
      })
    }

    await this.#prisma.skillConfig.upsert({
      where: { id: 1 },
      create: { id: 1, resetCostPerPoint: 50 },
      update: {},
    })
  }
}
