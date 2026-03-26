import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'
import { buildTestApp } from '../../helpers/build-test-app'

describe('Admin scoring-config routes', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let adminCookies: string

  const suffix = Date.now()

  beforeAll(async () => {
    app = await buildTestApp()
    const res = await app.inject({
      method: 'POST', url: '/auth/register',
      payload: { username: `scoring${suffix}`, email: `scoring${suffix}@test.com`, password: 'Password123!' },
    })
    adminCookies = res.headers['set-cookie'] as string
    await (app as any).iocContainer.postgresOrm.prisma.user.update({
      where: { email: `scoring${suffix}@test.com` }, data: { role: 'SUPER_ADMIN', emailVerifiedAt: new Date() },
    })
    // Re-login to get JWT with SUPER_ADMIN role
    const loginRes = await app.inject({
      method: 'POST', url: '/auth/login',
      payload: { email: `scoring${suffix}@test.com`, password: 'Password123!' },
    })
    adminCookies = loginRes.headers['set-cookie'] as string
    // Reset scoring config to defaults before tests
    await app.inject({
      method: 'PUT',
      url: '/admin/scoring-config',
      headers: { cookie: adminCookies },
      payload: {
        commonPoints: 1,
        uncommonPoints: 3,
        rarePoints: 8,
        epicPoints: 20,
        legendaryPoints: 50,
        brilliantMultiplier: 1.5,
        holographicMultiplier: 2.0,
      },
    })
  })

  afterAll(async () => { await app.close() })

  it('GET /admin/scoring-config — returns defaults', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/admin/scoring-config',
      headers: { cookie: adminCookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.commonPoints).toBe(1)
    expect(body.uncommonPoints).toBe(3)
    expect(body.rarePoints).toBe(8)
    expect(body.epicPoints).toBe(20)
    expect(body.legendaryPoints).toBe(50)
    expect(body.brilliantMultiplier).toBe(1.5)
    expect(body.holographicMultiplier).toBe(2.0)
  })

  it('PUT /admin/scoring-config — updates values', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/admin/scoring-config',
      headers: { cookie: adminCookies },
      payload: {
        commonPoints: 2,
        uncommonPoints: 5,
        rarePoints: 10,
        epicPoints: 25,
        legendaryPoints: 60,
        brilliantMultiplier: 2.0,
        holographicMultiplier: 3.0,
      },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.commonPoints).toBe(2)
    expect(body.legendaryPoints).toBe(60)
    expect(body.holographicMultiplier).toBe(3.0)
  })

  it('PUT /admin/scoring-config — rejects negative int', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/admin/scoring-config',
      headers: { cookie: adminCookies },
      payload: {
        commonPoints: -1,
        uncommonPoints: 3,
        rarePoints: 8,
        epicPoints: 20,
        legendaryPoints: 50,
        brilliantMultiplier: 1.5,
        holographicMultiplier: 2.0,
      },
    })
    expect(res.statusCode).toBe(400)
  })

  it('PUT /admin/scoring-config — rejects multiplier below 1.0', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/admin/scoring-config',
      headers: { cookie: adminCookies },
      payload: {
        commonPoints: 1,
        uncommonPoints: 3,
        rarePoints: 8,
        epicPoints: 20,
        legendaryPoints: 50,
        brilliantMultiplier: 0.5,
        holographicMultiplier: 2.0,
      },
    })
    expect(res.statusCode).toBe(400)
  })

  it('PUT /admin/scoring-config — rejects missing field', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/admin/scoring-config',
      headers: { cookie: adminCookies },
      payload: {
        commonPoints: 1,
        // uncommonPoints is intentionally missing
        rarePoints: 8,
        epicPoints: 20,
        legendaryPoints: 50,
        brilliantMultiplier: 1.5,
        holographicMultiplier: 2.0,
      },
    })
    expect(res.statusCode).toBe(400)
  })

  it('GET /admin/scoring-config — returns 401 without auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/admin/scoring-config' })
    expect(res.statusCode).toBe(401)
  })
})
