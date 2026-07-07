import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'
import { buildTestApp } from '../../helpers/build-test-app'
import { mondayOfUtcWeek } from '../../../main/domain/quests/quest-matching'

/**
 * E2E tests: GET /quests (authenticated, reshuffled response shape).
 * Verifies:
 *   - 401 without auth
 *   - 200 with the new { weekly, weeklyBonus, oneshot } shape
 *   - weekly quests are lazily initialized for the user
 */
describe('GET /quests — état utilisateur e2e', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let cookies: string
  let userId: string
  let questId: string
  let rewardId: string

  const suffix = Date.now()
  const questKey = `test_weekly_state_${suffix}`
  const periodKey = mondayOfUtcWeek(new Date())
  const email = `queststate${suffix}@test.com`
  const password = 'Password123!'
  const username = `queststate${suffix}`

  beforeAll(async () => {
    app = await buildTestApp()
    const { postgresOrm } = (app as any).iocContainer

    // Seed a Reward template for the quest
    const reward = await postgresOrm.prisma.reward.create({
      data: { tokens: 50, dust: 0, xp: 100, gold: 0 },
    })
    rewardId = reward.id

    // Seed a WEEKLY quest BEFORE login (cache is empty at boot)
    const quest = await postgresOrm.prisma.quest.create({
      data: {
        key: questKey,
        name: `State Test Weekly ${suffix}`,
        description: 'State test quest',
        period: 'WEEKLY',
        criterion: { event: 'PULL_COMPLETED', target: 10 },
        isActive: true,
        rewardId: reward.id,
      },
    })
    questId = quest.id

    // Register + verify + login
    const regRes = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username, email, password },
    })
    expect(regRes.statusCode).toBe(201)

    const user = await postgresOrm.prisma.user.update({
      where: { email },
      data: { emailVerifiedAt: new Date() },
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
    const { postgresOrm } = (app as any).iocContainer
    await postgresOrm.prisma.userReward.deleteMany({
      where: { userId, source: 'QUEST' },
    })
    await postgresOrm.prisma.userQuest.deleteMany({ where: { questId } })
    await postgresOrm.prisma.quest.deleteMany({ where: { key: questKey } })
    await postgresOrm.prisma.reward.deleteMany({ where: { id: rewardId } })
    await app.close()
  })

  it('GET /quests — 401 sans authentification', async () => {
    const res = await app.inject({ method: 'GET', url: '/quests' })
    expect(res.statusCode).toBe(401)
  })

  it('GET /quests — 200 avec la forme { weekly, weeklyBonus, oneshot }', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/quests',
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()

    // Top-level shape
    expect(body).toHaveProperty('weekly')
    expect(body).toHaveProperty('weeklyBonus')
    expect(body).toHaveProperty('oneshot')
    expect(Array.isArray(body.weekly)).toBe(true)
    expect(Array.isArray(body.oneshot)).toBe(true)

    // weeklyBonus shape
    expect(body.weeklyBonus).toHaveProperty('completed')
    expect(body.weeklyBonus).toHaveProperty('reward')
    expect(body.weeklyBonus.reward).toHaveProperty('gold')
    expect(body.weeklyBonus.reward).toHaveProperty('xp')
    expect(typeof body.weeklyBonus.completed).toBe('boolean')
    expect(body.weeklyBonus.completed).toBe(false)
    expect(body.weeklyBonus).toHaveProperty('claim')
    expect(body.weeklyBonus.claim).toBeNull()

    // weekly items shape — at least our seeded quest should be present
    const seededQuest = body.weekly.find((q: { key: string }) => q.key === questKey)
    expect(seededQuest).toBeDefined()
    expect(seededQuest).toMatchObject({
      key: questKey,
      name: expect.any(String),
      description: expect.any(String),
      progress: 0,
      target: 10,
      completed: false,
    })
    // Not completed → no reward to claim yet
    expect(seededQuest).toHaveProperty('claim')
    expect(seededQuest.claim).toBeNull()
    expect(seededQuest.reward).toMatchObject({
      tokens: expect.any(Number),
      dust: expect.any(Number),
      xp: expect.any(Number),
    })
  })

  it('GET /quests — les quêtes hebdos sont initialisées en DB (lazy-init)', async () => {
    const { postgresOrm } = (app as any).iocContainer
    const uq = await postgresOrm.prisma.userQuest.findFirst({
      where: { userId, questId, periodKey },
    })
    // After calling GET /quests, the UserQuest row must exist
    expect(uq).not.toBeNull()
    expect(uq!.progress).toBe(0)
    expect(uq!.completed).toBe(false)
  })

  it('GET /quests — quête complétée → claim réclamable, puis marqué claimed après /rewards/:id/claim', async () => {
    const { postgresOrm } = (app as any).iocContainer

    // Simulate completion: mark UserQuest done + queue its pending UserReward
    // (mirrors what QuestsDomain does on the completing event).
    await postgresOrm.prisma.userQuest.updateMany({
      where: { userId, questId, periodKey },
      data: { progress: 10, completed: true, completedAt: new Date() },
    })
    const userReward = await postgresOrm.prisma.userReward.create({
      data: {
        userId,
        rewardId,
        source: 'QUEST',
        sourceId: `${questKey}:${periodKey}`,
      },
    })

    // GET /quests → the quest now exposes a claimable reward
    const before = await app
      .inject({ method: 'GET', url: '/quests', headers: { cookie: cookies } })
      .then((r) => r.json())
    const questBefore = before.weekly.find(
      (q: { key: string }) => q.key === questKey,
    )
    expect(questBefore.completed).toBe(true)
    expect(questBefore.claim).toEqual({
      rewardId: userReward.id,
      claimed: false,
    })

    // Claim it through the existing rewards endpoint
    const claimRes = await app.inject({
      method: 'POST',
      url: `/rewards/${userReward.id}/claim`,
      headers: { cookie: cookies },
    })
    expect(claimRes.statusCode).toBe(200)

    // GET /quests → same reward is now flagged as claimed
    const after = await app
      .inject({ method: 'GET', url: '/quests', headers: { cookie: cookies } })
      .then((r) => r.json())
    const questAfter = after.weekly.find(
      (q: { key: string }) => q.key === questKey,
    )
    expect(questAfter.claim).toEqual({ rewardId: userReward.id, claimed: true })
  })
})
