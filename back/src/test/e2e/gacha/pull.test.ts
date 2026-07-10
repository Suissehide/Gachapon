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
    // Pity exposé pour la carte Garantie du hub tirage
    expect(body.pityCurrent).toBe(0)
    expect(body.pityThreshold).toBe(80)
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

  it('POST /pulls/batch count=1 — same shape as pulls[0]', async () => {
    const { postgresOrm } = (app as any).iocContainer
    await postgresOrm.prisma.user.update({
      where: { email },
      data: { tokens: 5 },
    })
    const res = await app.inject({
      method: 'POST',
      url: '/pulls/batch',
      headers: { cookie: cookies },
      payload: { count: 1 },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.pulls).toHaveLength(1)
    expect(body.pulls[0].card).toHaveProperty('name')
    expect(body.tokensRemaining).toBe(4)
    expect(body).toHaveProperty('xpGained')
  })

  it('POST /pulls/batch count=10 — returns 10 cards, tokens -= 10', async () => {
    const { postgresOrm } = (app as any).iocContainer
    await postgresOrm.prisma.user.update({
      where: { email },
      data: { tokens: 12 },
    })
    const res = await app.inject({
      method: 'POST',
      url: '/pulls/batch',
      headers: { cookie: cookies },
      payload: { count: 10 },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.pulls).toHaveLength(10)
    expect(body.tokensRemaining).toBe(2)
  })

  it('POST /pulls/batch count=10 with insufficient tokens → 402', async () => {
    const { postgresOrm } = (app as any).iocContainer
    await postgresOrm.prisma.user.update({
      where: { email },
      data: { tokens: 3 },
    })
    const res = await app.inject({
      method: 'POST',
      url: '/pulls/batch',
      headers: { cookie: cookies },
      payload: { count: 10 },
    })
    expect(res.statusCode).toBe(402)
  })

  it('POST /pulls/batch count=5 — returns 5 cards, tokens -= 5', async () => {
    const { postgresOrm } = (app as any).iocContainer
    await postgresOrm.prisma.user.update({
      where: { email },
      data: { tokens: 8 },
    })
    const res = await app.inject({
      method: 'POST',
      url: '/pulls/batch',
      headers: { cookie: cookies },
      payload: { count: 5 },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.pulls).toHaveLength(5)
    expect(body.tokensRemaining).toBe(3)
  })

  it('POST /pulls/batch count out of range (0, 11) → 400 (Zod)', async () => {
    for (const count of [0, 11]) {
      const res = await app.inject({
        method: 'POST',
        url: '/pulls/batch',
        headers: { cookie: cookies },
        payload: { count },
      })
      expect(res.statusCode).toBe(400)
    }
  })

  it('POST /pulls — un doublon ne crédite plus de poussière auto', async () => {
    const { postgresOrm } = (app as any).iocContainer

    // Isolate this test: snapshot which sets are currently active, deactivate
    // them all except GachaSet so both pulls land on the same card, and
    // restore the snapshot at the end so later e2e files see the same active
    // sets they would have without this test.
    const otherActive = await postgresOrm.prisma.cardSet.findMany({
      where: { isActive: true, name: { not: `GachaSet${suffix}` } },
      select: { id: true },
    })
    await postgresOrm.prisma.cardSet.updateMany({
      where: { id: { in: otherActive.map((s: { id: string }) => s.id) } },
      data: { isActive: false },
    })

    // Top up tokens to ensure pulls go through
    await postgresOrm.prisma.user.update({
      where: { email },
      data: { tokens: 5 },
    })

    // Pull twice — second pull on a 1-card set guarantees a duplicate
    const first = await app.inject({
      method: 'POST',
      url: '/pulls',
      headers: { cookie: cookies },
    })
    expect(first.statusCode).toBe(201)

    const second = await app.inject({
      method: 'POST',
      url: '/pulls',
      headers: { cookie: cookies },
    })
    expect(second.statusCode).toBe(201)
    const body = second.json()
    expect(body.wasDuplicate).toBe(true)
    expect(body.dustEarned).toBe(0)

    // Restore the previously-active sets so later e2e files keep their
    // expected fixture state.
    await postgresOrm.prisma.cardSet.updateMany({
      where: { id: { in: otherActive.map((s: { id: string }) => s.id) } },
      data: { isActive: true },
    })
  })
})
