import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'
import { buildTestApp } from '../../helpers/build-test-app'
import { mondayOfUtcWeek } from '../../../main/domain/quests/quest-matching'

/**
 * Cache note: QuestsDomain caches active quests with a 60s TTL per periodKey.
 * The cache is EMPTY at app boot (new Map). Since we seed the test quest in
 * beforeAll BEFORE making any pull, the first trackInTx call triggers a cache
 * miss and loads from DB — which includes our test quest. This is deterministic
 * as long as we seed before triggering the first pull.
 */
describe('Quest progress e2e', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let cookies: string
  let questId: string
  let rewardId: string
  let userId: string

  const suffix = Date.now()
  const questKey = `test_weekly_pulls_${suffix}`
  const target = 30
  const periodKey = mondayOfUtcWeek(new Date())
  const email = `questtest${suffix}@test.com`
  const password = 'Password123!'
  const username = `questuser${suffix}`

  beforeAll(async () => {
    app = await buildTestApp()
    const { postgresOrm } = (app as any).iocContainer

    // Seed a card set + card so pulls can succeed
    const set = await postgresOrm.prisma.cardSet.create({
      data: { name: `QuestSet${suffix}`, isActive: true },
    })
    await postgresOrm.prisma.card.create({
      data: { name: `QuestCard${suffix}`, rarity: 'COMMON', dropWeight: 10, setId: set.id },
    })

    // Seed a Reward template for the quest
    const reward = await postgresOrm.prisma.reward.create({
      data: { tokens: 50, dust: 0, xp: 100 },
    })
    rewardId = reward.id

    // Seed the WEEKLY quest — do this BEFORE any pull so the cache (empty at boot) will pick it up
    const quest = await postgresOrm.prisma.quest.create({
      data: {
        key: questKey,
        name: `Test Weekly Pulls ${suffix}`,
        description: 'Test quest: complete 30 pulls',
        period: 'WEEKLY',
        criterion: { event: 'PULL_COMPLETED', target },
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
      data: { emailVerifiedAt: new Date(), tokens: 100, lastTokenAt: new Date() },
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
    // Clean up in FK order (UserReward → UserQuest → Quest → Reward)
    await postgresOrm.prisma.userReward.deleteMany({
      where: { source: 'QUEST', sourceId: { startsWith: `${questKey}:` } },
    })
    // The weekly bonus may have been granted (our quest is the only weekly one
    // in the pool → completing it completes "all" weekly quests). Remove the
    // bonus UserReward and its on-demand Reward row for this test user.
    const bonus = await postgresOrm.prisma.userReward.findFirst({
      where: {
        userId,
        source: 'QUEST',
        sourceId: `weekly-bonus:${periodKey}`,
      },
    })
    if (bonus) {
      await postgresOrm.prisma.userReward.delete({ where: { id: bonus.id } })
      await postgresOrm.prisma.reward.deleteMany({
        where: { id: bonus.rewardId },
      })
    }
    await postgresOrm.prisma.userQuest.deleteMany({ where: { questId } })
    await postgresOrm.prisma.quest.deleteMany({ where: { key: questKey } })
    await postgresOrm.prisma.reward.deleteMany({ where: { id: rewardId } })
    await app.close()
  })

  it('first pull increments quest progress to 1', async () => {
    const pullRes = await app.inject({
      method: 'POST',
      url: '/pulls',
      headers: { cookie: cookies },
    })
    expect(pullRes.statusCode).toBe(201)

    const { postgresOrm } = (app as any).iocContainer
    const uq = await postgresOrm.prisma.userQuest.findFirst({
      where: { userId, questId, periodKey },
    })
    expect(uq).not.toBeNull()
    expect(uq!.progress).toBe(1)
    expect(uq!.completed).toBe(false)
    expect(uq!.periodKey).toBe(periodKey)
  })

  it('completing the last pull marks quest done and creates UserReward', async () => {
    const { postgresOrm } = (app as any).iocContainer

    // Force progress to target-1 so next pull completes the quest
    await postgresOrm.prisma.userQuest.updateMany({
      where: { userId, questId, periodKey },
      data: { progress: target - 1 },
    })

    const pullRes = await app.inject({
      method: 'POST',
      url: '/pulls',
      headers: { cookie: cookies },
    })
    expect(pullRes.statusCode).toBe(201)

    const uq = await postgresOrm.prisma.userQuest.findFirst({
      where: { userId, questId, periodKey },
    })
    expect(uq).not.toBeNull()
    expect(uq!.progress).toBe(target)
    expect(uq!.completed).toBe(true)

    const sourceId = `${questKey}:${periodKey}`
    const ur = await postgresOrm.prisma.userReward.findUnique({
      where: {
        userId_source_sourceId: { userId, source: 'QUEST', sourceId },
      },
    })
    expect(ur).not.toBeNull()
    expect(ur!.rewardId).toBe(rewardId)
  })

  it('another pull does NOT create a duplicate UserReward (idempotence)', async () => {
    const pullRes = await app.inject({
      method: 'POST',
      url: '/pulls',
      headers: { cookie: cookies },
    })
    expect(pullRes.statusCode).toBe(201)

    const { postgresOrm } = (app as any).iocContainer
    const sourceId = `${questKey}:${periodKey}`
    const rewards = await postgresOrm.prisma.userReward.findMany({
      where: { userId, source: 'QUEST', sourceId },
    })
    expect(rewards).toHaveLength(1)
  })
})
