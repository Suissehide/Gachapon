import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'
import { buildTestApp } from '../../helpers/build-test-app'

describe('Streak routes', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let userCookies: string
  let adminCookies: string
  const suffix = Date.now()

  beforeAll(async () => {
    app = await buildTestApp()
    const prisma = (app as any).iocContainer.postgresOrm.prisma

    // Clean up streak data from previous runs and seed fresh data
    await prisma.streakMilestone.deleteMany({})
    await prisma.reward.deleteMany({ where: { streakMilestones: { some: {} } } })

    // Seed: day=0 default reward (tokens=2, dust=3, xp=5)
    const defaultReward = await prisma.reward.create({ data: { tokens: 2, dust: 3, xp: 5 } })
    await prisma.streakMilestone.create({
      data: { day: 0, isMilestone: false, isActive: true, rewardId: defaultReward.id },
    })

    // Seed milestone days 3, 7, 14, 30
    for (const [day, tokens, dust, xp] of [
      [3, 5, 8, 10],
      [7, 10, 15, 20],
      [14, 20, 30, 40],
      [30, 50, 75, 100],
    ]) {
      const reward = await prisma.reward.create({ data: { tokens, dust, xp } })
      await prisma.streakMilestone.create({
        data: { day, isMilestone: true, isActive: true, rewardId: reward.id },
      })
    }

    // Register + verify + login — regular user
    await app.inject({
      method: 'POST', url: '/auth/register',
      payload: { username: `stk${suffix}`, email: `stk${suffix}@test.com`, password: 'Password123!' },
    })
    await prisma.user.update({
      where: { email: `stk${suffix}@test.com` }, data: { emailVerifiedAt: new Date() },
    })
    const loginRes = await app.inject({
      method: 'POST', url: '/auth/login',
      payload: { email: `stk${suffix}@test.com`, password: 'Password123!' },
    })
    userCookies = loginRes.headers['set-cookie'] as string

    // Register + verify + promote + login — admin user
    await app.inject({
      method: 'POST', url: '/auth/register',
      payload: { username: `stkadm${suffix}`, email: `stkadm${suffix}@test.com`, password: 'Password123!' },
    })
    await prisma.user.update({
      where: { email: `stkadm${suffix}@test.com` },
      data: { emailVerifiedAt: new Date(), role: 'SUPER_ADMIN' },
    })
    const adminLoginRes = await app.inject({
      method: 'POST', url: '/auth/login',
      payload: { email: `stkadm${suffix}@test.com`, password: 'Password123!' },
    })
    adminCookies = adminLoginRes.headers['set-cookie'] as string
  })

  afterAll(async () => { await app.close() })

  describe('GET /streak/summary', () => {
    it('returns 30-day array with default and milestone data', async () => {
      const res = await app.inject({
        method: 'GET', url: '/streak/summary',
        headers: { cookie: userCookies },
      })
      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(body).toHaveProperty('streakDays')
      expect(body).toHaveProperty('bestStreak')
      expect(body).toHaveProperty('default')
      expect(body.default).toHaveProperty('tokens')
      expect(body.days).toHaveLength(30)
    })

    it('marks day 3 as isMilestone = true', async () => {
      const res = await app.inject({
        method: 'GET', url: '/streak/summary',
        headers: { cookie: userCookies },
      })
      const body = res.json()
      const day3 = body.days.find((d: { day: number }) => d.day === 3)
      expect(day3?.isMilestone).toBe(true)
    })

    it('marks day 2 as isMilestone = false with default reward', async () => {
      const res = await app.inject({
        method: 'GET', url: '/streak/summary',
        headers: { cookie: userCookies },
      })
      const body = res.json()
      const day2 = body.days.find((d: { day: number }) => d.day === 2)
      expect(day2?.isMilestone).toBe(false)
      expect(day2?.tokens).toBe(body.default.tokens)
    })

    it('returns 401 without auth', async () => {
      const res = await app.inject({ method: 'GET', url: '/streak/summary' })
      expect(res.statusCode).toBe(401)
    })
  })

  describe('GET /admin/streak', () => {
    it('returns default and milestones', async () => {
      const res = await app.inject({
        method: 'GET', url: '/admin/streak',
        headers: { cookie: adminCookies },
      })
      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(body).toHaveProperty('default')
      expect(body).toHaveProperty('milestones')
      expect(Array.isArray(body.milestones)).toBe(true)
    })

    it('returns 403 for non-admin', async () => {
      const res = await app.inject({
        method: 'GET', url: '/admin/streak',
        headers: { cookie: userCookies },
      })
      expect(res.statusCode).toBe(403)
    })
  })

  describe('PATCH /admin/streak/default', () => {
    it('updates the default reward', async () => {
      const res = await app.inject({
        method: 'PATCH', url: '/admin/streak/default',
        headers: { cookie: adminCookies },
        payload: { tokens: 3 },
      })
      expect(res.statusCode).toBe(200)
      expect(res.json().tokens).toBe(3)

      // Verify GET /streak/summary reflects the new default
      const summaryRes = await app.inject({
        method: 'GET', url: '/streak/summary',
        headers: { cookie: userCookies },
      })
      expect(summaryRes.json().default.tokens).toBe(3)
    })
  })

  describe('POST /admin/streak/milestones', () => {
    it('creates a new milestone', async () => {
      const res = await app.inject({
        method: 'POST', url: '/admin/streak/milestones',
        headers: { cookie: adminCookies },
        payload: { day: 20, tokens: 15, dust: 25, xp: 35 },
      })
      expect(res.statusCode).toBe(201)
      const body = res.json()
      expect(body.day).toBe(20)
      expect(body.tokens).toBe(15)
    })

    it('returns 409 for duplicate day', async () => {
      const res = await app.inject({
        method: 'POST', url: '/admin/streak/milestones',
        headers: { cookie: adminCookies },
        payload: { day: 7, tokens: 99, dust: 99, xp: 99 },
      })
      expect(res.statusCode).toBe(409)
    })
  })

  describe('DELETE /admin/streak/milestones/:id', () => {
    it('soft-deletes a milestone; summary reverts to default reward for that day', async () => {
      // Get the day-20 milestone we created above
      const listRes = await app.inject({
        method: 'GET', url: '/admin/streak',
        headers: { cookie: adminCookies },
      })
      const milestones = listRes.json().milestones
      const day20 = milestones.find((m: { day: number }) => m.day === 20)
      expect(day20).toBeDefined()

      const delRes = await app.inject({
        method: 'DELETE', url: `/admin/streak/milestones/${day20.id}`,
        headers: { cookie: adminCookies },
      })
      expect(delRes.statusCode).toBe(204)

      // GET /streak/summary — day 20 should now use the default reward
      const summaryRes = await app.inject({
        method: 'GET', url: '/streak/summary',
        headers: { cookie: userCookies },
      })
      const day20Summary = summaryRes.json().days.find((d: { day: number }) => d.day === 20)
      expect(day20Summary?.isMilestone).toBe(false)
    })
  })
})
