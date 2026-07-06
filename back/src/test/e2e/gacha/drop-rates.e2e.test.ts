import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'

import { buildTestApp } from '../../helpers/build-test-app'

describe('GET /pulls/rates', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  const suffix = Date.now()

  beforeAll(async () => {
    app = await buildTestApp()
    const { postgresOrm } = (app as any).iocContainer

    // Un set actif avec une LEGENDARY garantit un pct > 0 sur cette rareté
    const set = await postgresOrm.prisma.cardSet.create({
      data: { name: `RatesSet${suffix}`, isActive: true },
    })
    await postgresOrm.prisma.card.create({
      data: {
        name: `RatesLegendary${suffix}`,
        rarity: 'LEGENDARY',
        dropWeight: 5,
        setId: set.id,
      },
    })
    // Set inactif : ne doit PAS compter dans les taux
    const inactive = await postgresOrm.prisma.cardSet.create({
      data: { name: `RatesInactive${suffix}`, isActive: false },
    })
    await postgresOrm.prisma.card.create({
      data: {
        name: `RatesGhost${suffix}`,
        rarity: 'COMMON',
        dropWeight: 1_000_000,
        setId: inactive.id,
      },
    })
  })

  afterAll(async () => {
    await app.close()
  })

  it('retourne 5 raretés ordonnées dont la somme fait ~100, sans auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/pulls/rates' })
    expect(res.statusCode).toBe(200)
    const { rates } = res.json()
    expect(rates.map((r: { rarity: string }) => r.rarity)).toEqual([
      'COMMON',
      'UNCOMMON',
      'RARE',
      'EPIC',
      'LEGENDARY',
    ])
    const sum = rates.reduce((s: number, r: { pct: number }) => s + r.pct, 0)
    expect(sum).toBeGreaterThan(99.9)
    expect(sum).toBeLessThan(100.1)
    const legendary = rates.find(
      (r: { rarity: string }) => r.rarity === 'LEGENDARY',
    )
    expect(legendary.pct).toBeGreaterThan(0)
    // La carte du set inactif pèse 1M : si elle était comptée, COMMON serait ≈100
    const common = rates.find((r: { rarity: string }) => r.rarity === 'COMMON')
    expect(common.pct).toBeLessThan(99)
  })
})
