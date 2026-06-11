import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'

import { buildTestApp } from '../../helpers/build-test-app'

describe('GET /users/:username/profile/featured-cards — manual selection', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let cookies: string
  let manualIds: string[]

  const suffix = Date.now()
  const username = `featman${suffix}`
  const email = `${username}@test.com`
  const password = 'Password123!'

  beforeAll(async () => {
    app = await buildTestApp()
    const { postgresOrm } = (app as any).iocContainer
    const prisma = postgresOrm.prisma

    await app.inject({
      method: 'POST', url: '/auth/register',
      payload: { username, email, password },
    })
    await prisma.user.update({ where: { email }, data: { emailVerifiedAt: new Date() } })
    const loginRes = await app.inject({
      method: 'POST', url: '/auth/login', payload: { email, password },
    })
    cookies = loginRes.headers['set-cookie'] as string
    const user = await prisma.user.findUnique({ where: { email } })

    const set = await prisma.cardSet.create({
      data: { name: `ManSet${suffix}`, isActive: true },
    })
    const ids: string[] = []
    for (const rarity of ['COMMON', 'COMMON', 'EPIC', 'LEGENDARY', 'RARE'] as const) {
      const card = await prisma.card.create({
        data: { name: `${rarity}-${suffix}-${ids.length}`, rarity, dropWeight: 10, setId: set.id },
      })
      await prisma.userCard.create({
        data: { userId: user!.id, cardId: card.id, variant: 'NORMAL', quantity: 1 },
      })
      ids.push(card.id)
    }

    // Manual selection: pick 3 cards in a specific order (EPIC, COMMON1, LEGENDARY)
    manualIds = [ids[2]!, ids[0]!, ids[3]!]
    await prisma.user.update({ where: { id: user!.id }, data: { featuredCardIds: manualIds } })
  })

  afterAll(async () => {
    await app.close()
  })

  it('returns featured cards in the saved order, not the fallback', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/users/${username}/profile/featured-cards`,
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.cards.map((c: any) => c.id)).toEqual(manualIds)
  })
})
