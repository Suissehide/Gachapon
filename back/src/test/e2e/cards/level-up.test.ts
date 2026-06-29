import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'

import { buildTestApp } from '../../helpers/build-test-app'

describe('POST /cards/:userCardId/level-up', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let cookies: string
  let userCardId: string
  let userId: string

  const suffix = Date.now()
  const email = `lvlup${suffix}@test.com`
  const password = 'Password123!'
  const username = `lvlupuser${suffix}`

  beforeAll(async () => {
    app = await buildTestApp()
    const { postgresOrm } = (app as any).iocContainer

    const set = await postgresOrm.prisma.cardSet.create({
      data: { name: `LvlSet${suffix}`, isActive: false },
    })
    const card = await postgresOrm.prisma.card.create({
      data: {
        name: `LvlCard${suffix}`,
        rarity: 'RARE',
        dropWeight: 10,
        setId: set.id,
        baseHp: 200,
        baseAtk: 20,
        baseDef: 10,
        baseSpd: 100,
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
      data: {
        emailVerifiedAt: new Date(),
        gold: 10000,
        dust: 10000,
      },
    })
    userId = user.id

    const uc = await postgresOrm.prisma.userCard.create({
      data: {
        userId: user.id,
        cardId: card.id,
        variant: 'NORMAL',
        quantity: 1,
        level: 1,
        palier: 1,
      },
    })
    userCardId = uc.id

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

  it('levels up a RARE card from 1 to 3', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/cards/${userCardId}/level-up`,
      headers: { cookie: cookies },
      payload: { targetLevel: 3 },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.newLevel).toBe(3)
    expect(body.goldSpent).toBe(35) // 9 (1→2) + 26 (2→3)
    expect(body.dustSpent).toBe(50) // 14 (1→2) + 36 (2→3)
    expect(body.newGold).toBe(10000 - 35)
    expect(body.newDust).toBe(10000 - 50)
  })

  it('refuses targetLevel beyond palier 1 cap (10)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/cards/${userCardId}/level-up`,
      headers: { cookie: cookies },
      payload: { targetLevel: 11 },
    })
    expect(res.statusCode).toBe(400)
  })

  it('refuses targetLevel <= currentLevel', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/cards/${userCardId}/level-up`,
      headers: { cookie: cookies },
      payload: { targetLevel: 3 },
    })
    expect(res.statusCode).toBe(400)
  })

  it('refuses when not enough gold', async () => {
    const { postgresOrm } = (app as any).iocContainer
    await postgresOrm.prisma.user.update({
      where: { id: userId },
      data: { gold: 0 },
    })

    const res = await app.inject({
      method: 'POST',
      url: `/cards/${userCardId}/level-up`,
      headers: { cookie: cookies },
      payload: { targetLevel: 5 },
    })
    expect(res.statusCode).toBe(402)
  })

  it("refuses someone else's UserCard", async () => {
    const { postgresOrm } = (app as any).iocContainer
    const other = await postgresOrm.prisma.user.create({
      data: {
        email: `lvl-other${suffix}@test.com`,
        username: `lvl-other${suffix}`,
        emailVerifiedAt: new Date(),
      },
    })
    const set = await postgresOrm.prisma.cardSet.findFirst({
      where: { name: `LvlSet${suffix}` },
    })
    const card = await postgresOrm.prisma.card.findFirst({
      where: { setId: set!.id },
    })
    const otherUc = await postgresOrm.prisma.userCard.create({
      data: {
        userId: other.id,
        cardId: card!.id,
        variant: 'NORMAL',
        quantity: 1,
        level: 1,
        palier: 1,
      },
    })

    const res = await app.inject({
      method: 'POST',
      url: `/cards/${otherUc.id}/level-up`,
      headers: { cookie: cookies },
      payload: { targetLevel: 5 },
    })
    expect(res.statusCode).toBe(404)
  })
})
