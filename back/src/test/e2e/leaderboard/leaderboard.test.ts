import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'
import { CAMPAIGN_TEAM_KEY } from '../../../main/domain/combat/combat-team-keys'
import { buildTestApp } from '../../helpers/build-test-app'
import { setCombatTeam } from '../../helpers/combat-team-fixture'

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

  // ── COMBAT : la table UserCombatTeam remplace User.combatTeam ───────────
  // Le classement range sur l'équipe de CAMPAGNE, jamais sur les autres
  // modes — c'est une décision assumée (voir leaderboard.repository.ts) et
  // elle doit être verrouillée par un test, pas seulement par la lecture du
  // code.
  describe('classement combat — bascule sur UserCombatTeam', () => {
    let campaignUserId: string
    let towerOnlyUserId: string

    beforeAll(async () => {
      const { postgresOrm } = (app as any).iocContainer

      const set = await postgresOrm.prisma.cardSet.create({
        data: { name: `LbCombatSet${suffix}`, isActive: false },
      })
      const card = await postgresOrm.prisma.card.create({
        data: {
          name: `LbCombatCard${suffix}`,
          rarity: 'RARE',
          dropWeight: 10,
          setId: set.id,
          baseHp: 200,
          baseAtk: 20,
          baseDef: 10,
          baseSpd: 100,
        },
      })

      // Joueur A : équipe de CAMPAGNE posée via la route par clé.
      const emailA = `lbcombat-a${suffix}@test.com`
      const regA = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          username: `lbcombata${suffix}`,
          email: emailA,
          password: 'Password123!',
        },
      })
      expect(regA.statusCode).toBe(201)
      const userA = await postgresOrm.prisma.user.update({
        where: { email: emailA },
        data: { emailVerifiedAt: new Date() },
      })
      campaignUserId = userA.id
      const ucA = await postgresOrm.prisma.userCard.create({
        data: {
          userId: userA.id,
          cardId: card.id,
          variant: 'NORMAL',
          quantity: 1,
          level: 1,
          palier: 1,
        },
      })
      const loginA = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: emailA, password: 'Password123!' },
      })
      const cookiesA = loginA.headers['set-cookie'] as string
      await setCombatTeam(app, cookiesA, CAMPAIGN_TEAM_KEY, [ucA.id])

      // Joueur B : équipe posée UNIQUEMENT sur la tour de Braise, jamais sur
      // la campagne — écrite directement en base pour ne pas dépendre de la
      // route (Task 6, qui met la tour derrière un contrat différent).
      const emailB = `lbcombat-b${suffix}@test.com`
      const userB = await postgresOrm.prisma.user.create({
        data: {
          email: emailB,
          username: `lbcombatb${suffix}`,
          emailVerifiedAt: new Date(),
        },
      })
      towerOnlyUserId = userB.id
      const ucB = await postgresOrm.prisma.userCard.create({
        data: {
          userId: userB.id,
          cardId: card.id,
          variant: 'NORMAL',
          quantity: 1,
          level: 1,
          palier: 1,
        },
      })
      await postgresOrm.prisma.userCombatTeam.create({
        data: { userId: userB.id, key: 'tower:FIRE', userCardIds: [ucB.id] },
      })
    })

    it('un joueur avec une equipe de CAMPAGNE apparait au classement, puissance non nulle', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/leaderboard/combat',
        headers: { cookie: cookies },
      })
      expect(res.statusCode).toBe(200)
      const body = res.json() as {
        entries: Array<{ user: { id: string }; combatPower: number }>
      }
      const entry = body.entries.find((e) => e.user.id === campaignUserId)
      expect(entry).toBeDefined()
      expect(entry?.combatPower).toBeGreaterThan(0)
    })

    it("un joueur avec SEULEMENT une equipe de tour n'apparait PAS au classement (la campagne fait foi)", async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/leaderboard/combat',
        headers: { cookie: cookies },
      })
      expect(res.statusCode).toBe(200)
      const body = res.json() as { entries: Array<{ user: { id: string } }> }
      expect(
        body.entries.find((e) => e.user.id === towerOnlyUserId),
      ).toBeUndefined()
    })
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

  // ── QUESTS (moved to /quests router, new shape) ─────────────────────────
  it('GET /quests — retourne { weekly, weeklyBonus, oneshot }', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/quests',
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(Array.isArray(body.weekly)).toBe(true)
    expect(Array.isArray(body.oneshot)).toBe(true)
    expect(body.weeklyBonus).toHaveProperty('completed')
    expect(body.weeklyBonus).toHaveProperty('reward')
  })

  it('GET /quests — 401 sans auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/quests' })
    expect(res.statusCode).toBe(401)
  })
})
