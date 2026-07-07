import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'
import { buildTestApp } from '../../helpers/build-test-app'

/**
 * E2E tests: gold credited on claim.
 * Verifies that claimOne and claimAll increment the user.gold column
 * and that the response reflects the gold field.
 */
describe('Rewards gold e2e', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let cookies: string
  let userId: string
  let rewardWithGoldId: string
  let userRewardId: string
  const extraRewardIds: string[] = []

  const suffix = Date.now()
  const email = `goldtest${suffix}@test.com`
  const password = 'Password123!'
  const username = `golduser${suffix}`

  beforeAll(async () => {
    app = await buildTestApp()
    const { postgresOrm } = (app as any).iocContainer

    // Register user
    const regRes = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username, email, password },
    })
    expect(regRes.statusCode).toBe(201)

    const user = await postgresOrm.prisma.user.update({
      where: { email },
      data: { emailVerifiedAt: new Date(), tokens: 10, lastTokenAt: new Date() },
    })
    userId = user.id

    const loginRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email, password },
    })
    cookies = loginRes.headers['set-cookie'] as string

    // Seed a Reward with gold: 500
    const reward = await postgresOrm.prisma.reward.create({
      data: { tokens: 0, dust: 0, xp: 0, gold: 500 },
    })
    rewardWithGoldId = reward.id

    // Assign it as a UserReward
    const ur = await postgresOrm.prisma.userReward.create({
      data: {
        userId,
        rewardId: reward.id,
        source: 'ACHIEVEMENT',
        sourceId: `gold-test-${suffix}`,
      },
    })
    userRewardId = ur.id
  })

  afterAll(async () => {
    const { postgresOrm } = (app as any).iocContainer
    // Delete userRewards first (FK constraint)
    await postgresOrm.prisma.userReward.deleteMany({ where: { userId } })
    // Then delete reward templates
    const rewardIds = [rewardWithGoldId, ...extraRewardIds].filter(Boolean)
    if (rewardIds.length > 0) {
      await postgresOrm.prisma.reward.deleteMany({ where: { id: { in: rewardIds } } })
    }
    await app.close()
  })

  it('POST /rewards/:id/claim — crédite or et le retourne dans la réponse', async () => {
    const { postgresOrm } = (app as any).iocContainer

    const before = await postgresOrm.prisma.user.findUnique({ where: { id: userId } })
    const goldBefore = before!.gold

    const res = await app.inject({
      method: 'POST',
      url: `/rewards/${userRewardId}/claim`,
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()

    // Response must include gold field
    expect(body).toHaveProperty('gold')
    expect(typeof body.gold).toBe('number')
    expect(body.gold).toBe(goldBefore + 500)

    // DB must reflect the increment
    const after = await postgresOrm.prisma.user.findUnique({ where: { id: userId } })
    expect(after!.gold).toBe(goldBefore + 500)
  })

  it('POST /rewards/claim-all — crédite or (claimAll)', async () => {
    const { postgresOrm } = (app as any).iocContainer

    // Seed two more gold rewards
    const r1 = await postgresOrm.prisma.reward.create({
      data: { tokens: 0, dust: 0, xp: 0, gold: 200 },
    })
    const r2 = await postgresOrm.prisma.reward.create({
      data: { tokens: 0, dust: 0, xp: 0, gold: 300 },
    })
    extraRewardIds.push(r1.id, r2.id)
    await postgresOrm.prisma.userReward.create({
      data: { userId, rewardId: r1.id, source: 'ACHIEVEMENT', sourceId: `gold-all-1-${suffix}` },
    })
    await postgresOrm.prisma.userReward.create({
      data: { userId, rewardId: r2.id, source: 'ACHIEVEMENT', sourceId: `gold-all-2-${suffix}` },
    })

    const before = await postgresOrm.prisma.user.findUnique({ where: { id: userId } })
    const goldBefore = before!.gold

    const res = await app.inject({
      method: 'POST',
      url: '/rewards/claim-all',
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body).toHaveProperty('gold')
    expect(body.gold).toBe(goldBefore + 200 + 300)

    const after = await postgresOrm.prisma.user.findUnique({ where: { id: userId } })
    expect(after!.gold).toBe(goldBefore + 200 + 300)
  })
})
