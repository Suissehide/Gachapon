import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'

import { buildTestApp } from '../../helpers/build-test-app'

// Deux cas :
//  (a) énergie basse + xp au bord du niveau 2 → battle → level-up → refill à 60.
//  (b) énergie en overfill (100) → battle → level-up → inchangée (jamais réduite).
describe('Campaign battle level-up → refill énergie', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let stage1Id: string
  let cardId: string

  const suffix = Date.now()

  beforeAll(async () => {
    app = await buildTestApp()
    const { postgresOrm } = (app as any).iocContainer
    const prisma = postgresOrm.prisma

    // Card set + 1 high-stat card so player wins deterministically
    const set = await prisma.cardSet.create({
      data: { name: `LvlRefillSet${suffix}`, isActive: true },
    })
    const card = await prisma.card.create({
      data: {
        name: `LvlRefillCard${suffix}`,
        rarity: 'LEGENDARY',
        dropWeight: 1,
        setId: set.id,
        baseHp: 5000,
        baseAtk: 500,
        baseDef: 100,
        baseSpd: 200,
      },
    })
    cardId = card.id

    // Equipment required for firstClear guaranteedEquipment drop
    await prisma.equipment.createMany({
      data: [
        { name: `LvlRefEqC${suffix}`, slot: 'WEAPON', rarity: 'COMMON', bonuses: { atkFlat: 1 }, dropWeight: 10 },
        { name: `LvlRefEqU${suffix}`, slot: 'WEAPON', rarity: 'UNCOMMON', bonuses: { atkFlat: 2 }, dropWeight: 10 },
        { name: `LvlRefEqR${suffix}`, slot: 'WEAPON', rarity: 'RARE', bonuses: { atkFlat: 5 }, dropWeight: 10 },
        { name: `LvlRefEqE${suffix}`, slot: 'WEAPON', rarity: 'EPIC', bonuses: { atkFlat: 20 }, dropWeight: 1 },
        { name: `LvlRefEqL${suffix}`, slot: 'WEAPON', rarity: 'LEGENDARY', bonuses: { atkFlat: 50 }, dropWeight: 1 },
      ],
    })

    // Stage with very weak enemies so the player wins deterministically
    // Use upsert so repeated test runs don't hit the unique(chapter, index) constraint
    const stage = await prisma.campaignStage.upsert({
      where: { chapter_index: { chapter: 99, index: 1 } },
      update: {},
      create: {
        chapter: 99,
        index: 1,
        label: '99-1 lvlrefill',
        isBoss: false,
        order: 9901,
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
            gold: 10,
            dust: 5,
            xp: 30,
            guaranteedEquipment: { minRarity: 'RARE' },
            guaranteedCard: null,
          },
          farm: {
            gold: 5,
            dust: 1,
            xp: 30,
            equipmentDropChance: 0.0,
            equipmentWeights: { COMMON: 100 },
            cardChance: 0.0,
          },
        },
      },
    })
    stage1Id = stage.id
  })

  afterAll(async () => {
    await app.close()
  })

  const setupUser = async (
    tag: string,
    data: { xp: number; combatPoints: number },
  ) => {
    const { postgresOrm } = (app as any).iocContainer
    const prisma = postgresOrm.prisma
    const usuffix = `${suffix}${tag}`
    const email = `lvlref${usuffix}@test.com`
    const password = 'Password123!'
    await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username: `lvlref${usuffix}`, email, password },
    })
    const user = await prisma.user.update({
      where: { email },
      data: {
        emailVerifiedAt: new Date(),
        xp: data.xp,
        combatPoints: data.combatPoints,
        lastCombatPointAt: new Date(),
      },
    })
    const login = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email, password },
    })
    const cookies = login.headers['set-cookie'] as string

    // Create a high-stat userCard and deploy it so the user wins deterministically
    const uc = await prisma.userCard.create({
      data: {
        userId: user.id,
        cardId,
        variant: 'NORMAL',
        quantity: 1,
        level: 60,
        palier: 6,
      },
    })

    const teamRes = await app.inject({
      method: 'PUT',
      url: '/combat/team',
      headers: { cookie: cookies, 'content-type': 'application/json' },
      payload: { userCardIds: [uc.id] },
    })
    expect(teamRes.statusCode).toBe(200)

    // Seed progress row so chapter-99 stage is unlocked (index=1 = highestIndex+1)
    await prisma.userCampaignProgress.upsert({
      where: { userId: user.id },
      create: { userId: user.id, highestChapter: 99, highestIndex: 0 },
      update: { highestChapter: 99, highestIndex: 0 },
    })

    return { userId: user.id, cookies }
  }

  it('battle qui fait level-up remonte combatPoints au cap', async () => {
    const { postgresOrm } = (app as any).iocContainer
    const prisma = postgresOrm.prisma
    // xp juste sous le niveau 2 pour que le gain XP du combat fasse monter.
    const { userId, cookies } = await setupUser('a', {
      xp: 99,
      combatPoints: 15,
    })

    const res = await app.inject({
      method: 'POST',
      url: `/campaign/stages/${stage1Id}/battle`,
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)

    const after = await prisma.user.findUnique({ where: { id: userId } })
    expect(after.level).toBeGreaterThanOrEqual(2)
    expect(after.combatPoints).toBe(60)
  })

  it('overfill au-dessus du cap → jamais réduit par le refill', async () => {
    const { postgresOrm } = (app as any).iocContainer
    const prisma = postgresOrm.prisma
    const { userId, cookies } = await setupUser('b', {
      xp: 99,
      combatPoints: 100, // overfill (packs) au-dessus du cap 60
    })

    const before = await prisma.user.findUnique({ where: { id: userId } })
    const res = await app.inject({
      method: 'POST',
      url: `/campaign/stages/${stage1Id}/battle`,
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)

    const after = await prisma.user.findUnique({ where: { id: userId } })
    expect(after.level).toBeGreaterThanOrEqual(2)
    // Le combat coûte battleCost (5). L'énergie doit rester bien au-dessus du
    // cap (jamais remontée/rabaissée à 60) : ~ before - battleCost.
    expect(after.combatPoints).toBe(before.combatPoints - 5)
    expect(after.combatPoints).toBeGreaterThan(60)
  })
})
