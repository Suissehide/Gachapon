import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'
import { buildTestApp } from '../../helpers/build-test-app'

describe('Admin users filters + export', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let adminCookies: string
  const suffix = Date.now()

  beforeAll(async () => {
    app = await buildTestApp()
    const prisma = (app as any).iocContainer.postgresOrm.prisma

    // Create admin
    await app.inject({
      method: 'POST', url: '/auth/register',
      payload: { username: `filteradmin${suffix}`, email: `filteradmin${suffix}@test.com`, password: 'Password123!' },
    })
    await prisma.user.update({
      where: { email: `filteradmin${suffix}@test.com` },
      data: { role: 'SUPER_ADMIN', emailVerifiedAt: new Date() },
    })
    const loginRes = await app.inject({
      method: 'POST', url: '/auth/login',
      payload: { email: `filteradmin${suffix}@test.com`, password: 'Password123!' },
    })
    adminCookies = loginRes.headers['set-cookie'] as string

    // Create 1 suspended user
    await app.inject({
      method: 'POST', url: '/auth/register',
      payload: { username: `filtersusp${suffix}`, email: `filtersusp${suffix}@test.com`, password: 'Password123!' },
    })
    await prisma.user.update({
      where: { email: `filtersusp${suffix}@test.com` },
      data: { suspended: true, emailVerifiedAt: new Date() },
    })
  })

  afterAll(async () => { await app.close() })

  it('GET /admin/users?status=suspended — ne retourne que les suspendus', async () => {
    const res = await app.inject({
      method: 'GET', url: '/admin/users?status=suspended',
      headers: { cookie: adminCookies },
    })
    expect(res.statusCode).toBe(200)
    for (const u of res.json().users) {
      expect(u.suspended).toBe(true)
    }
  })

  it('GET /admin/users — retourne level et lastLoginAt', async () => {
    const res = await app.inject({
      method: 'GET', url: '/admin/users',
      headers: { cookie: adminCookies },
    })
    expect(res.json().users[0]).toHaveProperty('level')
    expect(res.json().users[0]).toHaveProperty('lastLoginAt')
  })

  it('GET /admin/users/export — CSV avec header', async () => {
    const res = await app.inject({
      method: 'GET', url: '/admin/users/export',
      headers: { cookie: adminCookies },
    })
    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toContain('text/csv')
    expect(res.headers['content-disposition']).toContain('joueurs.csv')
    expect(res.body.split('\r\n')[0]).toBe(
      'id,username,email,role,statut,niveau,tokens,dust,gold,inscription,derniere_connexion',
    )
  })
})
