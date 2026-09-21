import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'

import { CAMPAIGN_TEAM_KEY } from '../../../main/domain/combat/combat-team-keys'
import { buildTestApp } from '../../helpers/build-test-app'
import { setCombatTeam } from '../../helpers/combat-team-fixture'
import { xpThresholds } from '../../helpers/xp-thresholds'
import { LEVELUP_REFILL } from '../../helpers/equipment-fixture-slots'

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
      data: { nameFr: `LvlRefillSet${suffix}`, nameEn: `LvlRefillSet${suffix}`, isActive: true },
    })
    const card = await prisma.card.create({
      data: {
        nameFr: `LvlRefillCard${suffix}`,
        nameEn: `LvlRefillCard${suffix}`,
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

    // Equipment required for firstClear guaranteedEquipment drop. Jamais
    // équipées sur une carte (pool de drop, filtré par rareté ET par
    // CAMPAIGN_EQUIPMENT_SLOTS côté campaign.domain.ts — d'où le slot
    // classique ARMOR ci-dessous). Slot/setKey réservés dans
    // equipment-fixture-slots.ts (LEVELUP_REFILL).
    await prisma.equipment.createMany({
      data: [
        { nameFr: `LvlRefEqC${suffix}`, nameEn: `LvlRefEqC${suffix}`, ...LEVELUP_REFILL, rarity: 'COMMON', bonuses: { atkFlat: 1 }, dropWeight: 10 },
        { nameFr: `LvlRefEqU${suffix}`, nameEn: `LvlRefEqU${suffix}`, ...LEVELUP_REFILL, rarity: 'UNCOMMON', bonuses: { atkFlat: 2 }, dropWeight: 10 },
        { nameFr: `LvlRefEqR${suffix}`, nameEn: `LvlRefEqR${suffix}`, ...LEVELUP_REFILL, rarity: 'RARE', bonuses: { atkFlat: 5 }, dropWeight: 10 },
        { nameFr: `LvlRefEqE${suffix}`, nameEn: `LvlRefEqE${suffix}`, ...LEVELUP_REFILL, rarity: 'EPIC', bonuses: { atkFlat: 20 }, dropWeight: 1 },
        { nameFr: `LvlRefEqL${suffix}`, nameEn: `LvlRefEqL${suffix}`, ...LEVELUP_REFILL, rarity: 'LEGENDARY', bonuses: { atkFlat: 50 }, dropWeight: 1 },
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
        labelFr: '99-1 lvlrefill',
        labelEn: '99-1 lvlrefill',
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
            // Stats écrites à la main (non mises à l'échelle par enemyScale) => 1.
            mitigationScale: 1,
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

    await setCombatTeam(app, cookies, CAMPAIGN_TEAM_KEY, [uc.id])

    // Seed progress row so chapter-99 stage is unlocked (index=1 = highestIndex+1)
    await prisma.userCampaignProgress.upsert({
      where: { userId: user.id },
      create: { userId: user.id, highestChapter: 99, highestIndex: 0 },
      update: { highestChapter: 99, highestIndex: 0 },
    })

    return { userId: user.id, cookies }
  }

  it('battle qui fait level-up remonte combatPoints au cap', async () => {
    const { postgresOrm, configService } = (app as any).iocContainer
    const prisma = postgresOrm.prisma
    const xp = await xpThresholds(configService)
    // 1 XP sous le niveau 2, pour que le gain du combat le fasse monter.
    const { userId, cookies } = await setupUser('a', {
      xp: xp.justBelow(2),
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
    const { postgresOrm, configService } = (app as any).iocContainer
    const prisma = postgresOrm.prisma
    const xp = await xpThresholds(configService)
    const { userId, cookies } = await setupUser('b', {
      xp: xp.justBelow(2),
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
