import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'

import { buildTestApp } from '../../helpers/build-test-app'

describe('GET /users/:username/profile/featured-cards — orphaned ids', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>

  const suffix = Date.now()
  const username = `featorph${suffix}`
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
    const cookies = loginRes.headers['set-cookie'] as string
    ;(global as any).__orphCookies = cookies

    const user = await prisma.user.findUnique({ where: { email } })
    const set = await prisma.cardSet.create({
      data: { name: `OrphSet${suffix}`, isActive: true },
    })
    const ids: string[] = []
    for (const rarity of ['RARE', 'EPIC', 'LEGENDARY'] as const) {
      const card = await prisma.card.create({
        data: { name: `${rarity}-${suffix}`, rarity, dropWeight: 10, setId: set.id },
      })
      await prisma.userCard.create({
        data: { userId: user!.id, cardId: card.id, variant: 'NORMAL', quantity: 1 },
      })
      ids.push(card.id)
    }
    // Save 3 in featured then delete one userCard (simulate recycle)
    await prisma.user.update({ where: { id: user!.id }, data: { featuredCardIds: ids } })
    await prisma.userCard.deleteMany({ where: { userId: user!.id, cardId: ids[0] } })
  })

  afterAll(async () => {
    await app.close()
  })

  it('returns only owned cards, orphans filtered', async () => {
    const cookies = (global as any).__orphCookies as string
    const res = await app.inject({
      method: 'GET',
      url: `/users/${username}/profile/featured-cards`,
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.cards).toHaveLength(2)
  })
})
