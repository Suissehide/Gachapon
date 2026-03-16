// back/src/test/e2e/admin/admin-guard.test.ts
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'
import { buildTestApp } from '../../helpers/build-test-app'

describe('Admin guard', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let userCookies: string
  let adminCookies: string

  const suffix = Date.now()

  beforeAll(async () => {
    app = await buildTestApp()

    // Créer un user normal
    const userRes = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username: `user${suffix}`, email: `user${suffix}@test.com`, password: 'Password123!' },
    })
    userCookies = userRes.headers['set-cookie'] as string

    // Créer un admin
    const adminRes = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username: `admin${suffix}`, email: `admin${suffix}@test.com`, password: 'Password123!' },
    })
    const { postgresOrm } = (app as any).iocContainer
    await postgresOrm.prisma.user.update({
      where: { email: `admin${suffix}@test.com` },
      data: { role: 'SUPER_ADMIN' },
    })
    // Re-login after role promotion to get a JWT with the updated role
    const adminLoginRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: `admin${suffix}@test.com`, password: 'Password123!' },
    })
    adminCookies = adminLoginRes.headers['set-cookie'] as string
  })

  afterAll(async () => { await app.close() })

  it('GET /admin/users — 403 pour un USER', async () => {
    const res = await app.inject({ method: 'GET', url: '/admin/users', headers: { cookie: userCookies } })
    expect(res.statusCode).toBe(403)
  })

  it('GET /admin/users — 401 sans auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/admin/users' })
    expect(res.statusCode).toBe(401)
  })

  it('GET /admin/users — 200 pour un SUPER_ADMIN', async () => {
    const res = await app.inject({ method: 'GET', url: '/admin/users', headers: { cookie: adminCookies } })
    expect(res.statusCode).toBe(200)
  })
})
