import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'
import { buildTestApp } from '../../helpers/build-test-app'

describe('Leaderboard routes', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let cookies: string

  const suffix = Date.now()

  beforeAll(async () => {
    app = await buildTestApp()
    await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        username: `lb${suffix}`,
        email: `lb${suffix}@test.com`,
        password: 'Password123!',
      },
    })
    const { postgresOrm } = (app as any).iocContainer
    await postgresOrm.prisma.user.update({
      where: { email: `lb${suffix}@test.com` },
      data: { emailVerifiedAt: new Date() },
    })
    const loginRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: `lb${suffix}@test.com`, password: 'Password123!' },
    })
    cookies = loginRes.headers['set-cookie'] as string
  })

  afterAll(() => app.close())

  // ── COLLECTORS ──────────────────────────────────────────────────────────
  it('GET /leaderboard/collectors — top 10 + currentUserEntry shape', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/leaderboard/collectors',
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(Array.isArray(body.entries)).toBe(true)
    expect(body.entries.length).toBeLessThanOrEqual(10)
    // currentUserEntry is null if user is in entries OR has no cards yet.
    expect(body).toHaveProperty('currentUserEntry')
    for (const e of body.entries) {
      expect(e).toMatchObject({
        rank: expect.any(Number),
        user: {
          id: expect.any(String),
          username: expect.any(String),
          level: expect.any(Number),
        },
        cardPercentage: expect.any(Number),
        variantPercentage: expect.any(Number),
        pulls: expect.any(Number),
        legendaries: expect.any(Number),
      })
    }
  })

  it('GET /leaderboard/collectors — 401 sans auth', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/leaderboard/collectors',
    })
    expect(res.statusCode).toBe(401)
  })

  // ── TEAMS ───────────────────────────────────────────────────────────────
  it('GET /leaderboard/teams — entries[], currentUserEntry, currentUserTeamId', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/leaderboard/teams',
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(Array.isArray(body.entries)).toBe(true)
    expect(body).toHaveProperty('currentUserEntry')
    expect(body).toHaveProperty('currentUserTeamId')
    for (const e of body.entries) {
      expect(e).toMatchObject({
        rank: expect.any(Number),
        team: {
          id: expect.any(String),
          name: expect.any(String),
          slug: expect.any(String),
          memberCount: expect.any(Number),
        },
        cardPercentage: expect.any(Number),
        variantPercentage: expect.any(Number),
        pullsTotal: expect.any(Number),
      })
    }
  })

  it('GET /leaderboard/teams — 401 sans auth', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/leaderboard/teams',
    })
    expect(res.statusCode).toBe(401)
  })

  // ── COMBAT ──────────────────────────────────────────────────────────────
  it('GET /leaderboard/combat — entries[] et maxPalier', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/leaderboard/combat',
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(Array.isArray(body.entries)).toBe(true)
    expect(body).toHaveProperty('currentUserEntry')
    for (const e of body.entries) {
      expect(e).toMatchObject({
        rank: expect.any(Number),
        user: {
          id: expect.any(String),
          username: expect.any(String),
          level: expect.any(Number),
        },
        palier: expect.any(Number),
        maxPalier: expect.any(Number),
        combatPower: expect.any(Number),
      })
      expect(e.palier).toBeGreaterThanOrEqual(0)
      expect(e.palier).toBeLessThanOrEqual(e.maxPalier)
    }
  })

  it('GET /leaderboard/combat — 401 sans auth', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/leaderboard/combat',
    })
    expect(res.statusCode).toBe(401)
  })

  // ── OLD ENDPOINT IS GONE ────────────────────────────────────────────────
  it('GET /leaderboard — 404 (old endpoint removed)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/leaderboard',
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(404)
  })

  // ── QUESTS (unchanged) ──────────────────────────────────────────────────
  it('GET /quests — retourne la liste des quêtes', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/quests',
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(Array.isArray(body.quests)).toBe(true)
  })

  it('GET /quests — 401 sans auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/quests' })
    expect(res.statusCode).toBe(401)
  })
})
