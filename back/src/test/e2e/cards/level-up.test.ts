import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'

import { buildTestApp } from '../../helpers/build-test-app'

describe('POST /cards/:userCardId/level-up', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let cookies: string
  let userCardId: string
  let userId: string

  const suffix = Date.now()
  const email = `lvlup${suffix}@test.com`
  const password = 'Password123!'
  const username = `lvlupuser${suffix}`

  beforeAll(async () => {
    app = await buildTestApp()
    const { postgresOrm } = (app as any).iocContainer

    const set = await postgresOrm.prisma.cardSet.create({
      data: { name: `LvlSet${suffix}`, isActive: false },
    })
    const card = await postgresOrm.prisma.card.create({
      data: {
        name: `LvlCard${suffix}`,
        rarity: 'RARE',
        dropWeight: 10,
        setId: set.id,
        baseHp: 200,
        baseAtk: 20,
        baseDef: 10,
        baseSpd: 100,
      },
    })

    const reg = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username, email, password },
    })
    expect(reg.statusCode).toBe(201)

    const user = await postgresOrm.prisma.user.update({
      where: { email },
      data: {
        emailVerifiedAt: new Date(),
        gold: 10000,
        dust: 10000,
      },
    })
    userId = user.id

    const uc = await postgresOrm.prisma.userCard.create({
      data: {
        userId: user.id,
        cardId: card.id,
        variant: 'NORMAL',
        quantity: 1,
        level: 1,
        palier: 1,
      },
    })
    userCardId = uc.id

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

  it('levels up a RARE card from 1 to 3', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/cards/${userCardId}/level-up`,
      headers: { cookie: cookies },
      payload: { targetLevel: 3 },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.newLevel).toBe(3)
    expect(body.goldSpent).toBe(35) // 9 (1→2) + 26 (2→3)
    expect(body.dustSpent).toBe(3) // 1 (1→2) + 2 (2→3)
    expect(body.newGold).toBe(10000 - 35)
    expect(body.newDust).toBe(10000 - 3)
  })

  it('refuses targetLevel beyond palier 1 cap (10)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/cards/${userCardId}/level-up`,
      headers: { cookie: cookies },
      payload: { targetLevel: 11 },
    })
    expect(res.statusCode).toBe(400)
  })

  it('refuses targetLevel <= currentLevel', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/cards/${userCardId}/level-up`,
      headers: { cookie: cookies },
      payload: { targetLevel: 3 },
    })
    expect(res.statusCode).toBe(400)
  })

  it('refuses when not enough gold', async () => {
    const { postgresOrm } = (app as any).iocContainer
    await postgresOrm.prisma.user.update({
      where: { id: userId },
      data: { gold: 0 },
    })

    const res = await app.inject({
      method: 'POST',
      url: `/cards/${userCardId}/level-up`,
      headers: { cookie: cookies },
      payload: { targetLevel: 5 },
    })
    expect(res.statusCode).toBe(402)
  })

  it("refuses someone else's UserCard", async () => {
    const { postgresOrm } = (app as any).iocContainer
    const other = await postgresOrm.prisma.user.create({
      data: {
        email: `lvl-other${suffix}@test.com`,
        username: `lvl-other${suffix}`,
        emailVerifiedAt: new Date(),
      },
    })
    const set = await postgresOrm.prisma.cardSet.findFirst({
      where: { name: `LvlSet${suffix}` },
    })
    const card = await postgresOrm.prisma.card.findFirst({
      where: { setId: set!.id },
    })
    const otherUc = await postgresOrm.prisma.userCard.create({
      data: {
        userId: other.id,
        cardId: card!.id,
        variant: 'NORMAL',
        quantity: 1,
        level: 1,
        palier: 1,
      },
    })

    const res = await app.inject({
      method: 'POST',
      url: `/cards/${otherUc.id}/level-up`,
      headers: { cookie: cookies },
      payload: { targetLevel: 5 },
    })
    expect(res.statusCode).toBe(404)
  })

  it('Artisan 15 % : dustSpent remisé, goldSpent NON remisé (LEGENDARY 1→5)', async () => {
    const { postgresOrm } = (app as any).iocContainer

    // Seed skill: UPGRADE_DUST_DISCOUNT effect 15
    const branch = await postgresOrm.prisma.skillBranch.create({
      data: {
        name: `Artisan${suffix}`,
        description: 'Test branch',
        icon: 'hammer',
        color: '#10b981',
        order: 98,
      },
    })
    const node = await postgresOrm.prisma.skillNode.create({
      data: {
        branchId: branch.id,
        name: 'Artisan Lv1',
        description: 'Remise dust upgrade',
        icon: 'hammer',
        maxLevel: 1,
        effectType: 'UPGRADE_DUST_DISCOUNT',
        posX: 0,
        posY: 0,
        levels: { create: [{ level: 1, effect: 15 }] },
      },
    })
    await postgresOrm.prisma.userSkill.create({
      data: { userId, nodeId: node.id, level: 1 },
    })

    // Create a LEGENDARY card + UserCard at level 1, palier 1
    const set2 = await postgresOrm.prisma.cardSet.create({
      data: { name: `ArtisanSet${suffix}`, isActive: false },
    })
    const legendCard = await postgresOrm.prisma.card.create({
      data: {
        name: `ArtisanCard${suffix}`,
        rarity: 'LEGENDARY',
        dropWeight: 1,
        setId: set2.id,
        baseHp: 500,
        baseAtk: 50,
        baseDef: 30,
        baseSpd: 80,
      },
    })
    const artisanUc = await postgresOrm.prisma.userCard.create({
      data: {
        userId,
        cardId: legendCard.id,
        variant: 'NORMAL',
        quantity: 1,
        level: 1,
        palier: 1,
      },
    })

    // Give the user plenty of gold and dust
    await postgresOrm.prisma.user.update({
      where: { id: userId },
      data: { gold: 100000, dust: 100000 },
    })

    // Expected costs for LEGENDARY 1→5 (defaults: dustBase=0.5, dustExp=1.4, goldBase=5, goldExp=1.6, rarityMult=3.0)
    // raw dust = sum Math.round(0.5 * n^1.4 * 3) for n=1..4 = 2+4+7+10 = 23
    // discounted dust = Math.round(23 * 0.85) = 20
    // raw gold = sum Math.round(5 * n^1.6 * 3) for n=1..4 = 15+45+87+138 = 285 (no discount)
    const expectedRawDust = 23
    const expectedDustSpent = Math.round(expectedRawDust * 0.85) // 20
    const expectedGoldSpent = 285

    const res = await app.inject({
      method: 'POST',
      url: `/cards/${artisanUc.id}/level-up`,
      headers: { cookie: cookies },
      payload: { targetLevel: 5 },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.dustSpent).toBe(expectedDustSpent) // 20, not 23
    expect(body.goldSpent).toBe(expectedGoldSpent) // 285, not discounted

    // Cleanup
    await postgresOrm.prisma.userSkill.delete({ where: { userId_nodeId: { userId, nodeId: node.id } } })
    await postgresOrm.prisma.skillNode.delete({ where: { id: node.id } })
    await postgresOrm.prisma.skillBranch.delete({ where: { id: branch.id } })
  })
})
