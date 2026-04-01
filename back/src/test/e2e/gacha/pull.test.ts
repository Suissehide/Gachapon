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

  it('GET /pulls/recent — retourne { entries, hasMore }', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/pulls/recent',
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json() as { entries: unknown[]; hasMore: boolean }
    expect(body).toHaveProperty('entries')
    expect(body).toHaveProperty('hasMore')
    expect(Array.isArray(body.entries)).toBe(true)
    expect(typeof body.hasMore).toBe('boolean')
    expect(body.entries.length).toBeGreaterThanOrEqual(1)
    const entry = body.entries[0] as Record<string, unknown>
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
    const body = res.json() as { entries: unknown[]; hasMore: boolean }
    expect(body.entries.length).toBeLessThanOrEqual(1)
  })

  it('GET /pulls/recent?before=<cursor> — cursor pagination', async () => {
    // Fetch first page
    const first = await app.inject({
      method: 'GET',
      url: '/pulls/recent?limit=1',
      headers: { cookie: cookies },
    })
    const firstBody = first.json() as { entries: Array<{ pulledAt: string }>; hasMore: boolean }
    const cursor = firstBody.entries[0]?.pulledAt
    if (!cursor) return // skip if no pulls

    // Fetch with before cursor — should return older entries
    const res = await app.inject({
      method: 'GET',
      url: `/pulls/recent?limit=1&before=${encodeURIComponent(cursor)}`,
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json() as { entries: Array<{ pulledAt: string }>; hasMore: boolean }
    if (body.entries.length > 0) {
      expect(new Date(body.entries[0]!.pulledAt) < new Date(cursor)).toBe(true)
    }
  })

  it('GET /pulls/recent — 401 sans cookie', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/pulls/recent',
    })
    expect(res.statusCode).toBe(401)
  })
})
