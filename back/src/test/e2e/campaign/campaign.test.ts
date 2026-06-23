import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'

import { buildTestApp } from '../../helpers/build-test-app'

describe('Campaign routes', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let cookies: string
  let userCardId: string
  let stage1Id: string

  const suffix = Date.now()
  const email = `camp${suffix}@test.com`
  const password = 'Password123!'
  const username = `campuser${suffix}`

  beforeAll(async () => {
    app = await buildTestApp()
    const { postgresOrm } = (app as any).iocContainer

    // Clean campaign-related tables that aren't in globalSetup TRUNCATE
    await postgresOrm.prisma.battleResult.deleteMany({})
    await postgresOrm.prisma.userCampaignProgress.deleteMany({})
    await postgresOrm.prisma.campaignStage.deleteMany({})

    // Card set + 1 high-stat card so player wins
    const set = await postgresOrm.prisma.cardSet.create({
      data: { name: `CampSet${suffix}`, isActive: true },
    })
    const card = await postgresOrm.prisma.card.create({
      data: {
        name: `CampCard${suffix}`,
        rarity: 'LEGENDARY',
        dropWeight: 1,
        setId: set.id,
        baseHp: 5000,
        baseAtk: 500,
        baseDef: 100,
        baseSpd: 200,
      },
    })

    // Some equipment to allow firstClear drop to succeed across rarities
    await postgresOrm.prisma.equipment.create({
      data: {
        name: `CampEqC${suffix}`,
        slot: 'WEAPON',
        rarity: 'COMMON',
        bonuses: { atkFlat: 1 },
        dropWeight: 10,
      },
    })
    await postgresOrm.prisma.equipment.create({
      data: {
        name: `CampEqU${suffix}`,
        slot: 'WEAPON',
        rarity: 'UNCOMMON',
        bonuses: { atkFlat: 2 },
        dropWeight: 10,
      },
    })
    await postgresOrm.prisma.equipment.create({
      data: {
        name: `CampEqR${suffix}`,
        slot: 'WEAPON',
        rarity: 'RARE',
        bonuses: { atkFlat: 5 },
        dropWeight: 10,
      },
    })
    await postgresOrm.prisma.equipment.create({
      data: {
        name: `CampEqE${suffix}`,
        slot: 'WEAPON',
        rarity: 'EPIC',
        bonuses: { atkFlat: 20 },
        dropWeight: 1,
      },
    })
    await postgresOrm.prisma.equipment.create({
      data: {
        name: `CampEqL${suffix}`,
        slot: 'WEAPON',
        rarity: 'LEGENDARY',
        bonuses: { atkFlat: 50 },
        dropWeight: 1,
      },
    })

    // Stage 1-1 with very weak enemies so the player wins instantly
    const stage = await postgresOrm.prisma.campaignStage.create({
      data: {
        chapter: 1,
        index: 1,
        label: '1-1',
        isBoss: false,
        order: 1,
        enemyTeam: [
          {
            baseHp: 10,
            baseAtk: 1,
            baseDef: 0,
            baseSpd: 50,
            level: 1,
            palier: 1,
            attackPattern: 'BASIC',
          },
        ],
        lootTable: {
          firstClear: {
            gold: 200,
            dust: 50,
            xp: 30,
            guaranteedEquipment: { minRarity: 'RARE' },
            guaranteedCard: null,
          },
          farm: {
            gold: 20,
            dust: 3,
            xp: 3,
            equipmentDropChance: 0.0,
            equipmentWeights: { COMMON: 100 },
            cardChance: 0.0,
          },
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
      data: { emailVerifiedAt: new Date() },
    })

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
    userCardId = uc.id

    const loginRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email, password },
    })
    cookies = loginRes.headers['set-cookie'] as string

    // Deploy team
    const teamRes = await app.inject({
      method: 'PUT',
      url: '/combat/team',
      headers: { cookie: cookies, 'content-type': 'application/json' },
      payload: { userCardIds: [userCardId] },
    })
    expect(teamRes.statusCode).toBe(200)
  })

  afterAll(async () => {
    await app.close()
  })

  it('GET /campaign — returns stage 1-1 as current', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/campaign',
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json() as {
      highestChapter: number
      highestIndex: number
      chapters: { chapter: number; stages: { id: string; status: string }[] }[]
    }
    expect(body.highestChapter).toBe(1)
    expect(body.highestIndex).toBe(0)
    const stage = body.chapters
      .flatMap((c) => c.stages)
      .find((s) => s.id === stage1Id)
    expect(stage?.status).toBe('current')
  })

  it('POST /battle — wins stage 1 with firstClear rewards', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/campaign/stages/${stage1Id}/battle`,
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json() as {
      won: boolean
      rewards: { isFirstClear: boolean; gold: number; dust: number; xp: number } | null
    }
    expect(body.won).toBe(true)
    expect(body.rewards?.isFirstClear).toBe(true)
    expect(body.rewards?.gold).toBe(200)
    expect(body.rewards?.dust).toBe(50)
    expect(body.rewards?.xp).toBe(30)
  })

  it('GET /campaign after first clear — stage marked cleared', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/campaign',
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json() as {
      highestIndex: number
      chapters: { stages: { id: string; status: string }[] }[]
    }
    expect(body.highestIndex).toBe(1)
    const stage = body.chapters
      .flatMap((c) => c.stages)
      .find((s) => s.id === stage1Id)
    expect(stage?.status).toBe('cleared')
  })

  it('POST /battle on cleared stage — farm rewards', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/campaign/stages/${stage1Id}/battle`,
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json() as {
      won: boolean
      rewards: { isFirstClear: boolean; gold: number } | null
    }
    expect(body.won).toBe(true)
    expect(body.rewards?.isFirstClear).toBe(false)
    expect(body.rewards?.gold).toBe(20)
  })

  it('POST /sweep — 3 runs of farm rewards', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/campaign/stages/${stage1Id}/sweep`,
      headers: { cookie: cookies, 'content-type': 'application/json' },
      payload: { runs: 3 },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json() as {
      runs: number
      totalGold: number
      totalDust: number
      totalXp: number
    }
    expect(body.runs).toBe(3)
    expect(body.totalGold).toBe(60)
    expect(body.totalDust).toBe(9)
    expect(body.totalXp).toBe(9)
  })

  it('POST /battle — refuses 400 when no team deployed', async () => {
    const { postgresOrm } = (app as any).iocContainer
    const noTeamEmail = `noteam${suffix}@test.com`
    const reg = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        username: `noTeam${suffix}`,
        email: noTeamEmail,
        password,
      },
    })
    expect(reg.statusCode).toBe(201)
    await postgresOrm.prisma.user.update({
      where: { email: noTeamEmail },
      data: { emailVerifiedAt: new Date() },
    })
    const loginRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: noTeamEmail, password },
    })
    const noTeamCookies = loginRes.headers['set-cookie'] as string

    const res = await app.inject({
      method: 'POST',
      url: `/campaign/stages/${stage1Id}/battle`,
      headers: { cookie: noTeamCookies },
    })
    expect(res.statusCode).toBe(400)
  })

  it('POST /sweep — refuses uncleared stage with 403', async () => {
    const { postgresOrm } = (app as any).iocContainer
    const noClearEmail = `noclear${suffix}@test.com`
    const reg = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        username: `noClear${suffix}`,
        email: noClearEmail,
        password,
      },
    })
    expect(reg.statusCode).toBe(201)
    await postgresOrm.prisma.user.update({
      where: { email: noClearEmail },
      data: { emailVerifiedAt: new Date() },
    })
    const loginRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: noClearEmail, password },
    })
    const noClearCookies = loginRes.headers['set-cookie'] as string

    const res = await app.inject({
      method: 'POST',
      url: `/campaign/stages/${stage1Id}/sweep`,
      headers: { cookie: noClearCookies, 'content-type': 'application/json' },
      payload: { runs: 1 },
    })
    expect(res.statusCode).toBe(403)
  })
})
