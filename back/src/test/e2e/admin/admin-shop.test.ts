// back/src/test/e2e/admin/admin-shop.test.ts
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'
import { buildTestApp } from '../../helpers/build-test-app'

describe('Admin shop routes', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let adminCookies: string
  let itemId: string
  const suffix = Date.now()

  beforeAll(async () => {
    app = await buildTestApp()
    const res = await app.inject({
      method: 'POST', url: '/auth/register',
      payload: { username: `shopadmin${suffix}`, email: `shopadmin${suffix}@test.com`, password: 'Password123!' },
    })
    adminCookies = res.headers['set-cookie'] as string
    await (app as any).iocContainer.postgresOrm.prisma.user.update({
      where: { email: `shopadmin${suffix}@test.com` }, data: { role: 'SUPER_ADMIN' },
    })
    const loginRes = await app.inject({
      method: 'POST', url: '/auth/login',
      payload: { email: `shopadmin${suffix}@test.com`, password: 'Password123!' },
    })
    adminCookies = loginRes.headers['set-cookie'] as string
  })

  afterAll(async () => { await app.close() })

  it('POST /admin/shop-items — crée un item', async () => {
    const res = await app.inject({
      method: 'POST', url: '/admin/shop-items',
      headers: { cookie: adminCookies },
      payload: { name: 'Test Pack', description: 'desc', type: 'TOKEN_PACK', dustCost: 100, value: { tokens: 3 }, isActive: true },
    })
    expect(res.statusCode).toBe(201)
    itemId = res.json().id
  })

  it('GET /admin/shop-items — liste tous les items', async () => {
    const res = await app.inject({ method: 'GET', url: '/admin/shop-items', headers: { cookie: adminCookies } })
    expect(res.statusCode).toBe(200)
    expect(res.json().items.some((i: { id: string }) => i.id === itemId)).toBe(true)
  })

  it('PATCH /admin/shop-items/:id — désactive un item', async () => {
    const res = await app.inject({
      method: 'PATCH', url: `/admin/shop-items/${itemId}`,
      headers: { cookie: adminCookies },
      payload: { isActive: false },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().isActive).toBe(false)
  })

  it('DELETE /admin/shop-items/:id — supprime un item', async () => {
    const res = await app.inject({ method: 'DELETE', url: `/admin/shop-items/${itemId}`, headers: { cookie: adminCookies } })
    expect(res.statusCode).toBe(204)
  })
})
