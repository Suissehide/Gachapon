import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'

import { buildTestApp } from '../helpers/build-test-app'

describe('GET /economy/config', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>

  beforeAll(async () => {
    app = await buildTestApp()
    // Reset combat config to canonical defaults — combat-points tests override
    // these values and don't restore them (tests run --runInBand, shared DB).
    const { configService } = (app as any).iocContainer
    await configService.set('combat.battleCost', 5)
    await configService.set('combat.sweepCost', 5)
  })
  afterAll(async () => {
    await app.close()
  })

  it('returns the economy parameters consumed by the front', async () => {
    const res = await app.inject({ method: 'GET', url: '/economy/config' })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.xp.base).toBe(100)
    expect(body.xp.slope).toBe(30)
    expect(body.xp.levelCap).toBe(100)
    expect(body.xp.skillPointsPerLevel).toBe(1)
    expect(body.xp.milestones).toHaveLength(5)
    expect(body.xp.milestones[0]).toEqual({
      level: 10,
      bonusPoints: 2,
      tokens: 5,
      dust: 100,
    })
    expect(body.xp.milestones[4]).toEqual({
      level: 100,
      bonusPoints: 2,
      tokens: 30,
      dust: 3000,
    })
    expect(body.gacha.pullTokenCost).toBe(1)
    expect(body.gacha.pityThreshold).toBe(300)
    expect(body.recycle.LEGENDARY).toBe(800)
    expect(body.card.rarityMult.EPIC).toBe(2.3)
    expect(body.card.maxPalier).toBe(6)
    expect(body.combat.battleCost).toBe(5)
    expect(body.equip.goldCostBase).toBe(25)
    expect(body.equip.goldCostExp).toBe(1.35)
    expect(body.equip.levelScale).toBe(0.1)
    expect(body.equip.maxLevel).toBe(12)
    expect(body.equip.substatMilestone).toBe(3)
    expect(body.equip.maxSubstatsByRarity).toEqual({
      COMMON: 0,
      UNCOMMON: 1,
      RARE: 2,
      EPIC: 3,
      LEGENDARY: 4,
    })
    expect(body.equip.salvageGold.LEGENDARY).toBe(800)
    expect(body.equip.substatRanges.hpFlat).toEqual({ min: 20, max: 60 })
    expect(body.equip.substatRanges.pct).toEqual({ min: 3, max: 8 })
  })
})
