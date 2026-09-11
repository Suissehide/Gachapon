import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { config as loadEnv } from 'dotenv'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/client'
import Redis from 'ioredis'

import {
  isProcessAlive,
  maintenanceUrl,
  runDatabaseName,
  staleRunDatabases,
  withDatabase,
} from './helpers/e2e-database'
import { claimRedisIndex } from './helpers/e2e-redis'

/**
 * Chaque run e2e travaille sur SA base et SON index Redis.
 *
 * Avant, ce fichier tronquait une base au nom fixe et vidait un index Redis
 * partage : deux runs simultanes sur la meme machine — deux sessions d'agent
 * dans le meme worktree, ou un dev et un script — se detruisaient
 * mutuellement, avec une panne muette et deroutante (un « User not found »
 * quelques millisecondes apres un login reussi, des collisions de contrainte
 * unique, un ensemble d'echecs different a chaque run, des suites vertes des
 * qu'on les lancait seules).
 *
 * Isoler plutot que serialiser : un verrou aurait fait attendre les runs les
 * uns derriere les autres, ici ils sont reellement paralleles. Une base neuve
 * coute ~1,4 s de migrations.
 *
 * Ce que `globalSetup` pose dans `process.env` vaut pour TOUT le run : lui
 * seul charge `.env.test`, les suites lisent `process.env`.
 */
export default async function globalSetup() {
  loadEnv({ path: resolve(__dirname, '../../.env.test'), override: true })

  const baseUrl = process.env.DATABASE_URL
  if (!baseUrl) {
    throw new Error('DATABASE_URL is not set — check back/.env.test')
  }
  const baseName = new URL(baseUrl).pathname.replace(/^\//, '')
  const runName = runDatabaseName(baseName, process.pid)
  const runUrl = withDatabase(baseUrl, runName)

  // Connexion de maintenance : CREATE/DROP DATABASE ne s'execute pas depuis la
  // base concernee.
  const admin = new PrismaClient({
    adapter: new PrismaPg({ connectionString: maintenanceUrl(baseUrl) }),
  })
  try {
    // Menage au passage : les bases des runs tues, qui ne sont jamais passes
    // par leur teardown. Sans ca elles s'accumuleraient a chaque incident.
    const rows = await admin.$queryRawUnsafe<{ datname: string }[]>(
      'SELECT datname FROM pg_database',
    )
    for (const dead of staleRunDatabases(
      rows.map((r) => r.datname),
      baseName,
      isProcessAlive,
    )) {
      await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${dead}"`)
    }

    await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${runName}"`)
    await admin.$executeRawUnsafe(`CREATE DATABASE "${runName}"`)
  } finally {
    await admin.$disconnect()
  }

  process.env.DATABASE_URL = runUrl

  // Migrations sur la base du run. `env` est passe explicitement : le
  // sous-processus doit voir le DATABASE_URL qu'on vient de poser.
  // `shell: true` — sur Windows npx est un .cmd, qu'execFileSync ne sait pas
  // résoudre seul (spawnSync npx ENOENT).
  execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
    stdio: 'inherit',
    cwd: resolve(__dirname, '../..'),
    shell: true,
    env: { ...process.env, DATABASE_URL: runUrl },
  })

  // L'index Redis, reserve dans l'index 0. Isoler Postgres ne suffit pas :
  // `configService` cache ses valeurs sous des cles `config:*`, et un
  // `configService.set` d'un run servirait sinon a l'autre une valeur que SA
  // base ne contient pas.
  const baseRedisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
  const claimUrl = new URL(baseRedisUrl)
  claimUrl.pathname = '/0'
  const claimer = new Redis(claimUrl.toString())
  let index: number
  try {
    index = await claimRedisIndex(
      {
        setNx: async (key, value) =>
          (await claimer.set(key, value, 'NX')) === 'OK',
        get: (key) => claimer.get(key),
        del: async (key) => {
          await claimer.del(key)
        },
      },
      process.pid,
      isProcessAlive,
    )
  } finally {
    claimer.disconnect()
  }

  const runRedisUrl = new URL(baseRedisUrl)
  runRedisUrl.pathname = `/${index}`
  process.env.REDIS_URL = runRedisUrl.toString()
  process.env.E2E_REDIS_INDEX = String(index)

  // L'index reserve peut trainer d'un run tue : on le vide, il est a nous.
  const redis = new Redis(process.env.REDIS_URL)
  try {
    await redis.flushdb()
  } finally {
    redis.disconnect()
  }
}
