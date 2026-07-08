import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'
import { buildTestApp } from '../../helpers/build-test-app'

describe('Daily shop routes', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let cookies: string
  let userId: string

  const suffix = Date.now()

  beforeAll(async () => {
    app = await buildTestApp()

    // Register and verify user
    await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        username: `dailyshop${suffix}`,
        email: `dailyshop${suffix}@test.com`,
        password: 'Password123!',
      },
    })
    const { postgresOrm } = (app as any).iocContainer
    const user = await postgresOrm.prisma.user.update({
      where: { email: `dailyshop${suffix}@test.com` },
      data: { emailVerifiedAt: new Date() },
    })
    userId = user.id

    // Give dust for purchases
    await postgresOrm.prisma.user.update({
      where: { id: userId },
      data: { dust: 10000 },
    })

    // Create a card set with cards to populate the shop
    const set = await postgresOrm.prisma.cardSet.create({
      data: { name: `DailyShopTestSet${suffix}`, isActive: true },
    })
    for (const rarity of ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY']) {
      await postgresOrm.prisma.card.create({
        data: {
          setId: set.id,
          name: `${rarity}-card-${suffix}`,
          rarity,
          dropWeight: 1.0,
        },
      })
    }

    const loginRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: `dailyshop${suffix}@test.com`, password: 'Password123!' },
    })
    cookies = loginRes.headers['set-cookie'] as string
  })

  afterAll(() => app.close())

  it('GET /daily-shop — generates and returns 4 items', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/daily-shop',
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.date).toBeDefined()
    expect(body.items).toHaveLength(4)
    expect(body.items[0].card).toHaveProperty('name')
    expect(body.items[0].card).toHaveProperty('rarity')
    expect(body.items[0].card).toHaveProperty('set')
    expect(typeof body.items[0].dustPrice).toBe('number')
    expect(body.items[0].purchased).toBe(false)
    expect(typeof body.items[0].owned).toBe('boolean')
  })

  it('GET /daily-shop — returns same shop on second call', async () => {
    const res1 = await app.inject({ method: 'GET', url: '/daily-shop', headers: { cookie: cookies } })
    const res2 = await app.inject({ method: 'GET', url: '/daily-shop', headers: { cookie: cookies } })
    const body1 = res1.json()
    const body2 = res2.json()
    expect(body1.items.map((i: any) => i.id)).toEqual(body2.items.map((i: any) => i.id))
  })

  it('POST /daily-shop/:itemId/buy — 200 buys a card', async () => {
    const shopRes = await app.inject({ method: 'GET', url: '/daily-shop', headers: { cookie: cookies } })
    const shop = shopRes.json()
    const item = shop.items.find((i: any) => !i.purchased)

    const res = await app.inject({
      method: 'POST',
      url: `/daily-shop/${item.id}/buy`,
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.card).toHaveProperty('name')
    expect(typeof body.dustSpent).toBe('number')
    expect(typeof body.newDustBalance).toBe('number')
  })

  it('POST /daily-shop/:itemId/buy — 400 if already purchased', async () => {
    const shopRes = await app.inject({ method: 'GET', url: '/daily-shop', headers: { cookie: cookies } })
    const shop = shopRes.json()
    const purchased = shop.items.find((i: any) => i.purchased)
    if (!purchased) return

    const res = await app.inject({
      method: 'POST',
      url: `/daily-shop/${purchased.id}/buy`,
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(400)
  })

  it('POST /daily-shop/:itemId/buy — 404 for non-existent item', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/daily-shop/00000000-0000-0000-0000-000000000000/buy',
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(404)
  })

  it('POST /daily-shop/:itemId/buy — 402 if not enough dust', async () => {
    const { postgresOrm } = (app as any).iocContainer
    await postgresOrm.prisma.user.update({
      where: { id: userId },
      data: { dust: 0 },
    })

    const shopRes = await app.inject({ method: 'GET', url: '/daily-shop', headers: { cookie: cookies } })
    const shop = shopRes.json()
    const item = shop.items.find((i: any) => !i.purchased)
    if (!item) return

    const res = await app.inject({
      method: 'POST',
      url: `/daily-shop/${item.id}/buy`,
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(402)
  })
})
