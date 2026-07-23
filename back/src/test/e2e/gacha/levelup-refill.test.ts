import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'

import { buildTestApp } from '../../helpers/build-test-app'

// XP defaults : base=100, slope=24 → xpForLevel(2)=100.
// user à xp=99 + xpPerPull(10) = 109 → niveau 2. combatPoints doit revenir à 60.
describe('Gacha level-up → refill énergie', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let cookies: string
  let userId: string
  const suffix = Date.now()
  const email = `gachalvl${suffix}@test.com`
  const password = 'Password123!'
  const username = `gachalvl${suffix}`

  beforeAll(async () => {
    app = await buildTestApp()
    const { postgresOrm } = (app as any).iocContainer
    const prisma = postgresOrm.prisma

    // Une carte par rareté pour que le tirage puisse toujours piocher,
    // quelle que soit la rareté tirée par le RNG.
    const cardSet = await prisma.cardSet.create({
      data: { name: `RefillSet${suffix}`, isActive: true },
    })
    for (const rarity of [
      'COMMON',
      'UNCOMMON',
      'RARE',
      'EPIC',
      'LEGENDARY',
    ] as const) {
      await prisma.card.create({
        data: {
          name: `RefillCard${rarity}${suffix}`,
          rarity,
          dropWeight: 10,
          setId: cardSet.id,
        },
      })
    }

    const reg = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username, email, password },
    })
    expect(reg.statusCode).toBe(201)

    // xp=99 (juste sous le niveau 2), énergie basse, tokens suffisants.
    const user = await prisma.user.update({
      where: { email },
      data: {
        emailVerifiedAt: new Date(),
        xp: 99,
        tokens: 10,
        lastTokenAt: new Date(),
        combatPoints: 12,
        lastCombatPointAt: new Date(),
      },
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

  it('un tirage qui fait level-up remonte combatPoints au cap', async () => {
    const { postgresOrm } = (app as any).iocContainer
    const prisma = postgresOrm.prisma

    const res = await app.inject({
      method: 'POST',
      url: '/pulls',
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(201)

    const after = await prisma.user.findUnique({ where: { id: userId } })
    expect(after.level).toBe(2)
    expect(after.combatPoints).toBe(60)
  })

  it('toggle levelup.refillEnergy=0 → pas de refill', async () => {
    const { postgresOrm, configService } = (app as any).iocContainer
    const prisma = postgresOrm.prisma

    // Nouvel utilisateur au bord du niveau 3, énergie basse, toggle coupé.
    const suffix2 = `${suffix}b`
    const email2 = `gachalvl${suffix2}@test.com`
    await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username: `gachalvl${suffix2}`, email: email2, password },
    })
    const u2 = await prisma.user.update({
      where: { email: email2 },
      data: {
        emailVerifiedAt: new Date(),
        xp: 219, // xpForLevel(3)=224 avec base=100/slope=24 ; +10 → 229 = niveau 3
        tokens: 10,
        lastTokenAt: new Date(),
        combatPoints: 7,
        lastCombatPointAt: new Date(),
      },
    })
    const login2 = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: email2, password },
    })
    const cookies2 = login2.headers['set-cookie'] as string

    await configService.set('levelup.refillEnergy', 0)
    try {
      const res = await app.inject({
        method: 'POST',
        url: '/pulls',
        headers: { cookie: cookies2 },
      })
      expect(res.statusCode).toBe(201)
      const after = await prisma.user.findUnique({ where: { id: u2.id } })
      expect(after.level).toBeGreaterThan(2)
      // Toggle coupé → énergie inchangée (pas remontée à 60).
      expect(after.combatPoints).toBeLessThan(60)
    } finally {
      await configService.set('levelup.refillEnergy', 1)
    }
  })
})
