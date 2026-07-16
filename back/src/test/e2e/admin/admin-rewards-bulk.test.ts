import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'
import { buildTestApp } from '../../helpers/build-test-app'

describe('Admin bulk rewards', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let adminCookies: string
  let activeUserId: string
  const suffix = Date.now()

  beforeAll(async () => {
    app = await buildTestApp()
    const prisma = (app as any).iocContainer.postgresOrm.prisma

    // Create admin
    await app.inject({
      method: 'POST', url: '/auth/register',
      payload: { username: `bulkadmin${suffix}`, email: `bulkadmin${suffix}@test.com`, password: 'Password123!' },
    })
    await prisma.user.update({
      where: { email: `bulkadmin${suffix}@test.com` },
      data: { role: 'SUPER_ADMIN', emailVerifiedAt: new Date() },
    })
    const loginRes = await app.inject({
      method: 'POST', url: '/auth/login',
      payload: { email: `bulkadmin${suffix}@test.com`, password: 'Password123!' },
    })
    adminCookies = loginRes.headers['set-cookie'] as string

    // Create 1 active user
    await app.inject({
      method: 'POST', url: '/auth/register',
      payload: { username: `bulkactive${suffix}`, email: `bulkactive${suffix}@test.com`, password: 'Password123!' },
    })
    const activeUser = await prisma.user.update({
      where: { email: `bulkactive${suffix}@test.com` },
      data: { emailVerifiedAt: new Date() },
    })
    activeUserId = activeUser.id

    // Create 1 suspended user
    await app.inject({
      method: 'POST', url: '/auth/register',
      payload: { username: `bulksusp${suffix}`, email: `bulksusp${suffix}@test.com`, password: 'Password123!' },
    })
    await prisma.user.update({
      where: { email: `bulksusp${suffix}@test.com` },
      data: { suspended: true, emailVerifiedAt: new Date() },
    })
  })

  afterAll(async () => { await app.close() })

  it('POST /admin/rewards/bulk target ALL — exclut les suspendus', async () => {
    const prisma = (app as any).iocContainer.postgresOrm.prisma
    const activeCountBefore = await prisma.user.count({ where: { suspended: false } })

    const res = await app.inject({
      method: 'POST', url: '/admin/rewards/bulk',
      headers: { cookie: adminCookies },
      payload: { target: 'ALL', reward: { tokens: 5 }, message: 'Compensation' },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json().count).toBe(activeCountBefore)
    const rewards = await prisma.userReward.findMany({
      where: { source: 'ADMIN' }, include: { reward: true },
    })
    expect(rewards.length).toBeGreaterThanOrEqual(activeCountBefore)
    expect(rewards[0].reward.tokens).toBe(5)
    expect(rewards[0].reward.label).toBe('Compensation')
  })

  it('POST /admin/rewards/bulk userIds ciblés', async () => {
    const res = await app.inject({
      method: 'POST', url: '/admin/rewards/bulk',
      headers: { cookie: adminCookies },
      payload: { target: { userIds: [activeUserId] }, reward: { dust: 10 } },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json().count).toBe(1)
  })

  it('rejette une reward vide', async () => {
    const res = await app.inject({
      method: 'POST', url: '/admin/rewards/bulk',
      headers: { cookie: adminCookies },
      payload: { target: 'ALL', reward: {} },
    })
    expect(res.statusCode).toBe(400)
  })

  it('déduplique les userIds dans target.userIds', async () => {
    const res = await app.inject({
      method: 'POST', url: '/admin/rewards/bulk',
      headers: { cookie: adminCookies },
      payload: { target: { userIds: [activeUserId, activeUserId] }, reward: { gold: 15 } },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json().count).toBe(1)
  })
})
