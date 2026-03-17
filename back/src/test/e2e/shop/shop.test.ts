import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'
import { buildTestApp } from '../../helpers/build-test-app'

describe('Shop routes', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let cookies: string
  let userId: string

  const suffix = Date.now()

  beforeAll(async () => {
    app = await buildTestApp()
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        username: `shop${suffix}`,
        email: `shop${suffix}@test.com`,
        password: 'Password123!',
      },
    })
    cookies = res.headers['set-cookie'] as string
    userId = res.json().id
  })

  afterAll(() => app.close())

  it('GET /shop — liste les articles actifs', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/shop',
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(Array.isArray(body.items)).toBe(true)
  })

  it('POST /shop/:id/buy — 402 si pas assez de dust', async () => {
    const { postgresOrm } = (app as any).iocContainer
    const item = await postgresOrm.prisma.shopItem.findFirst({
      where: { isActive: true },
    })
    if (!item) return // Pas d'articles seedés — skip

    const res = await app.inject({
      method: 'POST',
      url: `/shop/${item.id}/buy`,
      headers: { cookie: cookies },
    })
    // L'utilisateur n'a pas de dust → 402
    expect(res.statusCode).toBe(402)
  })

  it('POST /shop/:id/buy — 200 si assez de dust', async () => {
    const { postgresOrm } = (app as any).iocContainer
    const item = await postgresOrm.prisma.shopItem.findFirst({
      where: { isActive: true },
    })
    if (!item) return // Pas d'articles seedés — skip

    // Donner du dust à l'utilisateur
    await postgresOrm.prisma.user.update({
      where: { id: userId },
      data: { dust: item.dustCost + 100 },
    })

    const res = await app.inject({
      method: 'POST',
      url: `/shop/${item.id}/buy`,
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(typeof body.newDustTotal).toBe('number')
    expect(body.newDustTotal).toBe(100)
  })

  it('POST /shop/:id/buy — 404 si article inexistant', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/shop/00000000-0000-0000-0000-000000000000/buy',
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(404)
  })
})
