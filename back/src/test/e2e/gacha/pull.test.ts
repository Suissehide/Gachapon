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

    const { postgresOrm } = (app as any).iocContainer

    // Seed a card set + card so pulls can succeed
    const set = await postgresOrm.prisma.cardSet.create({
      data: { name: `GachaSet${suffix}`, isActive: true },
    })
    await postgresOrm.prisma.card.create({
      data: { name: `GachaCard${suffix}`, rarity: 'COMMON', dropWeight: 10, setId: set.id },
    })

    // Register + verify + login
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username, email, password },
    })
    expect(res.statusCode).toBe(201)

    await postgresOrm.prisma.user.update({
      where: { email },
      data: { emailVerifiedAt: new Date(), tokens: 3, lastTokenAt: new Date() },
    })

    const loginRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email, password },
    })
    cookies = loginRes.headers['set-cookie'] as string
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

  it('GET /pulls/recent — retourne les tirages récents', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/pulls/recent',
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json() as Array<{
      username: string
      cardName: string
      rarity: string
      variant: string
      cardId: string
      imageUrl: string | null
      setName: string
      pulledAt: string
    }>
    expect(Array.isArray(body)).toBe(true)
    // At least 1 entry — the pull done in the earlier test
    expect(body.length).toBeGreaterThanOrEqual(1)
    const entry = body[0]!
    expect(entry).toHaveProperty('username')
    expect(entry).toHaveProperty('cardName')
    expect(entry).toHaveProperty('rarity')
    expect(entry).toHaveProperty('variant')
    expect(entry).toHaveProperty('cardId')
    expect(entry).toHaveProperty('imageUrl')
    expect(entry).toHaveProperty('setName')
    expect(entry).toHaveProperty('pulledAt')
  })

  it('GET /pulls/recent?limit=1 — respecte le paramètre limit', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/pulls/recent?limit=1',
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json() as unknown[]
    expect(body.length).toBeLessThanOrEqual(1)
  })

  it('GET /pulls/recent — 401 sans cookie', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/pulls/recent',
    })
    expect(res.statusCode).toBe(401)
  })
})
