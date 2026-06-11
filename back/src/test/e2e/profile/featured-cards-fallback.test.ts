import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'

import { buildTestApp } from '../../helpers/build-test-app'

describe('GET /users/:username/profile/featured-cards — fallback', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let cookies: string

  const suffix = Date.now()
  const username = `featfb${suffix}`
  const email = `${username}@test.com`
  const password = 'Password123!'

  beforeAll(async () => {
    app = await buildTestApp()
    const { postgresOrm } = (app as any).iocContainer
    const prisma = postgresOrm.prisma

    // Register user
    await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username, email, password },
    })
    await prisma.user.update({
      where: { email },
      data: { emailVerifiedAt: new Date() },
    })
    const loginRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email, password },
    })
    cookies = loginRes.headers['set-cookie'] as string
    const user = await prisma.user.findUnique({ where: { email } })

    // Seed a set + 5 cards (one per rarity) and give them to the user
    const set = await prisma.cardSet.create({
      data: { name: `FbSet${suffix}`, isActive: true },
    })
    const rarities = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'] as const
    for (const rarity of rarities) {
      const card = await prisma.card.create({
        data: { name: `${rarity}-${suffix}`, rarity, dropWeight: 10, setId: set.id },
      })
      await prisma.userCard.create({
        data: { userId: user!.id, cardId: card.id, variant: 'NORMAL', quantity: 1 },
      })
    }
  })

  afterAll(async () => {
    await app.close()
  })

  it('returns 5 cards in rarity order when no manual selection', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/users/${username}/profile/featured-cards`,
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.cards).toHaveLength(5)
    expect(body.cards.map((c: any) => c.rarity)).toEqual([
      'LEGENDARY', 'EPIC', 'RARE', 'UNCOMMON', 'COMMON',
    ])
  })
})
