import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'

import { buildTestApp } from '../../helpers/build-test-app'

describe('Combat team routes', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let cookies: string
  let userCard1Id: string
  let userCard2Id: string
  let otherUserCardId: string

  const suffix = Date.now()
  const email = `team${suffix}@test.com`
  const password = 'Password123!'
  const username = `teamuser${suffix}`

  beforeAll(async () => {
    app = await buildTestApp()
    const { postgresOrm } = (app as any).iocContainer

    const set = await postgresOrm.prisma.cardSet.create({
      data: { name: `TeamSet${suffix}`, isActive: false },
    })
    const card1 = await postgresOrm.prisma.card.create({
      data: {
        name: `TeamCard1${suffix}`,
        rarity: 'RARE',
        dropWeight: 10,
        setId: set.id,
        baseHp: 200,
        baseAtk: 20,
        baseDef: 10,
        baseSpd: 100,
      },
    })
    const card2 = await postgresOrm.prisma.card.create({
      data: {
        name: `TeamCard2${suffix}`,
        rarity: 'EPIC',
        dropWeight: 5,
        setId: set.id,
        baseHp: 320,
        baseAtk: 32,
        baseDef: 16,
        baseSpd: 105,
        passiveKey: 'BANNER',
      },
    })

    const reg = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username, email, password },
    })
    expect(reg.statusCode).toBe(201)
    const user = await postgresOrm.prisma.user.update({
      where: { email },
      data: { emailVerifiedAt: new Date() },
    })

    const uc1 = await postgresOrm.prisma.userCard.create({
      data: {
        userId: user.id,
        cardId: card1.id,
        variant: 'NORMAL',
        quantity: 1,
        level: 1,
        palier: 1,
      },
    })
    const uc2 = await postgresOrm.prisma.userCard.create({
      data: {
        userId: user.id,
        cardId: card2.id,
        variant: 'HOLOGRAPHIC',
        quantity: 1,
        level: 5,
        palier: 2,
      },
    })
    userCard1Id = uc1.id
    userCard2Id = uc2.id

    // Other user
    const other = await postgresOrm.prisma.user.create({
      data: {
        email: `team-other${suffix}@test.com`,
        username: `team-other${suffix}`,
        emailVerifiedAt: new Date(),
      },
    })
    const otherUc = await postgresOrm.prisma.userCard.create({
      data: {
        userId: other.id,
        cardId: card1.id,
        variant: 'NORMAL',
        quantity: 1,
        level: 1,
        palier: 1,
      },
    })
    otherUserCardId = otherUc.id

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

  it('GET /combat/team — empty by default', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/combat/team',
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ team: [] })
  })

  it('PUT /combat/team — sets 2 owned cards and returns full team with stats', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/combat/team',
      headers: { cookie: cookies, 'content-type': 'application/json' },
      payload: { userCardIds: [userCard1Id, userCard2Id] },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json() as {
      team: { userCardId: string; stats: { hp: number; atk: number } }[]
    }
    expect(body.team).toHaveLength(2)
    expect(body.team[0].userCardId).toBe(userCard1Id)
    expect(body.team[1].userCardId).toBe(userCard2Id)
    // RARE level 1 palier 1 NORMAL: hp = 200
    expect(body.team[0].stats.hp).toBe(200)
    // EPIC level 5 palier 2 HOLOGRAPHIC should be substantially boosted
    expect(body.team[1].stats.hp).toBeGreaterThan(550)
  })

  it('GET /combat/team — returns the team set in the previous test', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/combat/team',
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json() as { team: { userCardId: string }[] }
    expect(body.team.map((u) => u.userCardId)).toEqual([
      userCard1Id,
      userCard2Id,
    ])
  })

  it('PUT /combat/team — refuses empty array', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/combat/team',
      headers: { cookie: cookies, 'content-type': 'application/json' },
      payload: { userCardIds: [] },
    })
    expect(res.statusCode).toBe(400)
  })

  it('PUT /combat/team — refuses more than 3', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/combat/team',
      headers: { cookie: cookies, 'content-type': 'application/json' },
      payload: {
        userCardIds: [userCard1Id, userCard2Id, userCard1Id, userCard2Id],
      },
    })
    expect(res.statusCode).toBe(400)
  })

  it('PUT /combat/team — refuses duplicates', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/combat/team',
      headers: { cookie: cookies, 'content-type': 'application/json' },
      payload: { userCardIds: [userCard1Id, userCard1Id] },
    })
    expect(res.statusCode).toBe(400)
  })

  it("PUT /combat/team — refuses other user's card", async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/combat/team',
      headers: { cookie: cookies, 'content-type': 'application/json' },
      payload: { userCardIds: [otherUserCardId] },
    })
    expect(res.statusCode).toBe(400)
  })
})
