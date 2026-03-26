// back/src/test/e2e/admin/admin-quests.test.ts
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'
import { buildTestApp } from '../../helpers/build-test-app'

describe('Admin quests routes', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let adminCookies: string
  let questId: string
  const suffix = Date.now()

  beforeAll(async () => {
    app = await buildTestApp()
    const res = await app.inject({
      method: 'POST', url: '/auth/register',
      payload: { username: `questadmin${suffix}`, email: `questadmin${suffix}@test.com`, password: 'Password123!' },
    })
    adminCookies = res.headers['set-cookie'] as string
    await (app as any).iocContainer.postgresOrm.prisma.user.update({
      where: { email: `questadmin${suffix}@test.com` }, data: { role: 'SUPER_ADMIN' },
    })
    const loginRes = await app.inject({
      method: 'POST', url: '/auth/login',
      payload: { email: `questadmin${suffix}@test.com`, password: 'Password123!' },
    })
    adminCookies = loginRes.headers['set-cookie'] as string
  })

  afterAll(async () => { await app.close() })

  it('POST /admin/quests — crée une quête', async () => {
    const res = await app.inject({
      method: 'POST', url: '/admin/quests',
      headers: { cookie: adminCookies },
      payload: { key: `quest_${suffix}`, name: 'Test Quest', description: 'desc', criterion: { type: 'pulls', count: 5 } },
    })
    expect(res.statusCode).toBe(201)
    questId = res.json().id
  })

  it('GET /admin/quests — liste toutes les quêtes', async () => {
    const res = await app.inject({ method: 'GET', url: '/admin/quests', headers: { cookie: adminCookies } })
    expect(res.statusCode).toBe(200)
    expect(res.json().quests.some((q: { id: string }) => q.id === questId)).toBe(true)
  })

  it('PATCH /admin/quests/:id — modifie une quête', async () => {
    const res = await app.inject({
      method: 'PATCH', url: `/admin/quests/${questId}`,
      headers: { cookie: adminCookies },
      payload: { name: 'Updated Quest' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().name).toBe('Updated Quest')
  })

  it('DELETE /admin/quests/:id — supprime une quête', async () => {
    const res = await app.inject({ method: 'DELETE', url: `/admin/quests/${questId}`, headers: { cookie: adminCookies } })
    expect(res.statusCode).toBe(204)
  })
})
