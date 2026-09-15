import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'

import { buildTestApp } from '../../helpers/build-test-app'
import { xpThresholds } from '../../helpers/xp-thresholds'

// Joueur 1 XP sous le niveau 2 → réclamer une récompense de 1 XP le fait
// monter → l'énergie doit être remontée au cap. Seuil dérivé de la config.
describe('Rewards claim level-up → refill énergie', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let cookies: string
  let userId: string
  const suffix = Date.now()
  const email = `rewlvl${suffix}@test.com`
  const password = 'Password123!'
  const username = `rewlvl${suffix}`

  beforeAll(async () => {
    app = await buildTestApp()
    const { postgresOrm, configService } = (app as any).iocContainer
    const prisma = postgresOrm.prisma
    const xp = await xpThresholds(configService)

    await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username, email, password },
    })
    const user = await prisma.user.update({
      where: { email },
      data: {
        emailVerifiedAt: new Date(),
        xp: xp.justBelow(2),
        combatPoints: 10,
        lastCombatPointAt: new Date(),
      },
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

  it('réclamer une récompense XP qui fait level-up remonte combatPoints au cap', async () => {
    const { postgresOrm } = (app as any).iocContainer
    const prisma = postgresOrm.prisma

    const reward = await prisma.reward.create({
      data: { tokens: 0, dust: 0, xp: 1 },
    })
    const ur = await prisma.userReward.create({
      data: {
        userId,
        rewardId: reward.id,
        source: 'QUEST',
        sourceId: `xp1-${suffix}`,
      },
    })

    const res = await app.inject({
      method: 'POST',
      url: `/rewards/${ur.id}/claim`,
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().level).toBe(2)

    const after = await prisma.user.findUnique({ where: { id: userId } })
    expect(after.combatPoints).toBe(60)
  })
})
