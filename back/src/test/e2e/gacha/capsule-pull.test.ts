import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'

import { buildTestApp } from '../../helpers/build-test-app'

describe('POST /pulls/capsules/:type (élémentaire, Constellation)', () => {
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

  it('garantie partagée avec les jetons : au seuil → LEGENDARY, pitié normale remise à 0', async () => {
    const { pityThreshold } = await configService.getMany('pityThreshold')
    await prisma.user.update({
      where: { id: userId },
      data: { pityCurrent: pityThreshold },
    })
    await setCapsules('FIRE', 1, 42)
    const res = await pullCapsule('FIRE', 1)
    expect(res.statusCode).toBe(201)
    expect(res.json().pulls[0].card.rarity).toBe('LEGENDARY')
    expect(res.json().capsulePityCurrent).toBe(0)
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })
    expect(user.pityCurrent).toBe(0)
    // La colonne de pitié de la capsule ne sert qu'à l'astrale.
    const fire = await prisma.userCapsule.findUnique({
      where: { userId_type: { userId, type: 'FIRE' } },
    })
    expect(fire.pityCurrent).toBe(42)
  })

  it('un tirage de capsule élémentaire avance la pitié normale', async () => {
    await prisma.user.update({ where: { id: userId }, data: { pityCurrent: 3 } })
    await setCapsules('WATER', 1)
    const res = await pullCapsule('WATER', 1)
    expect(res.statusCode).toBe(201)
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })
    expect(user.pityCurrent).toBe(4)
  })

  it('stock insuffisant → 402', async () => {
    await setCapsules('EARTH', 0)
    expect((await pullCapsule('EARTH', 1)).statusCode).toBe(402)
  })

  it('type inconnu → 400', async () => {
    expect((await pullCapsule('LIGHT', 1)).statusCode).toBe(400)
  })

  it('jeton Constellation : cartes de la sélection publique, jamais LIGHT/DARK', async () => {
    const comet = await app.inject({ method: 'GET', url: '/capsules/comet' })
    expect(comet.statusCode).toBe(200)
    const { current, next } = comet.json()
    const { cards, endsAt } = current
    expect(next.startsAt).toBe(endsAt)
    expect(next.cards.length).toBeGreaterThan(0)
    expect(cards.length).toBeGreaterThan(0)
    expect(cards.length).toBeLessThanOrEqual(15)
    expect(new Date(endsAt).getUTCDay()).toBe(1)
    expect(cards.some((c: any) => ['LIGHT', 'DARK'].includes(c.element))).toBe(false)

    await setCapsules('COMET', 10)
    const res = await pullCapsule('COMET', 10)
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
      'COMET',
    ])
  })
})
