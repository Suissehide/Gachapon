import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'
import { buildTestApp } from '../../helpers/build-test-app'

describe('Achievement unlock on pull', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let cookies: string
  let userId: string

  const suffix = Date.now()
  const email = `achpull${suffix}@test.com`
  const password = 'Password123!'
  const username = `achpulluser${suffix}`
  const achievementKey = `pulls_test_1_${suffix}`

  beforeAll(async () => {
    app = await buildTestApp()
    const { postgresOrm } = (app as any).iocContainer

    // Seed a card set + card so pulls can succeed
    const set = await postgresOrm.prisma.cardSet.create({
      data: { name: `AchPullSet${suffix}`, isActive: true },
    })
    await postgresOrm.prisma.card.create({
      data: { name: `AchPullCard${suffix}`, rarity: 'COMMON', dropWeight: 10, setId: set.id },
    })

    // Create an achievement with PULL_COUNT criterion, threshold=1, with a reward
    const reward = await postgresOrm.prisma.reward.create({
      data: { tokens: 5 },
    })
    await postgresOrm.prisma.achievement.create({
      data: {
        key: achievementKey,
        name: 'First Pull',
        description: 'Complete your first pull',
        criterion: { type: 'PULL_COUNT', threshold: 1 },
        isActive: true,
        rewardId: reward.id,
      },
    })

    // Register user
    const registerRes = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username, email, password },
    })
    expect(registerRes.statusCode).toBe(201)

    // Verify email + grant tokens
    const userRecord = await postgresOrm.prisma.user.update({
      where: { email },
      data: { emailVerifiedAt: new Date(), tokens: 3, lastTokenAt: new Date() },
    })
    userId = userRecord.id

    // Login to get session cookie
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

  it('POST /pulls — unlocks the PULL_COUNT achievement on first pull', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/pulls',
      headers: { cookie: cookies },
    })

    expect(res.statusCode).toBe(201)
    const body = res.json() as {
      card: { name: string; rarity: string }
      wasDuplicate: boolean
      dustEarned: number
      tokensRemaining: number
      unlockedAchievements?: Array<{ key: string; name: string }>
    }

    expect(body).toHaveProperty('unlockedAchievements')
    expect(Array.isArray(body.unlockedAchievements)).toBe(true)

    const unlocked = body.unlockedAchievements ?? []
    const found = unlocked.find((a) => a.key === achievementKey)
    expect(found).toBeDefined()
    expect(found?.key).toBe(achievementKey)
  })

  it('UserReward table has a row with source=ACHIEVEMENT after the pull', async () => {
    const { postgresOrm } = (app as any).iocContainer
    const userReward = await postgresOrm.prisma.userReward.findFirst({
      where: { userId, source: 'ACHIEVEMENT' },
    })
    expect(userReward).not.toBeNull()
    expect(userReward?.source).toBe('ACHIEVEMENT')
  })
})
