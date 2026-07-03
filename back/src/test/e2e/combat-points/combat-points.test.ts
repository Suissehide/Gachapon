import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'

import { buildTestApp } from '../../helpers/build-test-app'

describe('Combat points routes & debit', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let cookies: string
  let userId: string
  let stage1Id: string

  const suffix = Date.now()
  const email = `cp${suffix}@test.com`
  const password = 'Password123!'
  const username = `cpuser${suffix}`

  beforeAll(async () => {
    app = await buildTestApp()
    const { postgresOrm } = (app as any).iocContainer

    // Set + winning card
    const set = await postgresOrm.prisma.cardSet.create({
      data: { name: `CPSet${suffix}`, isActive: false },
    })
    const card = await postgresOrm.prisma.card.create({
      data: {
        name: `CPCard${suffix}`,
        rarity: 'LEGENDARY',
        dropWeight: 1,
        setId: set.id,
        baseHp: 9999,
        baseAtk: 9999,
        baseDef: 9999,
        baseSpd: 9999,
      },
    })

    // Override combat config for this test. configService.set() also
    // invalidates the Redis cache so subsequent reads see the new value
    // (a direct prisma upsert would leave stale cache entries). Battle and
    // sweep costs are pinned to 6 so the arithmetic assertions below stay
    // stable even if the global defaults change.
    const { configService } = (app as any).iocContainer
    await configService.set('combat.pointsMax', 60)
    await configService.set('combat.regenSeconds', 360)
    await configService.set('combat.battleCost', 6)
    await configService.set('combat.sweepCost', 6)

    // globalSetup does not TRUNCATE CampaignStage/BattleResult/
    // UserCampaignProgress — clear any leftovers so this test's fixed-name
    // stage can be inserted without colliding with prior runs.
    await postgresOrm.prisma.battleResult.deleteMany()
    await postgresOrm.prisma.userCampaignProgress.deleteMany()
    await postgresOrm.prisma.campaignStage.deleteMany()

    // Weak stage with easy-to-win enemy + minimal loot table
    const stage = await postgresOrm.prisma.campaignStage.create({
      data: {
        chapter: 99,
        index: 1,
        label: 'CP-1',
        isBoss: false,
        order: 9901,
        enemyTeam: [
          { baseHp: 1, baseAtk: 1, baseDef: 0, baseSpd: 1, level: 1, palier: 1, attackPattern: 'BASIC' },
        ],
        lootTable: {
          firstClear: { gold: 0, dust: 0, xp: 0 },
          farm: { gold: 0, dust: 0, xp: 0, equipmentDropChance: 0, equipmentWeights: {}, cardChance: 0 },
        },
      },
    })
    stage1Id = stage.id

    const reg = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username, email, password },
    })
    expect(reg.statusCode).toBe(201)
    const user = await postgresOrm.prisma.user.update({
      where: { email },
      // Explicitly set combatPoints to the configured max (60 for this test)
      // so the assertions don't depend on the User schema default — which
      // may evolve as the global combat.pointsMax config moves.
      data: { emailVerifiedAt: new Date(), combatPoints: 60 },
    })
    userId = user.id

    const uc = await postgresOrm.prisma.userCard.create({
      data: {
        userId: user.id,
        cardId: card.id,
        variant: 'NORMAL',
        quantity: 1,
        level: 60,
        palier: 6,
      },
    })

    const loginRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email, password },
    })
    cookies = loginRes.headers['set-cookie'] as string

    await app.inject({
      method: 'PUT',
      url: '/combat/team',
      headers: { cookie: cookies, 'content-type': 'application/json' },
      payload: { userCardIds: [uc.id] },
    })

    // CampaignProgress: pretend we already cleared up to chapter 99 stage 1 by upserting later
    await postgresOrm.prisma.userCampaignProgress.upsert({
      where: { userId },
      create: { userId, highestChapter: 99, highestIndex: 0 },
      update: { highestChapter: 99, highestIndex: 0 },
    })
  })

  afterAll(async () => {
    // Restore combat config to defaults to avoid polluting other test suites
    const { configService } = (app as any).iocContainer
    await configService.set('combat.battleCost', 5)
    await configService.set('combat.sweepCost', 5)
    await configService.set('combat.regenSeconds', 900)
    // combat.pointsMax remains 60 (was already the default)
    await app.close()
  })

  it('GET /combat/points — returns default max stock 60', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/combat/points',
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.maxStock).toBe(60)
    expect(body.combatPoints).toBe(60)
    expect(body.regenSeconds).toBe(360)
  })

  it('POST battle — debits 6 PC', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/campaign/stages/${stage1Id}/battle`,
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)

    const pcRes = await app.inject({
      method: 'GET',
      url: '/combat/points',
      headers: { cookie: cookies },
    })
    const body = pcRes.json()
    expect(body.combatPoints).toBe(54) // 60 - 6
    expect(body.nextCombatPointAt).toBeTruthy()
  })

  it('POST battle — 402 when insufficient PC', async () => {
    const { postgresOrm } = (app as any).iocContainer
    await postgresOrm.prisma.user.update({
      where: { id: userId },
      data: { combatPoints: 3, lastCombatPointAt: new Date() },
    })

    const res = await app.inject({
      method: 'POST',
      url: `/campaign/stages/${stage1Id}/battle`,
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(402)
  })

  it('POST sweep — debits 6 × runs PC', async () => {
    const { postgresOrm } = (app as any).iocContainer
    await postgresOrm.prisma.user.update({
      where: { id: userId },
      data: { combatPoints: 60, lastCombatPointAt: new Date() },
    })

    const res = await app.inject({
      method: 'POST',
      url: `/campaign/stages/${stage1Id}/sweep`,
      headers: { cookie: cookies, 'content-type': 'application/json' },
      payload: { runs: 3 },
    })
    expect(res.statusCode).toBe(200)

    const pcRes = await app.inject({
      method: 'GET',
      url: '/combat/points',
      headers: { cookie: cookies },
    })
    const body = pcRes.json()
    expect(body.combatPoints).toBe(42) // 60 - 18
  })

  it('POST sweep — 402 when insufficient PC for runs', async () => {
    const { postgresOrm } = (app as any).iocContainer
    await postgresOrm.prisma.user.update({
      where: { id: userId },
      data: { combatPoints: 5, lastCombatPointAt: new Date() },
    })

    const res = await app.inject({
      method: 'POST',
      url: `/campaign/stages/${stage1Id}/sweep`,
      headers: { cookie: cookies, 'content-type': 'application/json' },
      payload: { runs: 2 },
    })
    expect(res.statusCode).toBe(402)
  })
})
