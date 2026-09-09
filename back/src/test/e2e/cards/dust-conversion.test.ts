import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'

import { buildTestApp } from '../../helpers/build-test-app'

describe('POST /cards/:userCardId/dust', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let cookies: string
  let userCardId: string
  let userId: string

  const suffix = Date.now()
  const email = `dust${suffix}@test.com`
  const password = 'Password123!'
  const username = `dustuser${suffix}`

  beforeAll(async () => {
    app = await buildTestApp()
    const { postgresOrm } = (app as any).iocContainer

    const set = await postgresOrm.prisma.cardSet.create({
      data: { name: `DustSet${suffix}`, isActive: false },
    })
    const card = await postgresOrm.prisma.card.create({
      data: {
        name: `DustCard${suffix}`,
        rarity: 'RARE',
        dropWeight: 10,
        setId: set.id,
        baseHp: 200,
        baseAtk: 20,
        baseDef: 10,
        baseSpd: 100,
      },
    })

    const reg = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username, email, password },
    })
    expect(reg.statusCode).toBe(201)

    const user = await postgresOrm.prisma.user.update({
      where: { email },
      data: { emailVerifiedAt: new Date(), dust: 0 },
    })
    userId = user.id

    // Create a UserCard with quantity = 3 (1 base + 2 duplicates)
    const uc = await postgresOrm.prisma.userCard.create({
      data: {
        userId: user.id,
        cardId: card.id,
        variant: 'NORMAL',
        quantity: 3,
      },
    })
    userCardId = uc.id

    const loginRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email, password },
    })
    cookies = loginRes.headers['set-cookie'] as string
  })

  afterAll(async () => {
    await app.close()
  })

  it('converts 2 duplicates of a RARE into dust', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/cards/${userCardId}/dust`,
      headers: { cookie: cookies },
      payload: { amount: 2 },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.dustEarned).toBe(160) // 2 × 80 (RARE)
    expect(body.remainingQuantity).toBe(1)
  })

  it('refuses to convert all copies (must keep 1)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/cards/${userCardId}/dust`,
      headers: { cookie: cookies },
      payload: { amount: 1 },
    })
    expect(res.statusCode).toBe(400)
  })

  it('refuses zero amount', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/cards/${userCardId}/dust`,
      headers: { cookie: cookies },
      payload: { amount: 0 },
    })
    expect(res.statusCode).toBe(400)
  })

  it("refuses someone else's UserCard", async () => {
    const { postgresOrm } = (app as any).iocContainer
    const other = await postgresOrm.prisma.user.create({
      data: {
        email: `other${suffix}@test.com`,
        username: `other${suffix}`,
        emailVerifiedAt: new Date(),
      },
    })
    const set = await postgresOrm.prisma.cardSet.findFirst({
      where: { name: `DustSet${suffix}` },
    })
    const card = await postgresOrm.prisma.card.findFirst({
      where: { setId: set!.id },
    })
    const otherUc = await postgresOrm.prisma.userCard.create({
      data: { userId: other.id, cardId: card!.id, variant: 'NORMAL', quantity: 5 },
    })

    const res = await app.inject({
      method: 'POST',
      url: `/cards/${otherUc.id}/dust`,
      headers: { cookie: cookies },
      payload: { amount: 1 },
    })
    expect(res.statusCode).toBe(404)
  })

  // Tache 7, tour de correction 1 : le verrou des cartes engagees doit
  // couvrir aussi la conversion en poussiere, pas seulement le recyclage.
  // Le duel et le tirage sont inseres directement en base (pas de flux
  // propose/accept/pulls complet) : ce test isole le verrou de
  // card-dust-conversion.domain, le cycle de vie du duel est deja couvert
  // par duels.test.ts.
  it('refuse la conversion sur une carte engagee dans un duel ACTIF -> 409, quantite inchangee', async () => {
    const { postgresOrm } = (app as any).iocContainer

    const lockSet = await postgresOrm.prisma.cardSet.create({
      data: { name: `DustLockSet${suffix}`, isActive: false },
    })
    const lockCard = await postgresOrm.prisma.card.create({
      data: {
        name: `DustLockCard${suffix}`,
        rarity: 'RARE',
        dropWeight: 10,
        setId: lockSet.id,
      },
    })
    const lockUc = await postgresOrm.prisma.userCard.create({
      data: {
        userId,
        cardId: lockCard.id,
        variant: 'NORMAL',
        quantity: 3,
      },
    })

    const opponent = await postgresOrm.prisma.user.create({
      data: {
        email: `dustlockopp${suffix}@test.com`,
        username: `dustlockopp${suffix}`,
        emailVerifiedAt: new Date(),
      },
    })
    const team = await postgresOrm.prisma.team.create({
      data: {
        name: `DustLockTeam${suffix}`,
        slug: `dust-lock-team-${suffix}`,
        ownerId: userId,
      },
    })
    await postgresOrm.prisma.duel.create({
      data: {
        teamId: team.id,
        challengerId: userId,
        opponentId: opponent.id,
        status: 'ACTIVE',
        pullCount: 5,
        acceptedAt: new Date(Date.now() - 60 * 60 * 1000),
        deadlineAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    })
    // Tirage compte pour ce duel : tombe dans les pullCount premiers
    // tirages depuis acceptedAt, donc verrouille lockCard:NORMAL.
    await postgresOrm.prisma.gachaPull.create({
      data: {
        userId,
        cardId: lockCard.id,
        variant: 'NORMAL',
        pulledAt: new Date(),
      },
    })

    const res = await app.inject({
      method: 'POST',
      url: `/cards/${lockUc.id}/dust`,
      headers: { cookie: cookies },
      payload: { amount: 1 },
    })
    expect(res.statusCode).toBe(409)

    const after = await postgresOrm.prisma.userCard.findUniqueOrThrow({
      where: { id: lockUc.id },
    })
    expect(after.quantity).toBe(3)
  })
})
