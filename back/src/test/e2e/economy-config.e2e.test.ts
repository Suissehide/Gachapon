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
    expect(body.xp).toEqual({ base: 100, slope: 30, levelCap: 100 })
    expect(body.gacha.pullTokenCost).toBe(1)
    expect(body.gacha.pityThreshold).toBe(80)
    expect(body.recycle.LEGENDARY).toBe(400)
    expect(body.card.rarityMult.EPIC).toBe(2.3)
    expect(body.card.maxPalier).toBe(6)
    expect(body.combat.battleCost).toBe(5)
  })
})
