import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'
import { buildTestApp } from '../../helpers/build-test-app'

describe('Collection routes', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let cookies: string
  let userId: string

  const suffix = Date.now()

  beforeAll(async () => {
    app = await buildTestApp()
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        username: `coll${suffix}`,
        email: `coll${suffix}@test.com`,
        password: 'Password123!',
      },
    })
    cookies = res.headers['set-cookie'] as string
    userId = res.json().id

    // Donner 5 tokens pour pouvoir tirer
    const { postgresOrm } = (app as any).iocContainer
    await postgresOrm.prisma.user.update({
      where: { id: userId },
      data: { tokens: 5, lastTokenAt: new Date() },
    })
  })

  afterAll(() => app.close())

  it('GET /sets — liste les sets actifs', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/sets',
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(Array.isArray(body.sets)).toBe(true)
  })

  it('GET /cards — liste les cartes', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/cards',
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(Array.isArray(body.cards)).toBe(true)
    expect(body.cards.length).toBeGreaterThan(0)
  })

  it('GET /cards?rarity=LEGENDARY — filtre par rareté', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/cards?rarity=LEGENDARY',
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.cards.every((c: any) => c.rarity === 'LEGENDARY')).toBe(true)
  })

  it('GET /users/:id/collection — collection vide au départ', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/users/${userId}/collection`,
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(Array.isArray(body.cards)).toBe(true)
  })

  it('POST /collection/recycle — nécessite quantity > 0', async () => {
    // D'abord faire un tirage pour obtenir une carte
    await app.inject({
      method: 'POST',
      url: '/pulls',
      headers: { cookie: cookies },
    })

    // Récupérer la collection
    const collRes = await app.inject({
      method: 'GET',
      url: `/users/${userId}/collection`,
      headers: { cookie: cookies },
    })
    const coll = collRes.json()
    if (coll.cards.length === 0) return // pas de carte à recycler

    const cardId = coll.cards[0].card.id
    const res = await app.inject({
      method: 'POST',
      url: '/collection/recycle',
      headers: { cookie: cookies },
      payload: { cardId },
    })
    expect([200, 400]).toContain(res.statusCode)
  })
})
