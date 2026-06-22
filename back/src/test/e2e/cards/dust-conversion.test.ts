import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'

import { buildTestApp } from '../../helpers/build-test-app'

describe('POST /cards/:userCardId/dust', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let cookies: string
  let userCardId: string

  const suffix = Date.now()
  const email = `dust${suffix}@test.com`
  const password = 'Password123!'
  const username = `dustuser${suffix}`

  beforeAll(async () => {
    app = await buildTestApp()
    const { postgresOrm } = (app as any).iocContainer

    const set = await postgresOrm.prisma.cardSet.create({
      data: { name: `DustSet${suffix}`, isActive: true },
    })
    const card = await postgresOrm.prisma.card.create({
      data: {
        name: `DustCard${suffix}`,
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
      data: { emailVerifiedAt: new Date(), dust: 0 },
    })

    // Create a UserCard with quantity = 3 (1 base + 2 duplicates)
    const uc = await postgresOrm.prisma.userCard.create({
      data: {
        userId: user.id,
        cardId: card.id,
        variant: 'NORMAL',
        quantity: 3,
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

  it('converts 2 duplicates of a RARE into dust', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/cards/${userCardId}/dust`,
      headers: { cookie: cookies },
      payload: { amount: 2 },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.dustEarned).toBe(80) // 2 × 40 (RARE)
    expect(body.remainingQuantity).toBe(1)
  })

  it('refuses to convert all copies (must keep 1)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/cards/${userCardId}/dust`,
      headers: { cookie: cookies },
      payload: { amount: 1 },
    })
    expect(res.statusCode).toBe(400)
  })

  it('refuses zero amount', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/cards/${userCardId}/dust`,
      headers: { cookie: cookies },
      payload: { amount: 0 },
    })
    expect(res.statusCode).toBe(400)
  })

  it("refuses someone else's UserCard", async () => {
    const { postgresOrm } = (app as any).iocContainer
    const other = await postgresOrm.prisma.user.create({
      data: {
        email: `other${suffix}@test.com`,
        username: `other${suffix}`,
        emailVerifiedAt: new Date(),
      },
    })
    const set = await postgresOrm.prisma.cardSet.findFirst({
      where: { name: `DustSet${suffix}` },
    })
    const card = await postgresOrm.prisma.card.findFirst({
      where: { setId: set!.id },
    })
    const otherUc = await postgresOrm.prisma.userCard.create({
      data: { userId: other.id, cardId: card!.id, variant: 'NORMAL', quantity: 5 },
    })

    const res = await app.inject({
      method: 'POST',
      url: `/cards/${otherUc.id}/dust`,
      headers: { cookie: cookies },
      payload: { amount: 1 },
    })
    expect(res.statusCode).toBe(404)
  })
})
