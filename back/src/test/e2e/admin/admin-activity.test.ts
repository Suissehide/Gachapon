// back/src/test/e2e/admin/admin-activity.test.ts
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'
import { buildTestApp } from '../../helpers/build-test-app'

describe('Admin activity routes', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let adminCookies: string
  const suffix = Date.now()

  beforeAll(async () => {
    app = await buildTestApp()
    const res = await app.inject({
      method: 'POST', url: '/auth/register',
      payload: { username: `activity${suffix}`, email: `activity${suffix}@test.com`, password: 'Password123!' },
    })
    adminCookies = res.headers['set-cookie'] as string
    await (app as any).iocContainer.postgresOrm.prisma.user.update({
      where: { email: `activity${suffix}@test.com` }, data: { role: 'SUPER_ADMIN', emailVerifiedAt: new Date() },
    })
    // Re-login to get JWT with SUPER_ADMIN role
    const loginRes = await app.inject({
      method: 'POST', url: '/auth/login',
      payload: { email: `activity${suffix}@test.com`, password: 'Password123!' },
    })
    adminCookies = loginRes.headers['set-cookie'] as string
  })

  afterAll(async () => { await app.close() })

  it('GET /admin/activity — retourne events + nextCursor', async () => {
    // Seed direct : 2 événements
    const prisma = (app as any).iocContainer.postgresOrm.prisma
    await prisma.activityEvent.createMany({
      data: [
        { type: 'USER_SIGNUP', payload: { via: 'email' } },
        { type: 'PULL_LEGENDARY', payload: { cardName: 'Dragon' } },
      ],
    })
    const res = await app.inject({
      method: 'GET',
      url: '/admin/activity?limit=1',
      headers: { cookie: adminCookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.events).toHaveLength(1)
    expect(body.nextCursor).toBeTruthy()

    const res2 = await app.inject({
      method: 'GET',
      url: `/admin/activity?limit=1&cursor=${body.nextCursor}`,
      headers: { cookie: adminCookies },
    })
    expect(res2.json().events).toHaveLength(1)
    expect(res2.json().events[0].id).not.toBe(body.events[0].id)
  })

  it('GET /admin/activity — filtre par type', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/admin/activity?type=PULL_LEGENDARY',
      headers: { cookie: adminCookies },
    })
    expect(res.statusCode).toBe(200)
    for (const e of res.json().events) {
      expect(e.type).toBe('PULL_LEGENDARY')
    }
  })
})
