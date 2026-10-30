import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'

import { buildTestApp } from '../../helpers/build-test-app'

describe('POST /pulls/astral', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let prisma: any
  let configService: any
  let cookies: string
  let userId: string

  const suffix = Date.now()
  const email = `astralpull${suffix}@test.com`
  const password = 'Password123!'
  const username = `astralpull${suffix}`
  const questKey = `test_astral_pull_${suffix}`

  const setCapsules = (quantity: number, pityCurrent = 0) =>
    prisma.userCapsule.upsert({
      where: { userId_type: { userId, type: 'ASTRAL' } },
      create: { userId, type: 'ASTRAL', quantity, pityCurrent },
      update: { quantity, pityCurrent },
    })
  const getCapsule = () =>
    prisma.userCapsule.findUnique({
      where: { userId_type: { userId, type: 'ASTRAL' } },
    })
  const pullAstral = (count: number) =>
    app.inject({
      method: 'POST',
      url: '/pulls/astral',
      headers: { cookie: cookies },
      payload: { count },
    })

  beforeAll(async () => {
    app = await buildTestApp()
    ;({ postgresOrm: { prisma }, configService } = (app as any).iocContainer)

    // Quête créée avant tout accès au cache de quêtes de cette app.
    await prisma.quest.create({
      data: {
        key: questKey,
        nameFr: questKey,
        nameEn: questKey,
        descriptionFr: questKey,
        descriptionEn: questKey,
        period: 'ONESHOT',
        criterion: { event: 'PULL_COMPLETED', target: 50 },
        isActive: true,
      },
    })

    const set = await prisma.cardSet.create({
      data: { nameFr: `AstralPullSet${suffix}`, nameEn: `AstralPullSet${suffix}`, isActive: true },
    })
    const cards = [
      { rarity: 'COMMON', element: 'FIRE' },
      { rarity: 'COMMON', element: 'LIGHT' },
      { rarity: 'RARE', element: 'DARK' },
      { rarity: 'LEGENDARY', element: 'LIGHT' },
    ]
    for (const [i, c] of cards.entries()) {
      await prisma.card.create({
        data: {
          nameFr: `AstralPull${suffix}-${i}`,
          nameEn: `AstralPull${suffix}-${i}`,
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
    await prisma.userQuest.deleteMany({ where: { quest: { key: questKey } } })
    await prisma.quest.deleteMany({ where: { key: questKey } })
    await app.close()
  })

  it('refuse quand le stock < count : 402, stock intact, aucun tirage créé', async () => {
    await setCapsules(3)
    const res = await pullAstral(10)
    expect(res.statusCode).toBe(402)
    expect(res.json().message).toContain('astral capsules')
    expect((await getCapsule()).quantity).toBe(3)
    expect(await prisma.gachaPull.count({ where: { userId } })).toBe(0)
  })

  it('×10 : 10 cartes LIGHT/DARK, stock 0, 10 GachaPull ASTRAL, jetons intacts, XP de tirage', async () => {
    await setCapsules(10)
    const before = await prisma.user.findUniqueOrThrow({ where: { id: userId } })
    const { xpPerPull } = await configService.getMany('xpPerPull')

    const res = await pullAstral(10)
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.pulls).toHaveLength(10)
    for (const p of body.pulls) {
      expect(['LIGHT', 'DARK']).toContain(p.card.element)
      expect(p.wasFreePull).toBe(false)
      expect(p.wasBoostGuarantee).toBe(false)
    }
    expect(body.capsulesRemaining).toBe(0)
    expect(body.tokensRemaining).toBe(before.tokens)
    expect(body.xpGained).toBe(10 * xpPerPull)
    expect(body.astralPityCurrent).toBe(body.pulls.at(-1).pityCurrent)

    expect((await getCapsule()).quantity).toBe(0)
    const pulls = await prisma.gachaPull.findMany({ where: { userId } })
    expect(pulls).toHaveLength(10)
    expect(pulls.every((p: { source: string }) => p.source === 'ASTRAL')).toBe(true)

    const after = await prisma.user.findUniqueOrThrow({ where: { id: userId } })
    expect(after.tokens).toBe(before.tokens)
    expect(after.pityCurrent).toBe(before.pityCurrent)
    expect(after.xp - before.xp).toBe(10 * xpPerPull)
  })

  it('la quête PULL_COMPLETED progresse après un tirage astral', async () => {
    const uq = await prisma.userQuest.findFirst({
      where: { userId, quest: { key: questKey } },
    })
    expect(uq?.progress).toBe(10)
  })

  it('pitié astrale séparée : au seuil → LEGENDARY, remise à 0, pitié normale intacte', async () => {
    const { 'astral.pityThreshold': threshold } = await configService.getMany(
      'astral.pityThreshold',
    )
    await prisma.user.update({ where: { id: userId }, data: { pityCurrent: 7 } })
    await setCapsules(1, threshold)

    const res = await pullAstral(1)
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.pulls[0].card.rarity).toBe('LEGENDARY')
    expect(body.astralPityCurrent).toBe(0)
    expect((await getCapsule()).pityCurrent).toBe(0)
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })
    expect(user.pityCurrent).toBe(7)

    // Un tirage normal ne touche pas la pitié astrale.
    await setCapsules(0, 42)
    await prisma.user.update({
      where: { id: userId },
      data: { tokens: 5, lastTokenAt: new Date() },
    })
    const normal = await app.inject({
      method: 'POST',
      url: '/pulls',
      headers: { cookie: cookies },
    })
    expect(normal.statusCode).toBe(201)
    expect((await getCapsule()).pityCurrent).toBe(42)
  })

  it('un boost actif garde ses pullsRemaining après un tirage astral', async () => {
    const boost = await prisma.userBoost.create({
      data: { userId, weightMultiplier: 2, weightRarity: 'RARE', pullsRemaining: 5 },
    })
    await setCapsules(2)
    const res = await pullAstral(2)
    expect(res.statusCode).toBe(201)
    const after = await prisma.userBoost.findUniqueOrThrow({ where: { id: boost.id } })
    expect(after.pullsRemaining).toBe(5)
    await prisma.userBoost.delete({ where: { id: boost.id } })
  })

  it('count hors 1..10 → 400', async () => {
    expect((await pullAstral(0)).statusCode).toBe(400)
    expect((await pullAstral(11)).statusCode).toBe(400)
  })
})
