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
      data: { nameFr: `CollSet${suffix}`, nameEn: `CollSet${suffix}`, isActive: true },
    })
    await postgresOrm.prisma.card.create({
      data: { nameFr: `CollCard${suffix}`, nameEn: `CollCard${suffix}`, rarity: 'COMMON', dropWeight: 10, setId: set.id },
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
    const { postgresOrm } = (app as any).iocContainer
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
    expect(
      ['TANK', 'SUPPORT', 'FIGHTER', 'BALANCED', 'RANGER', 'ASSASSIN', 'MAGE'],
    ).toContain(coll.cards[0].card.archetype)

    // Un tirage peut sortir un vernis : le dernier exemplaire d'une carte à
    // vernis n'est pas recyclable, on garantit donc un doublon.
    const drawn = coll.cards[0]
    await postgresOrm.prisma.userCard.update({
      where: { userId_cardId: { userId, cardId: drawn.card.id } },
      data: { quantity: { increment: 1 } },
    })
    const res = await app.inject({
      method: 'POST',
      url: '/collection/recycle',
      headers: { cookie: cookies },
      payload: { cardId: drawn.card.id },
    })
    expect(res.statusCode).toBe(200)
    const recycleBody = res.json()
    expect(recycleBody).toHaveProperty('dustEarned')
    expect(recycleBody).toHaveProperty('newDustTotal')
  })

  it('POST /collection/recycle — RARE à vernis Brillant donne exactement 80 dust (valeur plate, pas de multiplicateur de vernis)', async () => {
    const { postgresOrm } = (app as any).iocContainer

    // Créer un set et une carte RARE dédiés pour ce test
    const recycleSet = await postgresOrm.prisma.cardSet.create({
      data: { nameFr: `RecycleSet${suffix}`, nameEn: `RecycleSet${suffix}`, isActive: true },
    })
    const rareCard = await postgresOrm.prisma.card.create({
      data: { nameFr: `RecycleRare${suffix}`, nameEn: `RecycleRare${suffix}`, rarity: 'RARE', dropWeight: 5, setId: recycleSet.id },
    })

    // Deux exemplaires d'une carte au vernis Brillant : recycler l'un des deux
    // est permis, la ligne et son vernis restent.
    await postgresOrm.prisma.userCard.create({
      data: { userId, cardId: rareCard.id, finishes: ['BRILLIANT'], quantity: 2 },
    })

    const res = await app.inject({
      method: 'POST',
      url: '/collection/recycle',
      headers: { cookie: cookies },
      payload: { cardId: rareCard.id, quantity: 1 },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    // Règle canonique : valeur plate par rareté, pas de multiplicateur variante.
    // dustRare = 80 par défaut, dustHarvestMultiplier = 1 (pas de skills)
    // BRILLIANT RARE doit donner exactement 80, identique à NORMAL RARE.
    expect(body.dustEarned).toBe(80)

    const row = await postgresOrm.prisma.userCard.findUniqueOrThrow({
      where: { userId_cardId: { userId, cardId: rareCard.id } },
    })
    expect(row.quantity).toBe(1)
    expect(row.finishes).toEqual(['BRILLIANT'])
  })

  it("POST /collection/recycle — refuse le dernier exemplaire d'une carte à vernis", async () => {
    const { postgresOrm } = (app as any).iocContainer
    const set = await postgresOrm.prisma.cardSet.create({
      data: { nameFr: `LastCopySet${suffix}`, nameEn: `LastCopySet${suffix}`, isActive: false },
    })
    const card = await postgresOrm.prisma.card.create({
      data: { nameFr: `LastCopy${suffix}`, nameEn: `LastCopy${suffix}`, rarity: 'RARE', dropWeight: 5, setId: set.id },
    })
    await postgresOrm.prisma.userCard.create({
      data: { userId, cardId: card.id, finishes: ['HOLOGRAPHIC'], quantity: 2 },
    })

    const res = await app.inject({
      method: 'POST',
      url: '/collection/recycle',
      headers: { cookie: cookies },
      payload: { cardId: card.id, quantity: 2 },
    })
    expect(res.statusCode).toBe(400)

    const row = await postgresOrm.prisma.userCard.findUniqueOrThrow({
      where: { userId_cardId: { userId, cardId: card.id } },
    })
    expect(row.quantity).toBe(2)
    expect(row.finishes).toEqual(['HOLOGRAPHIC'])
  })

  describe('PATCH /collection/:userCardId/finish', () => {
    let userCardId: string
    let otherUserCardId: string

    beforeAll(async () => {
      const { postgresOrm } = (app as any).iocContainer
      const set = await postgresOrm.prisma.cardSet.create({
        data: { nameFr: `FinishSet${suffix}`, nameEn: `FinishSet${suffix}`, isActive: false },
      })
      const card = await postgresOrm.prisma.card.create({
        data: { nameFr: `FinishCard${suffix}`, nameEn: `FinishCard${suffix}`, rarity: 'RARE', dropWeight: 5, setId: set.id },
      })
      const uc = await postgresOrm.prisma.userCard.create({
        data: { userId, cardId: card.id, finishes: ['BRILLIANT'], quantity: 1 },
      })
      userCardId = uc.id
      const other = await postgresOrm.prisma.user.create({
        data: { email: `finish-other${suffix}@test.com`, username: `finishother${suffix}`, emailVerifiedAt: new Date() },
      })
      const otherUc = await postgresOrm.prisma.userCard.create({
        data: { userId: other.id, cardId: card.id, finishes: ['BRILLIANT'], quantity: 1 },
      })
      otherUserCardId = otherUc.id
    })

    const patchFinish = (id: string, finish: string) =>
      app.inject({
        method: 'PATCH',
        url: `/collection/${id}/finish`,
        headers: { cookie: cookies },
        payload: { finish },
      })

    it('affiche un vernis débloqué', async () => {
      const res = await patchFinish(userCardId, 'BRILLIANT')
      expect(res.statusCode).toBe(200)
      expect(res.json()).toEqual({ displayedFinish: 'BRILLIANT' })

      const coll = await app.inject({
        method: 'GET',
        url: `/users/${userId}/collection`,
        headers: { cookie: cookies },
      })
      const entry = coll.json().cards.find((c: any) => c.id === userCardId)
      expect(entry.displayedFinish).toBe('BRILLIANT')
      expect(entry.finishes).toEqual(['BRILLIANT'])
    })

    it('revient au NORMAL, toujours disponible', async () => {
      const res = await patchFinish(userCardId, 'NORMAL')
      expect(res.statusCode).toBe(200)
      expect(res.json()).toEqual({ displayedFinish: 'NORMAL' })
    })

    it('refuse un vernis verrouillé (400)', async () => {
      const res = await patchFinish(userCardId, 'HOLOGRAPHIC')
      expect(res.statusCode).toBe(400)
      const { postgresOrm } = (app as any).iocContainer
      const row = await postgresOrm.prisma.userCard.findUniqueOrThrow({ where: { id: userCardId } })
      expect(row.displayedFinish).toBe('NORMAL')
    })

    it("refuse la carte d'un autre joueur (404)", async () => {
      const res = await patchFinish(otherUserCardId, 'BRILLIANT')
      expect(res.statusCode).toBe(404)
    })
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
      data: { nameFr: `GenSet${suffix}`, nameEn: `GenSet${suffix}`, isActive: true },
    })
    const genCard = await postgresOrm.prisma.card.create({
      data: { nameFr: `GenRare${suffix}`, nameEn: `GenRare${suffix}`, rarity: 'RARE', dropWeight: 5, setId: genSet.id },
    })
    await postgresOrm.prisma.userCard.create({
      data: { userId, cardId: genCard.id, quantity: 1 },
    })

    const recycle = await app.inject({
      method: 'POST',
      url: '/collection/recycle',
      headers: { cookie: cookies },
      payload: { cardId: genCard.id, quantity: 1 },
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
