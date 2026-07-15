// back/src/test/e2e/admin/admin-health.test.ts
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'
import { buildTestApp } from '../../helpers/build-test-app'

describe('Admin health route', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let adminCookies: string
  const suffix = Date.now()

  beforeAll(async () => {
    app = await buildTestApp()
    await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username: `health${suffix}`, email: `health${suffix}@test.com`, password: 'Password123!' },
    })
    await (app as any).iocContainer.postgresOrm.prisma.user.update({
      where: { email: `health${suffix}@test.com` },
      data: { role: 'SUPER_ADMIN', emailVerifiedAt: new Date() },
    })
    const loginRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: `health${suffix}@test.com`, password: 'Password123!' },
    })
    adminCookies = loginRes.headers['set-cookie'] as string
  })

  afterAll(async () => { await app.close() })

  it('GET /admin/health — statuts par service', async () => {
    const res = await app.inject({
      method: 'GET', url: '/admin/health', headers: { cookie: adminCookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.services.postgres.status).toBe('ok')
    expect(['ok', 'degraded', 'down']).toContain(body.services.redis.status)
    expect(['ok', 'degraded', 'down']).toContain(body.services.storage.status)
    expect(typeof body.ws.connections).toBe('number')
    expect(body.process.uptimeSeconds).toBeGreaterThan(0)
  })
})
