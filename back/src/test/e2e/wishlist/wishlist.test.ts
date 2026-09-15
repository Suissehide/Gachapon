import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'
import { buildTestApp } from '../../helpers/build-test-app'

describe('Wishlist routes', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let cookies: string
  let userId: string
  let cardIds: string[] = []
  let skillBranchId: string | undefined

  const suffix = Date.now()
  const auth = () => ({ cookie: cookies })

  beforeAll(async () => {
    app = await buildTestApp()
    // biome-ignore lint/suspicious/noExplicitAny: accès au conteneur dans les e2e
    const { postgresOrm } = (app as any).iocContainer
    const prisma = postgresOrm.prisma

    await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        username: `wishlist${suffix}`,
        email: `wishlist${suffix}@test.com`,
        password: 'Password123!',
      },
    })
    const user = await prisma.user.update({
      where: { email: `wishlist${suffix}@test.com` },
      data: { emailVerifiedAt: new Date() },
    })
    userId = user.id

    const set = await prisma.cardSet.create({
      data: { name: `WishlistTestSet${suffix}`, isActive: true },
    })
    // Six cartes RARE : de quoi dépasser les 2 emplacements de base et les 5 du plafond.
    for (let i = 0; i < 6; i++) {
      const card = await prisma.card.create({
        data: {
          setId: set.id,
          name: `RARE-wishlist-${suffix}-${i}`,
          rarity: 'RARE',
          dropWeight: 1.0,
        },
      })
      cardIds.push(card.id)
    }

    const loginRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: `wishlist${suffix}@test.com`, password: 'Password123!' },
    })
    cookies = loginRes.headers['set-cookie'] as string
  })

  afterAll(async () => {
    if (skillBranchId) {
      // biome-ignore lint/suspicious/noExplicitAny: accès au conteneur dans les e2e
      const { postgresOrm } = (app as any).iocContainer
      await postgresOrm.prisma.skillBranch.delete({ where: { id: skillBranchId } })
    }
    await app.close()
  })

  it('GET /wishlist — vide au départ, 2 emplacements de base', async () => {
    const res = await app.inject({ method: 'GET', url: '/wishlist', headers: auth() })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.slots).toBe(2)
    expect(body.cards).toEqual([])
  })

  it('PUT /wishlist/:cardId — ajoute un vœu, prix RARE au PLEIN tarif', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: `/wishlist/${cardIds[0]}`,
      headers: auth(),
    })
    expect(res.statusCode).toBe(204)

    const get = await app.inject({ method: 'GET', url: '/wishlist', headers: auth() })
    const body = get.json()
    expect(body.cards).toHaveLength(1)
    // 2400 (prix boutique RARE) × 2 (wishlist.priceMultiplier), SANS remise.
    expect(body.cards[0].price).toBe(4800)
  })

  it('PUT deux fois la même carte est sans effet (pas de doublon)', async () => {
    await app.inject({ method: 'PUT', url: `/wishlist/${cardIds[0]}`, headers: auth() })
    const get = await app.inject({ method: 'GET', url: '/wishlist', headers: auth() })
    expect(get.json().cards).toHaveLength(1)
  })

  it('PUT — 409 au-delà des emplacements disponibles', async () => {
    const second = await app.inject({
      method: 'PUT',
      url: `/wishlist/${cardIds[1]}`,
      headers: auth(),
    })
    expect(second.statusCode).toBe(204)

    const third = await app.inject({
      method: 'PUT',
      url: `/wishlist/${cardIds[2]}`,
      headers: auth(),
    })
    expect(third.statusCode).toBe(409)
  })

  it('DELETE /wishlist/:cardId — libère un emplacement', async () => {
    const del = await app.inject({
      method: 'DELETE',
      url: `/wishlist/${cardIds[1]}`,
      headers: auth(),
    })
    expect(del.statusCode).toBe(204)

    const res = await app.inject({
      method: 'PUT',
      url: `/wishlist/${cardIds[2]}`,
      headers: auth(),
    })
    expect(res.statusCode).toBe(204)
  })

  it('POST /:cardId/purchase — 402 sans poussière', async () => {
    // biome-ignore lint/suspicious/noExplicitAny: accès au conteneur dans les e2e
    const { postgresOrm } = (app as any).iocContainer
    await postgresOrm.prisma.user.update({ where: { id: userId }, data: { dust: 0 } })

    const res = await app.inject({
      method: 'POST',
      url: `/wishlist/${cardIds[0]}/purchase`,
      headers: auth(),
    })
    expect(res.statusCode).toBe(402)
  })

  it('POST /:cardId/purchase — 400 pour une carte hors wishlist', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/wishlist/${cardIds[5]}/purchase`,
      headers: auth(),
    })
    expect(res.statusCode).toBe(400)
  })

  // Le coeur du changement : plus aucun delai entre deux achats.
  it('POST /:cardId/purchase — deux achats d’affilée passent, sans délai', async () => {
    // biome-ignore lint/suspicious/noExplicitAny: accès au conteneur dans les e2e
    const { postgresOrm } = (app as any).iocContainer
    await postgresOrm.prisma.user.update({
      where: { id: userId },
      data: { dust: 20000 },
    })

    const first = await app.inject({
      method: 'POST',
      url: `/wishlist/${cardIds[0]}/purchase`,
      headers: auth(),
    })
    expect(first.statusCode).toBe(200)
    expect(first.json().dustSpent).toBe(4800)
    expect(first.json().newDustBalance).toBe(15200)

    const second = await app.inject({
      method: 'POST',
      url: `/wishlist/${cardIds[2]}/purchase`,
      headers: auth(),
    })
    expect(second.statusCode).toBe(200)
    expect(second.json().newDustBalance).toBe(10400)
  })

  it('« Collectionneur » niveau 3 porte les emplacements à 5', async () => {
    // biome-ignore lint/suspicious/noExplicitAny: accès au conteneur dans les e2e
    const { postgresOrm } = (app as any).iocContainer
    const prisma = postgresOrm.prisma

    // Le seed est tronqué par globalSetup : on recrée branche et nœud.
    const branch = await prisma.skillBranch.create({
      data: {
        name: `Collection${suffix}`,
        description: 'Dust & Boutique',
        icon: 'Gem',
        color: '#10b981',
        order: 99,
      },
    })
    skillBranchId = branch.id

    const node = await prisma.skillNode.create({
      data: {
        branchId: branch.id,
        name: 'Collectionneur',
        description: 'Emplacements de vœu supplémentaires (2 de base)',
        icon: 'Heart',
        maxLevel: 3,
        effectType: 'WISHLIST_SLOTS',
        posX: 0,
        posY: 0,
        levels: {
          create: [
            { level: 1, effect: 1 },
            { level: 2, effect: 2 },
            { level: 3, effect: 3 },
          ],
        },
      },
    })
    await prisma.userSkill.create({ data: { userId, nodeId: node.id, level: 3 } })

    const res = await app.inject({ method: 'GET', url: '/wishlist', headers: auth() })
    expect(res.json().slots).toBe(5)

    // La wishlist en contenait 2 : trois ajouts de plus doivent passer, le 4e non.
    for (const id of [cardIds[1], cardIds[3], cardIds[4]]) {
      const add = await app.inject({ method: 'PUT', url: `/wishlist/${id}`, headers: auth() })
      expect(add.statusCode).toBe(204)
    }
    const overflow = await app.inject({
      method: 'PUT',
      url: `/wishlist/${cardIds[5]}`,
      headers: auth(),
    })
    expect(overflow.statusCode).toBe(409)
  })
})
