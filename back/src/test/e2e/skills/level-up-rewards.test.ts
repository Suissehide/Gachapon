import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'

import { buildTestApp } from '../../helpers/build-test-app'
import { xpThresholds } from '../../helpers/xp-thresholds'
import { skillPointsGained } from '../../../main/domain/shared/level-rewards'

// Le joueur part 1 XP sous le niveau 2 et reçoit EXACTEMENT de quoi atteindre
// le niveau 10 — les deux bornes sont dérivées de la config (`xpThresholds`),
// jamais écrites en dur : ce test mesure les points de compétence et la
// récompense de palier, pas la courbe d'XP.
// skillPointsGained(1, 10) = 9 niveaux + 2 bonus de palier = 11

describe('Level-up: skillPoints + milestone UserReward (claimOne)', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let cookies: string
  let userId: string
  let xp: Awaited<ReturnType<typeof xpThresholds>>

  const suffix = Date.now()
  const email = `lvlskill${suffix}@test.com`
  const password = 'Password123!'
  const username = `lvlskill${suffix}`

  beforeAll(async () => {
    app = await buildTestApp()
    const { postgresOrm, configService } = (app as any).iocContainer
    const prisma = postgresOrm.prisma
    xp = await xpThresholds(configService)

    const reg = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username, email, password },
    })
    expect(reg.statusCode).toBe(201)

    // 1 XP sous le seuil du niveau 2.
    const user = await prisma.user.update({
      where: { email },
      data: { emailVerifiedAt: new Date(), xp: xp.justBelow(2) },
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

    // De quoi passer de « 1 XP sous le niveau 2 » à EXACTEMENT le niveau 10.
    const reward1 = await prisma.reward.create({
      data: {
        tokens: 0,
        dust: 0,
        xp: xp.forLevel(10) - xp.justBelow(2),
      },
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
