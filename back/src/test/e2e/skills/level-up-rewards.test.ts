import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'

import { buildTestApp } from '../../helpers/build-test-app'
import { skillPointsGained } from '../../../main/domain/shared/level-rewards'

// XP math with defaults (base=100, slope=30):
//   xpForLevel(n) = 100*(n-1) + 30*(n-1)*(n-2)/2
//   xpForLevel(10) = 900 + 1080 = 1980
//   user starts at xp=99 (level 1), adding 1881 → total 1980 = exactly level 10
// skillPointsGained(1, 10) = 9 levels + 2 bonus (milestone at level 10) = 11

describe('Level-up: skillPoints + milestone UserReward (claimOne)', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let cookies: string
  let userId: string

  const suffix = Date.now()
  const email = `lvlskill${suffix}@test.com`
  const password = 'Password123!'
  const username = `lvlskill${suffix}`

  beforeAll(async () => {
    app = await buildTestApp()
    const { postgresOrm } = (app as any).iocContainer
    const prisma = postgresOrm.prisma

    const reg = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username, email, password },
    })
    expect(reg.statusCode).toBe(201)

    // Set xp=99: level 1, 1 XP below level 2 threshold (100)
    const user = await prisma.user.update({
      where: { email },
      data: { emailVerifiedAt: new Date(), xp: 99 },
    })
    userId = user.id

    const loginRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email, password },
    })
    cookies = loginRes.headers['set-cookie'] as string
  })

  afterAll(async () => {
    await app.close()
  })

  it('credits skillPoints and creates milestone UserReward on crossing levels 2→10', async () => {
    const { postgresOrm } = (app as any).iocContainer
    const prisma = postgresOrm.prisma

    // Reward with 1881 XP: user goes from xp=99 to xp=1980 (level 10)
    const reward1 = await prisma.reward.create({
      data: { tokens: 0, dust: 0, xp: 1881 },
    })
    const ur1 = await prisma.userReward.create({
      data: {
        userId,
        rewardId: reward1.id,
        source: 'QUEST',
        sourceId: `xp-boost-${suffix}`,
      },
    })

    const res = await app.inject({
      method: 'POST',
      url: `/rewards/${ur1.id}/claim`,
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.level).toBe(10)

    // pendingRewardsCount must reflect the milestone reward(s) just created
    expect(body.pendingRewardsCount).toBeGreaterThanOrEqual(1)

    // skillPoints should have increased by skillPointsGained(1, 10) = 11
    const userAfter = await prisma.user.findUnique({ where: { id: userId } })
    const expectedGained = skillPointsGained(1, 10) // 9 + 2 = 11
    expect(userAfter!.skillPoints).toBe(expectedGained)

    // A pending LEVEL_UP/level-10 UserReward should exist with tokens=5, dust=100
    const levelUpReward = await prisma.userReward.findFirst({
      where: { userId, source: 'LEVEL_UP', sourceId: 'level-10', claimedAt: null },
      include: { reward: true },
    })
    expect(levelUpReward).not.toBeNull()
    expect(levelUpReward!.reward.tokens).toBe(5)
    expect(levelUpReward!.reward.dust).toBe(100)
  })

  it('does not create duplicate LEVEL_UP/level-10 reward when re-claiming with no new level-up (idempotence)', async () => {
    const { postgresOrm } = (app as any).iocContainer
    const prisma = postgresOrm.prisma

    // Zero-XP reward: user stays at level 10, no milestones crossed
    const reward2 = await prisma.reward.create({
      data: { tokens: 0, dust: 0, xp: 0 },
    })
    const ur2 = await prisma.userReward.create({
      data: {
        userId,
        rewardId: reward2.id,
        source: 'QUEST',
        sourceId: `zero-xp-${suffix}`,
      },
    })

    const res = await app.inject({
      method: 'POST',
      url: `/rewards/${ur2.id}/claim`,
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)

    // Still exactly one LEVEL_UP/level-10 UserReward (the one from the first test)
    const count = await prisma.userReward.count({
      where: { userId, source: 'LEVEL_UP', sourceId: 'level-10' },
    })
    expect(count).toBe(1)
  })
})
