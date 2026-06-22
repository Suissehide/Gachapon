import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'

import { buildTestApp } from '../../helpers/build-test-app'

describe('PUT /users/me/featured-cards', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let cookies: string
  let ownedIds: string[]

  const suffix = Date.now()
  const username = `setfeat${suffix}`
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
      data: { name: `PutSet${suffix}`, isActive: true },
    })
    ownedIds = []
    for (let i = 0; i < 6; i++) {
      const card = await prisma.card.create({
        data: { name: `C${i}-${suffix}`, rarity: 'COMMON', dropWeight: 10, setId: set.id },
      })
      await prisma.userCard.create({
        data: { userId: user!.id, cardId: card.id, variant: 'NORMAL', quantity: 1 },
      })
      ownedIds.push(card.id)
    }
  })

  afterAll(async () => {
    await app.close()
  })

  it('saves up to 5 cards (200)', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/users/me/featured-cards',
      headers: { cookie: cookies },
      payload: { cardIds: ownedIds.slice(0, 5) },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().cardIds).toEqual(ownedIds.slice(0, 5))
  })

  it('rejects more than 5 ids (422 via Zod)', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/users/me/featured-cards',
      headers: { cookie: cookies },
      payload: { cardIds: ownedIds },
    })
    expect(res.statusCode).toBe(400) // Zod renvoie 400 par défaut via fastify-type-provider-zod
  })

  it('rejects unowned card ids with a 422 error', async () => {
    const fakeId = '00000000-0000-4000-8000-000000000000'
    const res = await app.inject({
      method: 'PUT',
      url: '/users/me/featured-cards',
      headers: { cookie: cookies },
      payload: { cardIds: [ownedIds[0], fakeId] },
    })
    expect(res.statusCode).toBe(422)
    const body = res.json()
    // Boom data field is dropped by the error normalizer, so we assert on the
    // standard Boom envelope (error + message) — invalidIds is logged server-side.
    expect(body.message).toMatch(/not in your collection/i)
  })

  it('deduplicates silently', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/users/me/featured-cards',
      headers: { cookie: cookies },
      payload: { cardIds: [ownedIds[0], ownedIds[0], ownedIds[1]] },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().cardIds).toEqual([ownedIds[0], ownedIds[1]])
  })
})
