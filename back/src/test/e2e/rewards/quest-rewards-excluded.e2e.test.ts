import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'
import { buildTestApp } from '../../helpers/build-test-app'

/**
 * E2E: QUEST-source rewards are claimed only from the /quests page, so they
 * must NOT surface in the topbar rewards flow — excluded from GET /rewards/pending,
 * from the /auth/me badge count, and from POST /rewards/claim-all — while staying
 * individually claimable via POST /rewards/:id/claim.
 */
describe('Quest rewards excluded from topbar rewards flow (e2e)', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let cookies: string
  let userId: string
  let questRewardId: string
  let achievementRewardId: string
  let questUserRewardId: string
  let achievementUserRewardId: string

  const suffix = Date.now()
  const email = `questexcl${suffix}@test.com`
  const password = 'Password123!'
  const username = `questexcl${suffix}`

  beforeAll(async () => {
    app = await buildTestApp()
    const { postgresOrm } = (app as any).iocContainer

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

    // A QUEST reward and an ACHIEVEMENT reward, both pending (claimedAt null).
    const questReward = await postgresOrm.prisma.reward.create({
      data: { tokens: 5, dust: 0, xp: 0, gold: 0 },
    })
    questRewardId = questReward.id
    const achievementReward = await postgresOrm.prisma.reward.create({
      data: { tokens: 0, dust: 0, xp: 0, gold: 100 },
    })
    achievementRewardId = achievementReward.id

    const questUr = await postgresOrm.prisma.userReward.create({
      data: {
        userId,
        rewardId: questReward.id,
        source: 'QUEST',
        sourceId: `quest-excl-${suffix}`,
      },
    })
    questUserRewardId = questUr.id
    const achUr = await postgresOrm.prisma.userReward.create({
      data: {
        userId,
        rewardId: achievementReward.id,
        source: 'ACHIEVEMENT',
        sourceId: `ach-excl-${suffix}`,
      },
    })
    achievementUserRewardId = achUr.id
  })

  afterAll(async () => {
    const { postgresOrm } = (app as any).iocContainer
    await postgresOrm.prisma.userReward.deleteMany({ where: { userId } })
    await postgresOrm.prisma.reward.deleteMany({
      where: { id: { in: [questRewardId, achievementRewardId].filter(Boolean) } },
    })
    await app.close()
  })

  it('GET /rewards/pending — excludes the QUEST reward, keeps the ACHIEVEMENT one', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/rewards/pending',
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json() as Array<{ id: string; source: string }>

    const ids = body.map((r) => r.id)
    expect(ids).toContain(achievementUserRewardId)
    expect(ids).not.toContain(questUserRewardId)
    expect(body.every((r) => r.source !== 'QUEST')).toBe(true)
  })

  it('GET /auth/me — pendingRewardsCount matches the (quest-free) pending list', async () => {
    // The badge count must equal what the popup shows: both exclude QUEST. If
    // the count filter were missing, the count would exceed the list length
    // (which excludes the quest) by one.
    const listRes = await app.inject({
      method: 'GET',
      url: '/rewards/pending',
      headers: { cookie: cookies },
    })
    const pendingCount = (listRes.json() as unknown[]).length

    const meRes = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { cookie: cookies },
    })
    expect(meRes.statusCode).toBe(200)
    expect(meRes.json().pendingRewardsCount).toBe(pendingCount)
  })

  it('POST /rewards/claim-all — does not claim the QUEST reward (still pending after)', async () => {
    const { postgresOrm } = (app as any).iocContainer

    const res = await app.inject({
      method: 'POST',
      url: '/rewards/claim-all',
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)

    const quest = await postgresOrm.prisma.userReward.findUnique({
      where: { id: questUserRewardId },
    })
    expect(quest?.claimedAt).toBeNull()
    const ach = await postgresOrm.prisma.userReward.findUnique({
      where: { id: achievementUserRewardId },
    })
    expect(ach?.claimedAt).not.toBeNull()
  })

  it('POST /rewards/:id/claim — the QUEST reward is still claimable individually', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/rewards/${questUserRewardId}/claim`,
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)

    const { postgresOrm } = (app as any).iocContainer
    const quest = await postgresOrm.prisma.userReward.findUnique({
      where: { id: questUserRewardId },
    })
    expect(quest?.claimedAt).not.toBeNull()
  })
})
