import type { IocContainer } from '../../types/application/ioc'
import type {
  ConfigKey,
  ConfigServiceInterface,
} from '../../types/infra/config/config.service.interface'
import type { RedisClientInterface } from '../../types/infra/redis/redis-client'
import type { PostgresPrismaClient } from '../orm/postgres-client'

const REDIS_TTL_SECONDS = 300 // 5 minutes

const DEFAULTS: Record<ConfigKey, number> = {
  tokenRegenIntervalMinutes: 60,
  tokenMaxStock: 6,
  pityThreshold: 300,
  dustCommon: 10,
  dustUncommon: 30,
  dustRare: 80,
  dustEpic: 240,
  dustLegendary: 800,
  // taux de variantes en POINTS DE POURCENTAGE (pickVariant roll: Math.random() * 100)
  holoRateRare: 1,
  holoRateEpic: 1.5,
  holoRateLegendary: 2,
  brilliantRateRare: 3,
  brilliantRateEpic: 4,
  brilliantRateLegendary: 5,
  dailyShopPriceCommon: 50,
  dailyShopPriceUncommon: 150,
  dailyShopPriceRare: 500,
  dailyShopPriceEpic: 1500,
  dailyShopPriceLegendary: 5000,
  xpPerPull: 10,
  'combat.pointsMax': 60,
  'combat.regenSeconds': 600,
  'combat.battleCost': 5,
  'combat.sweepCost': 5,
  'gacha.pullTokenCost': 1,
  'xp.base': 100,
  'xp.slope': 30,
  'xp.levelCap': 100,
  'card.goldCostBase': 5,
  'card.goldCostExp': 1.6,
  'card.dustCostBase': 0.5,
  'card.dustCostExp': 1.4,
  'card.rarityMultCommon': 1.0,
  'card.rarityMultUncommon': 1.3,
  'card.rarityMultRare': 1.7,
  'card.rarityMultEpic': 2.3,
  'card.rarityMultLegendary': 3.0,
  'wishlist.priceMultiplier': 2,
  'wishlist.cooldownDays': 7,
  'shop.energyDailyCap': 3,
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
