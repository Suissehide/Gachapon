import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'

import { buildTestApp } from '../../helpers/build-test-app'

describe('POST /pulls/capsules/:type (élémentaire, semaine)', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let prisma: any
  let configService: any
  let cookies: string
  let userId: string

  const suffix = Date.now()
  const email = `capsulepull${suffix}@test.com`
  const password = 'Password123!'
  const username = `capsulepull${suffix}`

  const setCapsules = (type: string, quantity: number, pityCurrent = 0) =>
    prisma.userCapsule.upsert({
      where: { userId_type: { userId, type } },
      create: { userId, type, quantity, pityCurrent },
      update: { quantity, pityCurrent },
    })
  const pullCapsule = (type: string, count: number) =>
    app.inject({
      method: 'POST',
      url: `/pulls/capsules/${type}`,
      headers: { cookie: cookies },
      payload: { count },
    })

  beforeAll(async () => {
    app = await buildTestApp()
    ;({ postgresOrm: { prisma }, configService } = (app as any).iocContainer)

    const set = await prisma.cardSet.create({
      data: { nameFr: `CapsulePullSet${suffix}`, nameEn: `CapsulePullSet${suffix}`, isActive: true },
    })
    const cards = [
      { rarity: 'COMMON', element: 'FIRE' },
      { rarity: 'COMMON', element: 'WATER' },
      { rarity: 'LEGENDARY', element: 'FIRE' },
      { rarity: 'RARE', element: 'LIGHT' },
    ]
    for (const [i, c] of cards.entries()) {
      await prisma.card.create({
        data: {
          nameFr: `CapsulePull${suffix}-${i}`,
          nameEn: `CapsulePull${suffix}-${i}`,
          rarity: c.rarity,
          element: c.element,
          dropWeight: 10,
          setId: set.id,
        },
      })
    }

    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username, email, password },
    })
    expect(res.statusCode).toBe(201)
    const user = await prisma.user.update({
      where: { email },
      data: { emailVerifiedAt: new Date(), tokens: 5, lastTokenAt: new Date() },
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

  it('capsule Feu ×10 : que des cartes FIRE, source CAPSULE, stock décrémenté', async () => {
    await setCapsules('FIRE', 12)
    const res = await pullCapsule('FIRE', 10)
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.pulls).toHaveLength(10)
    expect(body.pulls.every((p: any) => p.card.element === 'FIRE')).toBe(true)
    expect(body.capsulesRemaining).toBe(2)
    const pulls = await prisma.gachaPull.findMany({ where: { userId } })
    expect(pulls.every((p: { source: string }) => p.source === 'CAPSULE')).toBe(true)
  })

  it('pitié propre à chaque élément, au seuil du tirage normal', async () => {
    const { pityThreshold } = await configService.getMany('pityThreshold')
    await setCapsules('FIRE', 1, pityThreshold)
    await setCapsules('WATER', 0, 5)
    const res = await pullCapsule('FIRE', 1)
    expect(res.statusCode).toBe(201)
    expect(res.json().pulls[0].card.rarity).toBe('LEGENDARY')
    expect(res.json().capsulePityCurrent).toBe(0)
    const water = await prisma.userCapsule.findUnique({
      where: { userId_type: { userId, type: 'WATER' } },
    })
    expect(water.pityCurrent).toBe(5)
  })

  it('stock insuffisant → 402', async () => {
    await setCapsules('EARTH', 0)
    expect((await pullCapsule('EARTH', 1)).statusCode).toBe(402)
  })

  it('type inconnu → 400', async () => {
    expect((await pullCapsule('LIGHT', 1)).statusCode).toBe(400)
  })

  it('capsule de la semaine : cartes de la sélection publique, jamais LIGHT/DARK', async () => {
    const weekly = await app.inject({ method: 'GET', url: '/capsules/weekly' })
    expect(weekly.statusCode).toBe(200)
    const { cards, endsAt } = weekly.json()
    expect(cards.length).toBeGreaterThan(0)
    expect(cards.length).toBeLessThanOrEqual(15)
    expect(new Date(endsAt).getUTCDay()).toBe(1)
    expect(cards.some((c: any) => ['LIGHT', 'DARK'].includes(c.element))).toBe(false)

    await setCapsules('WEEKLY', 10)
    const res = await pullCapsule('WEEKLY', 10)
    expect(res.statusCode).toBe(201)
    const ids = new Set(cards.map((c: any) => c.id))
    expect(res.json().pulls.every((p: any) => ids.has(p.card.id))).toBe(true)
  })

  it('GET /capsules : une entrée par type', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/capsules',
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().capsules.map((c: any) => c.type)).toEqual([
      'ASTRAL',
      'FIRE',
      'WATER',
      'NATURE',
      'EARTH',
      'WEEKLY',
    ])
  })
})
