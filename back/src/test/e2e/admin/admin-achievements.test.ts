// back/src/test/e2e/admin/admin-achievements.test.ts
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'
import { buildTestApp } from '../../helpers/build-test-app'

describe('Admin achievements routes', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let adminCookies: string
  let achievementId: string
  const suffix = Date.now()

  beforeAll(async () => {
    app = await buildTestApp()
    const res = await app.inject({
      method: 'POST', url: '/auth/register',
      payload: { username: `achadmin${suffix}`, email: `achadmin${suffix}@test.com`, password: 'Password123!' },
    })
    adminCookies = res.headers['set-cookie'] as string
    await (app as any).iocContainer.postgresOrm.prisma.user.update({
      where: { email: `achadmin${suffix}@test.com` }, data: { role: 'SUPER_ADMIN' },
    })
    const loginRes = await app.inject({
      method: 'POST', url: '/auth/login',
      payload: { email: `achadmin${suffix}@test.com`, password: 'Password123!' },
    })
    adminCookies = loginRes.headers['set-cookie'] as string
  })

  afterAll(async () => { await app.close() })

  it('POST /admin/achievements — crée un succès', async () => {
    const res = await app.inject({
      method: 'POST', url: '/admin/achievements',
      headers: { cookie: adminCookies },
      payload: { key: `ach_${suffix}`, name: 'Test Achievement', description: 'desc', rewardTokens: 0, rewardDust: 50 },
    })
    expect(res.statusCode).toBe(201)
    achievementId = res.json().id
  })

  it('GET /admin/achievements — liste tous les succès', async () => {
    const res = await app.inject({ method: 'GET', url: '/admin/achievements', headers: { cookie: adminCookies } })
    expect(res.statusCode).toBe(200)
    expect(res.json().achievements.some((a: { id: string }) => a.id === achievementId)).toBe(true)
  })

  it('PATCH /admin/achievements/:id — modifie un succès', async () => {
    const res = await app.inject({
      method: 'PATCH', url: `/admin/achievements/${achievementId}`,
      headers: { cookie: adminCookies },
      payload: { rewardDust: 100 },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().rewardDust).toBe(100)
  })

  it('DELETE /admin/achievements/:id — supprime un succès', async () => {
    const res = await app.inject({ method: 'DELETE', url: `/admin/achievements/${achievementId}`, headers: { cookie: adminCookies } })
    expect(res.statusCode).toBe(204)
  })
})
