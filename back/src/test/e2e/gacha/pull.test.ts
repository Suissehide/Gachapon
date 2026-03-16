import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'
import { buildTestApp } from '../../helpers/build-test-app'

describe('Gacha routes', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let cookies: string

  const suffix = Date.now()
  const email = `gacha${suffix}@test.com`
  const password = 'Password123!'
  const username = `gachauser${suffix}`

  beforeAll(async () => {
    app = await buildTestApp()

    // Register + get cookies
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username, email, password },
    })
    expect(res.statusCode).toBe(201)
    cookies = res.headers['set-cookie'] as string

    // Give the user 3 tokens directly via DB
    const { postgresOrm } = (app as any).iocContainer
    await postgresOrm.prisma.user.update({
      where: { email },
      data: { tokens: 3, lastTokenAt: new Date() },
    })
  })

  afterAll(async () => {
    await app.close()
  })

  it('GET /tokens/balance — retourne le solde', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/tokens/balance',
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body).toHaveProperty('tokens')
    expect(body).toHaveProperty('maxStock')
    expect(body).toHaveProperty('nextTokenAt')
  })

  it('POST /pulls — retourne la carte tirée', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/pulls',
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body).toHaveProperty('card')
    expect(body.card).toHaveProperty('name')
    expect(body.card).toHaveProperty('rarity')
    expect(body).toHaveProperty('wasDuplicate')
    expect(body).toHaveProperty('dustEarned')
    expect(body).toHaveProperty('tokensRemaining')
  })

  it('POST /pulls — sans token → 402', async () => {
    // Vider les tokens
    const { postgresOrm } = (app as any).iocContainer
    await postgresOrm.prisma.user.update({
      where: { email },
      data: { tokens: 0, lastTokenAt: new Date() },
    })
    const res = await app.inject({
      method: 'POST',
      url: '/pulls',
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(402)
  })

  it('GET /pulls/history — retourne le historique', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/pulls/history',
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body).toHaveProperty('pulls')
    expect(body).toHaveProperty('total')
    expect(Array.isArray(body.pulls)).toBe(true)
  })
})
