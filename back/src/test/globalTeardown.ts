import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { config as loadEnv } from 'dotenv'

import { databaseNameFromUrl, releaseE2eLock } from './helpers/e2e-lock'

/**
 * Rend le verrou pose par `globalSetup`.
 *
 * Un run tue avant d'arriver ici laisse son verrou derriere lui ; ce n'est pas
 * bloquant, `acquireE2eLock` reprend un verrou dont le processus est mort.
 */
export default async function globalTeardown() {
  loadEnv({ path: resolve(__dirname, '../../.env.test'), override: true })
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    return
  }
  releaseE2eLock(
    join(tmpdir(), 'gachapon-e2e-locks'),
    databaseNameFromUrl(connectionString),
    process.pid,
  )
}
