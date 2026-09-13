import { describe, expect, it } from '@jest/globals'

import {
  maintenanceUrl,
  runDatabaseName,
  staleRunDatabases,
  withDatabase,
} from '../helpers/e2e-database'
import { claimRedisIndex, type RedisClaimClient } from '../helpers/e2e-redis'

/**
 * L'isolation d'un run e2e : sa propre base Postgres, son propre index Redis.
 *
 * Elle remplace le verrou qui serialisait les runs. `globalSetup` tronquait
 * une base au nom fixe ET vidait un index Redis partage : deux runs
 * simultanes — deux sessions d'agent sur le meme worktree — se detruisaient
 * mutuellement. Isoler vaut mieux que serialiser : les runs deviennent
 * reellement paralleles au lieu de s'attendre.
 */
describe('isolation du run e2e — base', () => {
  const base = 'postgresql://u:p@localhost:5432/gachapon_test'

  it('nomme la base du run avec le PID, pour pouvoir la reclamer plus tard', () => {
    expect(runDatabaseName('gachapon_test', 4242)).toBe(
      'gachapon_test_run_4242',
    )
  })

  it('reecrit l\'URL vers la base du run en gardant hote et identifiants', () => {
    const url = new URL(withDatabase(base, 'gachapon_test_run_7'))
    expect(url.pathname).toBe('/gachapon_test_run_7')
    expect(url.host).toBe('localhost:5432')
    expect(url.username).toBe('u')
    expect(url.password).toBe('p')
  })

  // CREATE/DROP DATABASE ne peut pas s'executer depuis la base concernee.
  it('pointe la connexion de maintenance sur « postgres »', () => {
    expect(new URL(maintenanceUrl(base)).pathname).toBe('/postgres')
  })

  // Un run tue (Ctrl-C, OOM) ne passe pas par son teardown et laisse sa base
  // derriere lui. Sans ce ramassage, elles s'accumuleraient indefiniment.
  it('ramasse les bases des runs morts, et epargne les vivants', () => {
    const alive = new Set([100])
    const stale = staleRunDatabases(
      [
        'gachapon',
        'gachapon_test',
        'gachapon_test_run_100',
        'gachapon_test_run_200',
        'autre_projet_run_300',
      ],
      'gachapon_test',
      (pid) => alive.has(pid),
    )
    expect(stale).toEqual(['gachapon_test_run_200'])
  })
})

describe('isolation du run e2e — Redis', () => {
  /** Client minimal : juste ce que la reservation utilise. */
  function fakeRedis(initial: Record<string, string> = {}): RedisClaimClient & {
    store: Record<string, string>
  } {
    const store = { ...initial }
    return {
      store,
      async setNx(key, value) {
        if (key in store) {
          return false
        }
        store[key] = value
        return true
      },
      async get(key) {
        return store[key] ?? null
      },
      async del(key) {
        delete store[key]
      },
    }
  }

  it('reserve le premier index libre', async () => {
    const redis = fakeRedis()
    expect(await claimRedisIndex(redis, 10, () => true)).toBe(1)
    expect(redis.store['e2e:redis-index:1']).toBe('10')
  })

  it('passe au suivant quand un index est tenu par un run VIVANT', async () => {
    const redis = fakeRedis({ 'e2e:redis-index:1': '10' })
    expect(await claimRedisIndex(redis, 11, (pid) => pid === 10)).toBe(2)
  })

  it("reprend l'index d'un run mort plutot que d'en consommer un autre", async () => {
    const redis = fakeRedis({ 'e2e:redis-index:1': '999' })
    expect(await claimRedisIndex(redis, 11, (pid) => pid !== 999)).toBe(1)
    expect(redis.store['e2e:redis-index:1']).toBe('11')
  })

  // Mieux vaut un echec nomme qu'un run qui partage silencieusement son cache.
  it('leve quand tous les index sont pris', async () => {
    const full: Record<string, string> = {}
    for (let i = 1; i <= 15; i += 1) {
      full[`e2e:redis-index:${i}`] = '10'
    }
    await expect(claimRedisIndex(fakeRedis(full), 11, () => true)).rejects.toThrow(
      /index Redis/,
    )
  })
})
