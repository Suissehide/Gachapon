import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'
import { buildTestApp } from '../../helpers/build-test-app'

describe('Capsule astrale — achat en boutique', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let cookies: string
  let userId: string

  const suffix = Date.now()

  beforeAll(async () => {
    app = await buildTestApp()
    await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        username: `capsule${suffix}`,
        email: `capsule${suffix}@test.com`,
        password: 'Password123!',
      },
    })
    const { postgresOrm } = (app as any).iocContainer
    const user = await postgresOrm.prisma.user.update({
      where: { email: `capsule${suffix}@test.com` },
      data: { emailVerifiedAt: new Date() },
    })
    userId = user.id
    const loginRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: `capsule${suffix}@test.com`, password: 'Password123!' },
    })
    cookies = loginRes.headers['set-cookie'] as string
  })

  afterAll(() => app.close())

  it('GET /economy/config — expose gacha.astralPityThreshold = 300', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/economy/config',
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().gacha.astralPityThreshold).toBe(300)
  })

  it('POST /shop/:id/buy — acheter ×10 avec 4000 de poussière crédite 10 capsules', async () => {
    const { postgresOrm } = (app as any).iocContainer

    const item = await postgresOrm.prisma.shopItem.findFirst({
      where: { nameFr: '10 capsules astrales' },
    })
    expect(item).not.toBeNull()
    expect(item.cost).toBe(4000)
    expect(item.currency).toBe('DUST')

    await postgresOrm.prisma.user.update({
      where: { id: userId },
      data: { dust: 4000 },
    })

    const buyRes = await app.inject({
      method: 'POST',
      url: `/shop/${item.id}/buy`,
      headers: { cookie: cookies },
    })
    expect(buyRes.statusCode).toBe(200)
    expect(buyRes.json().newDustTotal).toBe(0)

    const capsulesRes = await app.inject({
      method: 'GET',
      url: '/capsules',
      headers: { cookie: cookies },
    })
    expect(capsulesRes.statusCode).toBe(200)
    const body = capsulesRes.json()
    expect(body.capsules).toEqual([
      { type: 'ASTRAL', quantity: 10, pityCurrent: 0, pityThreshold: 300 },
    ])
  })

  it('POST /shop/:id/buy — ×1 avec 399 de poussière → 402 economy.notEnoughDust', async () => {
    const { postgresOrm } = (app as any).iocContainer

    const item = await postgresOrm.prisma.shopItem.findFirst({
      where: { nameFr: 'Capsule astrale' },
    })
    expect(item).not.toBeNull()
    expect(item.cost).toBe(400)

    await postgresOrm.prisma.user.update({
      where: { id: userId },
      data: { dust: 399 },
    })

    const res = await app.inject({
      method: 'POST',
      url: `/shop/${item.id}/buy`,
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(402)
  })

  it('GET /capsules — sans achat, retourne une entrée ASTRAL à quantité 0', async () => {
    const { postgresOrm } = (app as any).iocContainer
    await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        username: `capsulefresh${suffix}`,
        email: `capsulefresh${suffix}@test.com`,
        password: 'Password123!',
      },
    })
    await postgresOrm.prisma.user.update({
      where: { email: `capsulefresh${suffix}@test.com` },
      data: { emailVerifiedAt: new Date() },
    })
    const loginRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: `capsulefresh${suffix}@test.com`,
        password: 'Password123!',
      },
    })
    const freshCookies = loginRes.headers['set-cookie'] as string

    const res = await app.inject({
      method: 'GET',
      url: '/capsules',
      headers: { cookie: freshCookies },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().capsules).toEqual([
      { type: 'ASTRAL', quantity: 0, pityCurrent: 0, pityThreshold: 300 },
    ])
  })
})
