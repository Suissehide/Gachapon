import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'

import { buildTestApp } from '../../helpers/build-test-app'

describe('POST /cards/:userCardId/ascend', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let cookies: string
  let userCardId: string
  let cardId: string

  const suffix = Date.now()
  const email = `ascend${suffix}@test.com`
  const password = 'Password123!'
  const username = `ascenduser${suffix}`

  beforeAll(async () => {
    app = await buildTestApp()
    const { postgresOrm } = (app as any).iocContainer

    const set = await postgresOrm.prisma.cardSet.create({
      data: { name: `AscendSet${suffix}`, isActive: false },
    })
    const card = await postgresOrm.prisma.card.create({
      data: {
        name: `AscendCard${suffix}`,
        rarity: 'RARE',
        dropWeight: 10,
        setId: set.id,
        baseHp: 200,
        baseAtk: 20,
        baseDef: 10,
        baseSpd: 100,
      },
    })
    cardId = card.id

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

    const uc = await postgresOrm.prisma.userCard.create({
      data: {
        userId: user.id,
        cardId: card.id,
        variant: 'NORMAL',
        quantity: 3,
        level: 10, // at top of palier 1
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

  it('ascends from palier 1 to 2 (consumes 1 doublon)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/cards/${userCardId}/ascend`,
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.newPalier).toBe(2)
    expect(body.doublonsSpent).toBe(1)
    expect(body.remainingQuantity).toBe(2)
  })

  it('refuses ascending from below top of palier', async () => {
    const { postgresOrm } = (app as any).iocContainer

    // Reset our UserCard to the middle of palier 1
    await postgresOrm.prisma.userCard.update({
      where: { id: userCardId },
      data: { level: 5, palier: 1, quantity: 3 },
    })

    const res = await app.inject({
      method: 'POST',
      url: `/cards/${userCardId}/ascend`,
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(400)
  })

  it('refuses ascending when no doublons (quantity == 1)', async () => {
    const { postgresOrm } = (app as any).iocContainer
    await postgresOrm.prisma.userCard.update({
      where: { id: userCardId },
      data: { quantity: 1, level: 20, palier: 2 },
    })

    const res = await app.inject({
      method: 'POST',
      url: `/cards/${userCardId}/ascend`,
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(400)
  })

  it('refuses ascending when already at max palier (6)', async () => {
    const { postgresOrm } = (app as any).iocContainer
    await postgresOrm.prisma.userCard.update({
      where: { id: userCardId },
      data: { quantity: 5, level: 60, palier: 6 },
    })

    const res = await app.inject({
      method: 'POST',
      url: `/cards/${userCardId}/ascend`,
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(400)
  })

  it("refuses someone else's UserCard", async () => {
    const { postgresOrm } = (app as any).iocContainer
    const other = await postgresOrm.prisma.user.create({
      data: {
        email: `ascend-other${suffix}@test.com`,
        username: `ascend-other${suffix}`,
        emailVerifiedAt: new Date(),
      },
    })
    const otherUc = await postgresOrm.prisma.userCard.create({
      data: {
        userId: other.id,
        cardId,
        variant: 'NORMAL',
        quantity: 3,
        level: 10,
        palier: 1,
      },
    })
    const res = await app.inject({
      method: 'POST',
      url: `/cards/${otherUc.id}/ascend`,
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(404)
  })
})
