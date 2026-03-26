// back/src/test/e2e/admin/admin-config.test.ts
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'
import { buildTestApp } from '../../helpers/build-test-app'

describe('Admin config routes', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let adminCookies: string

  const suffix = Date.now()

  beforeAll(async () => {
    app = await buildTestApp()
    const res = await app.inject({
      method: 'POST', url: '/auth/register',
      payload: { username: `cfg${suffix}`, email: `cfg${suffix}@test.com`, password: 'Password123!' },
    })
    adminCookies = res.headers['set-cookie'] as string
    await (app as any).iocContainer.postgresOrm.prisma.user.update({
      where: { email: `cfg${suffix}@test.com` }, data: { role: 'SUPER_ADMIN', emailVerifiedAt: new Date() },
    })
    // Re-login to get JWT with SUPER_ADMIN role
    const loginRes = await app.inject({
      method: 'POST', url: '/auth/login',
      payload: { email: `cfg${suffix}@test.com`, password: 'Password123!' },
    })
    adminCookies = loginRes.headers['set-cookie'] as string
  })

  afterAll(async () => { await app.close() })

  it('GET /admin/config — retourne toutes les clés', async () => {
    const res = await app.inject({ method: 'GET', url: '/admin/config', headers: { cookie: adminCookies } })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body).toHaveProperty('tokenRegenIntervalHours')
    expect(body).toHaveProperty('pityThreshold')
    expect(body).toHaveProperty('dustCommon')
  })

  it('PUT /admin/config — met à jour les clés spécifiées', async () => {
    const res = await app.inject({
      method: 'PUT', url: '/admin/config',
      headers: { cookie: adminCookies },
      payload: { dustCommon: 10 },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.updated).toContain('dustCommon')

    // Vérifier la persistance
    const getRes = await app.inject({ method: 'GET', url: '/admin/config', headers: { cookie: adminCookies } })
    expect(getRes.json().dustCommon).toBe(10)
  })
})
