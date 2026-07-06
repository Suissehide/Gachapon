import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'
import { buildTestApp } from '../../helpers/build-test-app'

describe('Wishlist routes', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let cookies: string
  let userId: string
  let rareCardId: string
  let negociantBranchId: string | undefined

  const suffix = Date.now()

  beforeAll(async () => {
    app = await buildTestApp()

    const { postgresOrm } = (app as any).iocContainer
    const prisma = postgresOrm.prisma

    // Register user
    await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        username: `wishlist${suffix}`,
        email: `wishlist${suffix}@test.com`,
        password: 'Password123!',
      },
    })

    // Verify email and give dust
    const user = await prisma.user.update({
      where: { email: `wishlist${suffix}@test.com` },
      data: { emailVerifiedAt: new Date() },
    })
    userId = user.id

    // Create an active card set with a RARE card
    const set = await prisma.cardSet.create({
      data: { name: `WishlistTestSet${suffix}`, isActive: true },
    })
    const rareCard = await prisma.card.create({
      data: {
        setId: set.id,
        name: `RARE-wishlist-${suffix}`,
        rarity: 'RARE',
        dropWeight: 1.0,
      },
    })
    rareCardId = rareCard.id

    // Login
    const loginRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: `wishlist${suffix}@test.com`, password: 'Password123!' },
    })
    cookies = loginRes.headers['set-cookie'] as string
  })

  afterAll(async () => {
    // Clean up skill tree data so it doesn't pollute subsequent test files
    if (negociantBranchId) {
      const { postgresOrm } = (app as any).iocContainer
      await postgresOrm.prisma.skillBranch.delete({ where: { id: negociantBranchId } })
    }
    await app.close()
  })

  it('PUT /wishlist — sets the wish (200 or 204)', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/wishlist',
      headers: { cookie: cookies },
      payload: { cardId: rareCardId },
    })
    expect([200, 204]).toContain(res.statusCode)
  })

  it('GET /wishlist — shows card, price=1000 for RARE, availableAt=null (never purchased)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/wishlist',
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.card).not.toBeNull()
    expect(body.card.id).toBe(rareCardId)
    expect(body.card.rarity).toBe('RARE')
    // RARE base = 500, multiplier = 2 → price = 1000
    expect(body.price).toBe(1000)
    expect(body.availableAt).toBeNull()
    expect(body.cooldownDays).toBe(7)
  })

  it('POST /wishlist/purchase — 402 when user has no dust', async () => {
    const { postgresOrm } = (app as any).iocContainer
    await postgresOrm.prisma.user.update({
      where: { id: userId },
      data: { dust: 0 },
    })

    const res = await app.inject({
      method: 'POST',
      url: '/wishlist/purchase',
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(402)
  })

  it('POST /wishlist/purchase — 200 with enough dust, card NORMAL, availableAt ≈ +7 days', async () => {
    const { postgresOrm } = (app as any).iocContainer
    await postgresOrm.prisma.user.update({
      where: { id: userId },
      data: { dust: 5000 },
    })

    const before = new Date()
    const res = await app.inject({
      method: 'POST',
      url: '/wishlist/purchase',
      headers: { cookie: cookies },
    })
    const after = new Date()

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.card.id).toBe(rareCardId)
    expect(body.dustSpent).toBe(1000)
    expect(typeof body.newDustBalance).toBe('number')
    expect(body.newDustBalance).toBe(4000)
    expect(typeof body.wasDuplicate).toBe('boolean')

    // availableAt ≈ purchasedAt + 7 days
    const availableAt = new Date(body.availableAt)
    const sevenDaysFromBefore = new Date(before.getTime() + 7 * 24 * 60 * 60 * 1000)
    const sevenDaysFromAfter = new Date(after.getTime() + 7 * 24 * 60 * 60 * 1000)
    expect(availableAt.getTime()).toBeGreaterThanOrEqual(sevenDaysFromBefore.getTime() - 1000)
    expect(availableAt.getTime()).toBeLessThanOrEqual(sevenDaysFromAfter.getTime() + 1000)

    // Card should exist in user's collection as NORMAL
    const userCard = await postgresOrm.prisma.userCard.findUnique({
      where: {
        userId_cardId_variant: { userId, cardId: rareCardId, variant: 'NORMAL' },
      },
    })
    expect(userCard).not.toBeNull()
    expect(userCard!.quantity).toBeGreaterThanOrEqual(1)
  })

  it('GET /wishlist — shows availableAt after purchase', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/wishlist',
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.availableAt).not.toBeNull()
    // Should be ~7 days in the future
    const availableAt = new Date(body.availableAt)
    expect(availableAt.getTime()).toBeGreaterThan(Date.now())
  })

  it('POST /wishlist/purchase — 429 on immediate re-purchase', async () => {
    const { postgresOrm } = (app as any).iocContainer
    await postgresOrm.prisma.user.update({
      where: { id: userId },
      data: { dust: 5000 },
    })

    const res = await app.inject({
      method: 'POST',
      url: '/wishlist/purchase',
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(429)
    const body = res.json()
    // availableAt should be in the error message/payload
    expect(body.message).toBeDefined()
  })

  it('Négociant niv 2 reduces effective cooldown to 5 days', async () => {
    const { postgresOrm } = (app as any).iocContainer
    const prisma = postgresOrm.prisma

    // Create a SkillBranch and Négociant SkillNode (seed is truncated in globalSetup)
    const branch = await prisma.skillBranch.create({
      data: {
        name: `Collection${suffix}`,
        description: 'Dust & Boutique',
        icon: 'Gem',
        color: '#10b981',
        order: 99,
      },
    })
    negociantBranchId = branch.id

    const negociantNode = await prisma.skillNode.create({
      data: {
        branchId: branch.id,
        name: 'Négociant',
        description: 'Réduit le délai du vœu (wishlist)',
        icon: 'Handshake',
        maxLevel: 2,
        effectType: 'WISHLIST_COOLDOWN',
        posX: 0,
        posY: 0,
        levels: {
          create: [
            { level: 1, effect: 1 },
            { level: 2, effect: 2 },
          ],
        },
      },
    })

    // Invest Négociant at level 2 (INSERT UserSkill by node)
    await prisma.userSkill.create({
      data: { userId, nodeId: negociantNode.id, level: 2 },
    })

    // Set wishlistPurchasedAt to 6 days ago → effectiveCooldown = max(1, 7-2) = 5d < 6d → available
    const sixDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
    await prisma.user.update({
      where: { id: userId },
      data: { wishlistPurchasedAt: sixDaysAgo, dust: 5000 },
    })

    // GET should show availableAt=null (cooldown expired)
    const getRes = await app.inject({
      method: 'GET',
      url: '/wishlist',
      headers: { cookie: cookies },
    })
    expect(getRes.statusCode).toBe(200)
    const getBody = getRes.json()
    expect(getBody.availableAt).toBeNull()

    // POST /wishlist/purchase should succeed (cooldown elapsed with Négociant)
    const purchaseRes = await app.inject({
      method: 'POST',
      url: '/wishlist/purchase',
      headers: { cookie: cookies },
    })
    expect(purchaseRes.statusCode).toBe(200)
    const purchaseBody = purchaseRes.json()
    // availableAt should be ≈ now + 5 days (not +7)
    const availableAt = new Date(purchaseBody.availableAt)
    const fiveDaysFromNow = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
    // Within ±1 minute of 5 days
    expect(Math.abs(availableAt.getTime() - fiveDaysFromNow.getTime())).toBeLessThan(60 * 1000)
  })

  it('PUT /wishlist — 404 for unknown card', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/wishlist',
      headers: { cookie: cookies },
      payload: { cardId: '00000000-0000-0000-0000-000000000000' },
    })
    expect(res.statusCode).toBe(404)
  })

  it('GET /economy/config — includes wishlist block', async () => {
    const res = await app.inject({ method: 'GET', url: '/economy/config' })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.wishlist).toBeDefined()
    expect(body.wishlist.priceMultiplier).toBe(2)
    expect(body.wishlist.cooldownDays).toBe(7)
  })
})
