import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'

import { buildTestApp } from '../../helpers/build-test-app'

/**
 * En prod le back est derrière Traefik : sans `trustProxy`, `request.ip` était
 * l'IP du conteneur Traefik pour tout le monde, et chaque limite « par IP »
 * devenait une limite partagée par tout le site (6 inscriptions en 15 min,
 * toutes IP confondues, bloquaient la suivante).
 *
 * `inject()` simule ce proxy : la connexion vient de 127.0.0.1 et l'IP du
 * client est dans `X-Forwarded-For`. Les IP de test (203.0.113.0/24, réservée
 * à la documentation) ne servent qu'ici, donc les compteurs n'en gênent aucune
 * autre suite — même dans le store Redis, partagé par tout le run.
 */
const forgotPassword = (
  app: Awaited<ReturnType<typeof buildTestApp>>,
  forwardedFor: string,
) =>
  app.inject({
    method: 'POST',
    url: '/auth/forgot-password',
    headers: { 'x-forwarded-for': forwardedFor },
    payload: { email: 'nobody-rate-limit@example.com' },
  })

describe.each(['memory', 'redis'])('rate limit per IP (%s store)', (store) => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  const previousStore = process.env.RATE_LIMIT_STORE
  const octet = store === 'memory' ? 10 : 20

  beforeAll(async () => {
    process.env.RATE_LIMIT_STORE = store
    app = await buildTestApp()
    await app.ready()
  })
  afterAll(async () => {
    process.env.RATE_LIMIT_STORE = previousStore
    await app.close()
  })

  it('counts each client IP separately behind the proxy', async () => {
    const first = `203.0.113.${octet}`
    const second = `203.0.113.${octet + 1}`

    // forgot-password : 5 requêtes / 15 min par IP.
    for (let i = 0; i < 5; i++) {
      expect((await forgotPassword(app, first)).statusCode).toBe(204)
    }
    expect((await forgotPassword(app, first)).statusCode).toBe(429)

    // Un autre client derrière le même proxy garde son propre quota.
    expect((await forgotPassword(app, second)).statusCode).toBe(204)
  })

  it('trusts only the hop the proxy appended, not a forged leftmost entry', async () => {
    const real = `203.0.113.${octet + 2}`

    // Un client qui change la première entrée à chaque requête ne se crée
    // pas de nouveau quota : seule la dernière (ajoutée par Traefik) compte.
    for (let i = 0; i < 5; i++) {
      const res = await forgotPassword(app, `198.51.100.${i}, ${real}`)
      expect(res.statusCode).toBe(204)
    }
    const forged = await forgotPassword(app, `198.51.100.99, ${real}`)
    expect(forged.statusCode).toBe(429)
  })

  it('keeps the counters in the configured store', async () => {
    const keys = await app.iocContainer.redisClient.client.keys(
      `*203.0.113.${octet}*`,
    )
    expect(keys.length > 0).toBe(store === 'redis')
  })
})

describe('POST /auth/login rate limit', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>

  beforeAll(async () => {
    app = await buildTestApp()
  })
  afterAll(async () => {
    await app.close()
  })

  it('caps login attempts per IP', async () => {
    const ip = '203.0.113.30'
    const attempt = () =>
      app.inject({
        method: 'POST',
        url: '/auth/login',
        headers: { 'x-forwarded-for': ip },
        payload: { email: 'nobody-rate-limit@example.com', password: 'Wrong123!' },
      })

    for (let i = 0; i < 10; i++) {
      expect((await attempt()).statusCode).not.toBe(429)
    }
    expect((await attempt()).statusCode).toBe(429)
  })
})
