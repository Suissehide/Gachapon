import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'
import { buildTestApp } from '../../helpers/build-test-app'

describe('Shop routes', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let cookies: string
  let userId: string

  const suffix = Date.now()

  beforeAll(async () => {
    app = await buildTestApp()
    await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        username: `shop${suffix}`,
        email: `shop${suffix}@test.com`,
        password: 'Password123!',
      },
    })
    const { postgresOrm } = (app as any).iocContainer
    const user = await postgresOrm.prisma.user.update({
      where: { email: `shop${suffix}@test.com` },
      data: { emailVerifiedAt: new Date() },
    })
    userId = user.id
    const loginRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: `shop${suffix}@test.com`, password: 'Password123!' },
    })
    cookies = loginRes.headers['set-cookie'] as string
  })

  afterAll(() => app.close())

  it('GET /shop — liste les articles actifs', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/shop',
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(Array.isArray(body.items)).toBe(true)
  })

  it('POST /shop/:id/buy — 402 si pas assez de dust', async () => {
    const { postgresOrm } = (app as any).iocContainer

    // Create a simple TOKEN_PACK item for testing
    const item = await postgresOrm.prisma.shopItem.create({
      data: {
        name: 'Test Token Pack',
        description: 'A test token pack',
        type: 'TOKEN_PACK',
        cost: 1000,
        value: { tokens: 100 },
        isActive: true,
      },
    })

    const res = await app.inject({
      method: 'POST',
      url: `/shop/${item.id}/buy`,
      headers: { cookie: cookies },
    })
    // L'utilisateur n'a pas de dust → 402
    expect(res.statusCode).toBe(402)
  })

  it('POST /shop/:id/buy — 200 si assez de dust', async () => {
    const { postgresOrm } = (app as any).iocContainer

    // Create a simple TOKEN_PACK item for testing
    const item = await postgresOrm.prisma.shopItem.create({
      data: {
        name: 'Test Token Pack 2',
        description: 'Another test token pack',
        type: 'TOKEN_PACK',
        cost: 100,
        value: { tokens: 50 },
        isActive: true,
      },
    })

    // Donner du dust à l'utilisateur
    await postgresOrm.prisma.user.update({
      where: { id: userId },
      data: { dust: item.cost + 100 },
    })

    const res = await app.inject({
      method: 'POST',
      url: `/shop/${item.id}/buy`,
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(typeof body.newDustTotal).toBe('number')
    expect(body.newDustTotal).toBe(100)
  })

  it('POST /shop/:id/buy — 402 si pas assez d\'or (TOKEN_PACK en GOLD)', async () => {
    const { postgresOrm } = (app as any).iocContainer

    const item = await postgresOrm.prisma.shopItem.create({
      data: {
        name: 'Gold Pack',
        description: 'Token pack bought with gold',
        type: 'TOKEN_PACK',
        cost: 1000,
        currency: 'GOLD',
        value: { tokens: 100 },
        isActive: true,
      },
    })

    // Give plenty of dust but no gold — must NOT be buyable with dust.
    await postgresOrm.prisma.user.update({
      where: { id: userId },
      data: { dust: 100000, gold: 0 },
    })

    const res = await app.inject({
      method: 'POST',
      url: `/shop/${item.id}/buy`,
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(402)
  })

  it('POST /shop/:id/buy — 200 débite l\'or et crédite les tokens (TOKEN_PACK en GOLD)', async () => {
    const { postgresOrm } = (app as any).iocContainer

    const item = await postgresOrm.prisma.shopItem.create({
      data: {
        name: 'Gold Pack 2',
        description: 'Token pack bought with gold',
        type: 'TOKEN_PACK',
        cost: 500,
        currency: 'GOLD',
        value: { tokens: 50 },
        isActive: true,
      },
    })

    const before = await postgresOrm.prisma.user.update({
      where: { id: userId },
      data: { gold: 700, tokens: 0 },
    })

    const res = await app.inject({
      method: 'POST',
      url: `/shop/${item.id}/buy`,
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.currency).toBe('GOLD')
    expect(body.amountSpent).toBe(500)
    expect(body.newGoldTotal).toBe(before.gold - 500)
    expect(body.newTokenTotal).toBe(50)

    // A gold purchase records currency=GOLD and doesn't touch dust.
    const purchase = await postgresOrm.prisma.purchase.findFirst({
      where: { userId, shopItemId: item.id },
    })
    expect(purchase!.currency).toBe('GOLD')
    expect(purchase!.amountSpent).toBe(500)
  })

  it('POST /shop/:id/buy — 404 si article inexistant', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/shop/00000000-0000-0000-0000-000000000000/buy',
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(404)
  })

  it('POST /shop/:id/buy — 409 si machine déjà possédée', async () => {
    const { postgresOrm } = (app as any).iocContainer

    // Create a MACHINE shop item
    const machineItem = await postgresOrm.prisma.shopItem.create({
      data: {
        name: 'Gashapon',
        description: 'Machine Gashapon',
        type: 'MACHINE',
        cost: 500,
        value: { machineId: 'gashapon' },
        isActive: true,
      },
    })

    // Give dust
    await postgresOrm.prisma.user.update({
      where: { id: userId },
      data: { dust: 5000 },
    })

    // First purchase — should succeed
    const res1 = await app.inject({
      method: 'POST',
      url: `/shop/${machineItem.id}/buy`,
      headers: { cookie: cookies },
    })
    expect(res1.statusCode).toBe(200)

    // Second purchase — should fail with 409
    const res2 = await app.inject({
      method: 'POST',
      url: `/shop/${machineItem.id}/buy`,
      headers: { cookie: cookies },
    })
    expect(res2.statusCode).toBe(409)
  })

  it('GET /shop/machines — liste les machines possédées', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/shop/machines',
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(Array.isArray(body.machineIds)).toBe(true)
    // From the previous test, user bought a gashapon machine
    expect(body.machineIds).toContain('gashapon')
  })

  it('POST /shop/:id/buy — crée un UserBoost (weightMultiplier) pour Boost Rare+', async () => {
    const { postgresOrm } = (app as any).iocContainer

    // Create a weight multiplier BOOST item
    const boostItem = await postgresOrm.prisma.shopItem.create({
      data: {
        name: 'Boost Rare+',
        description: 'Boost with weight multiplier',
        type: 'BOOST',
        cost: 500,
        value: { multiplier: 2, rarity: 'RARE', pulls: 10 },
        isActive: true,
      },
    })

    // Give enough dust
    await postgresOrm.prisma.user.update({
      where: { id: userId },
      data: { dust: boostItem.cost + 500 },
    })

    const res = await app.inject({
      method: 'POST',
      url: `/shop/${boostItem.id}/buy`,
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)

    // Assert UserBoost row was created
    const userBoost = await postgresOrm.prisma.userBoost.findFirst({
      where: { userId, weightMultiplier: { not: null } },
    })
    expect(userBoost).not.toBeNull()
    expect(userBoost!.weightMultiplier).toBe(2)
    expect(userBoost!.weightRarity).toBe('RARE')
    expect(userBoost!.pullsRemaining).toBe(10)
    expect(userBoost!.satisfied).toBe(false)
  })

  it('POST /shop/:id/buy — 409 si boost de poids déjà actif', async () => {
    const { postgresOrm } = (app as any).iocContainer

    // Create another weight multiplier BOOST item to test conflict
    const boostItem = await postgresOrm.prisma.shopItem.create({
      data: {
        name: 'Boost Rare+ Conflict',
        description: 'Another boost with weight multiplier',
        type: 'BOOST',
        cost: 500,
        value: { multiplier: 1.5, rarity: 'RARE', pulls: 5 },
        isActive: true,
      },
    })

    // Give enough dust
    await postgresOrm.prisma.user.update({
      where: { id: userId },
      data: { dust: boostItem.cost + 500 },
    })

    const res = await app.inject({
      method: 'POST',
      url: `/shop/${boostItem.id}/buy`,
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(409)
  })

  it('POST /shop/:id/buy — racheter le même boost cumule pullsRemaining', async () => {
    const { postgresOrm } = (app as any).iocContainer

    const boostItem = await postgresOrm.prisma.shopItem.create({
      data: {
        name: 'Boost Rare+ Cumul',
        description: 'Boost with weight multiplier',
        type: 'BOOST',
        cost: 200,
        value: { multiplier: 2, rarity: 'RARE', pulls: 10 },
        isActive: true,
      },
    })
    await postgresOrm.prisma.userBoost.deleteMany({ where: { userId } })
    await postgresOrm.prisma.user.update({
      where: { id: userId },
      data: { dust: boostItem.cost * 2 + 500 },
    })

    const first = await app.inject({
      method: 'POST',
      url: `/shop/${boostItem.id}/buy`,
      headers: { cookie: cookies },
    })
    expect(first.statusCode).toBe(200)

    const second = await app.inject({
      method: 'POST',
      url: `/shop/${boostItem.id}/buy`,
      headers: { cookie: cookies },
    })
    expect(second.statusCode).toBe(200)

    const rows = await postgresOrm.prisma.userBoost.findMany({
      where: { userId, weightRarity: 'RARE', pullsRemaining: { gt: 0 } },
    })
    expect(rows).toHaveLength(1)
    expect(rows[0].pullsRemaining).toBe(20)
  })

  it('POST /shop/:id/buy — deux boosts de raretés différentes coexistent', async () => {
    const { postgresOrm } = (app as any).iocContainer

    const epicBoost = await postgresOrm.prisma.shopItem.create({
      data: {
        name: 'Boost Épique Coexist',
        description: 'Boost with weight multiplier on EPIC',
        type: 'BOOST',
        cost: 500,
        value: { multiplier: 3, rarity: 'EPIC', pulls: 10 },
        isActive: true,
      },
    })
    // Le test précédent laisse un boost RARE actif (20 tirages)
    await postgresOrm.prisma.user.update({
      where: { id: userId },
      data: { dust: epicBoost.cost + 500 },
    })

    const res = await app.inject({
      method: 'POST',
      url: `/shop/${epicBoost.id}/buy`,
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)

    const rows = await postgresOrm.prisma.userBoost.findMany({
      where: { userId, weightMultiplier: { not: null }, pullsRemaining: { gt: 0 } },
    })
    const rarities = rows.map((r: { weightRarity: string }) => r.weightRarity).sort()
    expect(rarities).toEqual(['EPIC', 'RARE'])
  })

  it('POST /shop/:id/buy — crée un UserBoost (guaranteedRarity) pour Boost Épique', async () => {
    const { postgresOrm } = (app as any).iocContainer

    // Create a guaranteed rarity BOOST item
    const boostItem = await postgresOrm.prisma.shopItem.create({
      data: {
        name: 'Boost Épique',
        description: 'Boost with guaranteed epic rarity',
        type: 'BOOST',
        cost: 800,
        value: { guaranteedRarity: 'EPIC', pulls: 5 },
        isActive: true,
      },
    })

    // Give enough dust
    await postgresOrm.prisma.user.update({
      where: { id: userId },
      data: { dust: boostItem.cost + 500 },
    })

    const res = await app.inject({
      method: 'POST',
      url: `/shop/${boostItem.id}/buy`,
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)

    // Assert UserBoost row was created
    const userBoost = await postgresOrm.prisma.userBoost.findFirst({
      where: { userId, guaranteedRarity: { not: null } },
    })
    expect(userBoost).not.toBeNull()
    expect(userBoost!.guaranteedRarity).toBe('EPIC')
    expect(userBoost!.pullsRemaining).toBe(5)
    expect(userBoost!.satisfied).toBe(false)
  })

  it('POST /shop/:id/buy — 500 si BOOST item value est vide (ni multiplier ni guaranteedRarity)', async () => {
    const { postgresOrm } = (app as any).iocContainer

    // Create a malformed BOOST item with empty value
    const malformedItem = await postgresOrm.prisma.shopItem.create({
      data: {
        name: 'Malformed Boost',
        description: 'A boost with invalid value',
        type: 'BOOST',
        cost: 100,
        value: {}, // Empty object — no multiplier, no guaranteedRarity
        isActive: true,
      },
    })

    // Give dust to the user
    const userBefore = await postgresOrm.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    })
    const dustBefore = userBefore.dust
    await postgresOrm.prisma.user.update({
      where: { id: userId },
      data: { dust: dustBefore + 500 },
    })

    // Attempt to purchase — should return 500 (internal error)
    const res = await app.inject({
      method: 'POST',
      url: `/shop/${malformedItem.id}/buy`,
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(500)

    // Verify dust was NOT debited (transaction should have rolled back)
    const userAfter = await postgresOrm.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    })
    expect(userAfter.dust).toBe(dustBefore + 500)
  })

  it('POST /shop/:id/buy — ENERGY_PACK crédite les PC avec overcap', async () => {
    const { postgresOrm } = (app as any).iocContainer

    const item = await postgresOrm.prisma.shopItem.create({
      data: {
        name: 'Petite recharge test',
        description: '+15 points de combat',
        type: 'ENERGY_PACK',
        cost: 75,
        currency: 'DUST',
        value: { combatPoints: 15 },
        isActive: true,
      },
    })

    // Utilisateur au plafond (60 par défaut) : le crédit doit overcap à 75.
    await postgresOrm.prisma.user.update({
      where: { id: userId },
      data: { dust: 200, combatPoints: 60, lastCombatPointAt: new Date() },
    })

    const res = await app.inject({
      method: 'POST',
      url: `/shop/${item.id}/buy`,
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.newDustTotal).toBe(125)
    expect(body.newCombatPoints).toBe(75)

    const dbUser = await postgresOrm.prisma.user.findUnique({
      where: { id: userId },
    })
    expect(dbUser.combatPoints).toBe(75)
  })

  it('POST /shop/:id/buy — ENERGY_PACK 402 si pas assez de poussière', async () => {
    const { postgresOrm } = (app as any).iocContainer

    const item = await postgresOrm.prisma.shopItem.create({
      data: {
        name: 'Recharge test',
        description: '+40 points de combat',
        type: 'ENERGY_PACK',
        cost: 180,
        currency: 'DUST',
        value: { combatPoints: 40 },
        isActive: true,
      },
    })

    await postgresOrm.prisma.user.update({
      where: { id: userId },
      data: { dust: 10 },
    })

    const res = await app.inject({
      method: 'POST',
      url: `/shop/${item.id}/buy`,
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(402)
  })

  it('POST /shop/:id/buy — ENERGY_PACK mal configuré (combatPoints manquant) → 500', async () => {
    const { postgresOrm } = (app as any).iocContainer

    const item = await postgresOrm.prisma.shopItem.create({
      data: {
        name: 'Recharge cassée',
        description: 'value invalide',
        type: 'ENERGY_PACK',
        cost: 10,
        currency: 'DUST',
        value: {},
        isActive: true,
      },
    })

    await postgresOrm.prisma.user.update({
      where: { id: userId },
      data: { dust: 100 },
    })

    const res = await app.inject({
      method: 'POST',
      url: `/shop/${item.id}/buy`,
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(500)
  })

  it('POST /shop/:id/buy — ENERGY_PACK 429 au-delà du cap journalier', async () => {
    const { postgresOrm } = (app as any).iocContainer

    const item = await postgresOrm.prisma.shopItem.create({
      data: {
        name: 'Recharge cap test',
        description: '+15 points de combat',
        type: 'ENERGY_PACK',
        cost: 10,
        currency: 'DUST',
        value: { combatPoints: 15 },
        isActive: true,
      },
    })

    await postgresOrm.prisma.user.update({
      where: { id: userId },
      data: { dust: 10_000 },
    })
    // Purge les achats d'énergie du user faits par les tests précédents
    await postgresOrm.prisma.purchase.deleteMany({
      where: { userId, shopItem: { type: 'ENERGY_PACK' } },
    })

    // Cap par défaut : 3. Les 3 premiers passent, le 4e est refusé.
    for (let i = 0; i < 3; i++) {
      const ok = await app.inject({
        method: 'POST',
        url: `/shop/${item.id}/buy`,
        headers: { cookie: cookies },
      })
      expect(ok.statusCode).toBe(200)
    }
    const blocked = await app.inject({
      method: 'POST',
      url: `/shop/${item.id}/buy`,
      headers: { cookie: cookies },
    })
    expect(blocked.statusCode).toBe(429)

    // Un achat d'hier ne compte pas dans le cap du jour
    await postgresOrm.prisma.purchase.updateMany({
      where: { userId, shopItem: { type: 'ENERGY_PACK' } },
      data: { purchasedAt: new Date(Date.now() - 25 * 3600 * 1000) },
    })
    const again = await app.inject({
      method: 'POST',
      url: `/shop/${item.id}/buy`,
      headers: { cookie: cookies },
    })
    expect(again.statusCode).toBe(200)
  })

  it('GET /shop — expose energyDaily { cap, used }', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/shop',
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.energyDaily.cap).toBe(3)
    expect(typeof body.energyDaily.used).toBe('number')
    expect(body.energyDaily.used).toBeGreaterThanOrEqual(1)
  })
})
