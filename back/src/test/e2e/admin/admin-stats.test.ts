// back/src/test/e2e/admin/admin-stats.test.ts
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'
import { buildTestApp } from '../../helpers/build-test-app'

describe('Admin stats routes', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let adminCookies: string
  const suffix = Date.now()

  beforeAll(async () => {
    app = await buildTestApp()
    const res = await app.inject({
      method: 'POST', url: '/auth/register',
      payload: { username: `stats${suffix}`, email: `stats${suffix}@test.com`, password: 'Password123!' },
    })
    adminCookies = res.headers['set-cookie'] as string
    await (app as any).iocContainer.postgresOrm.prisma.user.update({
      where: { email: `stats${suffix}@test.com` }, data: { role: 'SUPER_ADMIN', emailVerifiedAt: new Date() },
    })
    // Re-login to get JWT with SUPER_ADMIN role
    const loginRes = await app.inject({
      method: 'POST', url: '/auth/login',
      payload: { email: `stats${suffix}@test.com`, password: 'Password123!' },
    })
    adminCookies = loginRes.headers['set-cookie'] as string
  })

  afterAll(async () => { await app.close() })

  it('GET /admin/dashboard — retourne KPIs + series', async () => {
    const res = await app.inject({ method: 'GET', url: '/admin/dashboard', headers: { cookie: adminCookies } })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body).toHaveProperty('kpis')
    expect(body.kpis).toHaveProperty('totalUsers')
    expect(body.kpis).toHaveProperty('pullsToday')
    expect(body).toHaveProperty('pullsSeries')
    expect(Array.isArray(body.pullsSeries)).toBe(true)
  })

  it('GET /admin/stats — retourne rarityDrift + neverPulledCards + activeUsers + upgradeDistribution', async () => {
    const res = await app.inject({ method: 'GET', url: '/admin/stats', headers: { cookie: adminCookies } })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body).toHaveProperty('rarityDrift')
    expect(body).toHaveProperty('neverPulledCards')
    expect(body).toHaveProperty('activeUsers')
    expect(body).toHaveProperty('upgradeDistribution')
  })
})
