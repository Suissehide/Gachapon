import { resolve } from 'node:path'
import { config as loadEnv } from 'dotenv'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/client'
import Redis from 'ioredis'

import { maintenanceUrl, runDatabaseName } from './helpers/e2e-database'
import { releaseRedisIndex } from './helpers/e2e-redis'

/**
 * Rend ce que `globalSetup` a reserve : la base du run et son index Redis.
 *
 * Un run tue n'arrive jamais ici. Ce n'est pas bloquant : le prochain
 * `globalSetup` ramasse les bases des processus morts et reprend leurs index.
 */
export default async function globalTeardown() {
  loadEnv({ path: resolve(__dirname, '../../.env.test'), override: true })
  const baseUrl = process.env.DATABASE_URL
  if (!baseUrl) {
    return
  }
  const baseName = new URL(baseUrl).pathname.replace(/^\//, '')
  const runName = runDatabaseName(baseName, process.pid)

  const admin = new PrismaClient({
    adapter: new PrismaPg({ connectionString: maintenanceUrl(baseUrl) }),
  })
  try {
    // WITH (FORCE) : une connexion qu'un test n'a pas fermee empecherait le
    // DROP, et `--forceExit` en laisse. Mieux vaut couper que laisser trainer.
    await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${runName}" WITH (FORCE)`)
  } catch {
    // Le menage du prochain run rattrapera.
  } finally {
    await admin.$disconnect()
  }

  const index = Number(process.env.E2E_REDIS_INDEX)
  if (!Number.isInteger(index)) {
    return
  }
  const claimUrl = new URL(process.env.REDIS_URL || 'redis://localhost:6379')
  claimUrl.pathname = '/0'
  const claimer = new Redis(claimUrl.toString())
  try {
    await releaseRedisIndex(
      {
        setNx: async () => false,
        get: (key) => claimer.get(key),
        del: async (key) => {
          await claimer.del(key)
        },
      },
      index,
      process.pid,
    )
  } finally {
    claimer.disconnect()
  }
}
