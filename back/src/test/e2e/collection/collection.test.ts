import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'
import { buildTestApp } from '../../helpers/build-test-app'

describe('Collection routes', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let cookies: string
  let userId: string

  const suffix = Date.now()

  beforeAll(async () => {
    app = await buildTestApp()

    const { postgresOrm } = (app as any).iocContainer

    // Seed a card set + card so collection endpoints return data
    const set = await postgresOrm.prisma.cardSet.create({
      data: { name: `CollSet${suffix}`, isActive: true },
    })
    await postgresOrm.prisma.card.create({
      data: { name: `CollCard${suffix}`, rarity: 'COMMON', dropWeight: 10, setId: set.id },
    })

    await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        username: `coll${suffix}`,
        email: `coll${suffix}@test.com`,
        password: 'Password123!',
      },
    })

    // Donner 5 tokens pour pouvoir tirer
    const user = await postgresOrm.prisma.user.update({
      where: { email: `coll${suffix}@test.com` },
      data: { emailVerifiedAt: new Date(), tokens: 5, lastTokenAt: new Date() },
    })
    userId = user.id

    const loginRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: `coll${suffix}@test.com`, password: 'Password123!' },
    })
    cookies = loginRes.headers['set-cookie'] as string
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
    expect(res.statusCode).toBe(200)
    const recycleBody = res.json()
    expect(recycleBody).toHaveProperty('dustEarned')
    expect(recycleBody).toHaveProperty('newDustTotal')
  })

  it('POST /collection/recycle — BRILLIANT RARE donne exactement 40 dust (valeur plate, pas de multiplicateur variante)', async () => {
    const { postgresOrm } = (app as any).iocContainer

    // Créer un set et une carte RARE dédiés pour ce test
    const recycleSet = await postgresOrm.prisma.cardSet.create({
      data: { name: `RecycleSet${suffix}`, isActive: true },
    })
    const rareCard = await postgresOrm.prisma.card.create({
      data: { name: `RecycleRare${suffix}`, rarity: 'RARE', dropWeight: 5, setId: recycleSet.id },
    })

    // Insérer directement une copie BRILLIANT de cette carte RARE
    await postgresOrm.prisma.userCard.create({
      data: { userId, cardId: rareCard.id, variant: 'BRILLIANT', quantity: 1 },
    })

    const res = await app.inject({
      method: 'POST',
      url: '/collection/recycle',
      headers: { cookie: cookies },
      payload: { cardId: rareCard.id, quantity: 1, variant: 'BRILLIANT' },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    // Règle canonique : valeur plate par rareté, pas de multiplicateur variante.
    // dustRare = 40 par défaut, dustHarvestMultiplier = 1 (pas de skills)
    // BRILLIANT RARE doit donner exactement 40, identique à NORMAL RARE.
    expect(body.dustEarned).toBe(40)
  })

  it('POST /collection/recycle — incrémente le cumul dustGenerated exposé sur le profil', async () => {
    const { postgresOrm } = (app as any).iocContainer
    const username = `coll${suffix}`

    const before = await app.inject({
      method: 'GET',
      url: `/users/${username}/profile`,
      headers: { cookie: cookies },
    })
    const dustBefore = before.json().stats.dustGenerated
    expect(typeof dustBefore).toBe('number')

    // Carte RARE dédiée + une copie NORMAL à recycler
    const genSet = await postgresOrm.prisma.cardSet.create({
      data: { name: `GenSet${suffix}`, isActive: true },
    })
    const genCard = await postgresOrm.prisma.card.create({
      data: { name: `GenRare${suffix}`, rarity: 'RARE', dropWeight: 5, setId: genSet.id },
    })
    await postgresOrm.prisma.userCard.create({
      data: { userId, cardId: genCard.id, variant: 'NORMAL', quantity: 1 },
    })

    const recycle = await app.inject({
      method: 'POST',
      url: '/collection/recycle',
      headers: { cookie: cookies },
      payload: { cardId: genCard.id, quantity: 1, variant: 'NORMAL' },
    })
    expect(recycle.statusCode).toBe(200)
    const earned = recycle.json().dustEarned
    expect(earned).toBeGreaterThan(0)

    // Le cumul « poussière générée » doit augmenter du montant recyclé.
    const after = await app.inject({
      method: 'GET',
      url: `/users/${username}/profile`,
      headers: { cookie: cookies },
    })
    expect(after.json().stats.dustGenerated).toBe(dustBefore + earned)
  })
})
