import type { UpgradeType } from '../../../generated/enums'
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
}

type UpgradeDefault = {
  type: UpgradeType
  level: number
  effect: number
  dustCost: number
}

const UPGRADE_DEFAULTS: UpgradeDefault[] = [
  { type: 'REGEN', level: 1, effect: 15, dustCost: 1000 },
  { type: 'REGEN', level: 2, effect: 30, dustCost: 5000 },
  { type: 'REGEN', level: 3, effect: 60, dustCost: 20000 },
  { type: 'REGEN', level: 4, effect: 90, dustCost: 80000 },
  { type: 'LUCK', level: 1, effect: 1.05, dustCost: 2000 },
  { type: 'LUCK', level: 2, effect: 1.1, dustCost: 8000 },
  { type: 'LUCK', level: 3, effect: 1.17, dustCost: 30000 },
  { type: 'LUCK', level: 4, effect: 1.25, dustCost: 100000 },
  { type: 'DUST_HARVEST', level: 1, effect: 1.25, dustCost: 1500 },
  { type: 'DUST_HARVEST', level: 2, effect: 1.5, dustCost: 6000 },
  { type: 'DUST_HARVEST', level: 3, effect: 2.0, dustCost: 25000 },
  { type: 'DUST_HARVEST', level: 4, effect: 3.0, dustCost: 75000 },
  { type: 'TOKEN_VAULT', level: 1, effect: 5, dustCost: 800 },
  { type: 'TOKEN_VAULT', level: 2, effect: 10, dustCost: 4000 },
  { type: 'TOKEN_VAULT', level: 3, effect: 15, dustCost: 15000 },
  { type: 'TOKEN_VAULT', level: 4, effect: 25, dustCost: 50000 },
]

export class ConfigService implements ConfigServiceInterface {
  readonly #prisma: PostgresPrismaClient
  readonly #redis: RedisClientInterface
  readonly #envDefaults: Record<ConfigKey, number>

  constructor({ postgresOrm, redisClient, config }: IocContainer) {
    this.#prisma = postgresOrm.prisma
    this.#redis = redisClient
    this.#envDefaults = {
      ...DEFAULTS,
      tokenRegenIntervalMinutes: config.tokenRegenIntervalMinutes,
      tokenMaxStock: config.tokenMaxStock,
      pityThreshold: config.pityThreshold,
    }
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

    for (const row of UPGRADE_DEFAULTS) {
      await this.#prisma.upgradeConfig.upsert({
        where: { type_level: { type: row.type, level: row.level } },
        create: row,
        update: {}, // ne pas écraser les valeurs configurées par l'admin
      })
    }
  }
}
