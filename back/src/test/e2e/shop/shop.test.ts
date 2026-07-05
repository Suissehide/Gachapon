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
        dustCost: 1000,
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
        dustCost: 100,
        value: { tokens: 50 },
        isActive: true,
      },
    })

    // Donner du dust à l'utilisateur
    await postgresOrm.prisma.user.update({
      where: { id: userId },
      data: { dust: item.dustCost + 100 },
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
        dustCost: 500,
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
        dustCost: 500,
        value: { multiplier: 2, rarity: 'RARE', pulls: 10 },
        isActive: true,
      },
    })

    // Give enough dust
    await postgresOrm.prisma.user.update({
      where: { id: userId },
      data: { dust: boostItem.dustCost + 500 },
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
        dustCost: 500,
        value: { multiplier: 1.5, rarity: 'RARE', pulls: 5 },
        isActive: true,
      },
    })

    // Give enough dust
    await postgresOrm.prisma.user.update({
      where: { id: userId },
      data: { dust: boostItem.dustCost + 500 },
    })

    const res = await app.inject({
      method: 'POST',
      url: `/shop/${boostItem.id}/buy`,
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(409)
  })

  it('POST /shop/:id/buy — crée un UserBoost (guaranteedRarity) pour Boost Épique', async () => {
    const { postgresOrm } = (app as any).iocContainer

    // Create a guaranteed rarity BOOST item
    const boostItem = await postgresOrm.prisma.shopItem.create({
      data: {
        name: 'Boost Épique',
        description: 'Boost with guaranteed epic rarity',
        type: 'BOOST',
        dustCost: 800,
        value: { guaranteedRarity: 'EPIC', pulls: 5 },
        isActive: true,
      },
    })

    // Give enough dust
    await postgresOrm.prisma.user.update({
      where: { id: userId },
      data: { dust: boostItem.dustCost + 500 },
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
        dustCost: 100,
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
})
