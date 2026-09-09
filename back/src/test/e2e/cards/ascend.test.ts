import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'

import {
  MAX_PALIER,
  maxLevelInPalier,
} from '../../../main/domain/card-leveling/card-leveling.domain'
import { buildTestApp } from '../../helpers/build-test-app'

describe('POST /cards/:userCardId/ascend', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let cookies: string
  let userCardId: string
  let cardId: string
  let userId: string

  const suffix = Date.now()
  const email = `ascend${suffix}@test.com`
  const password = 'Password123!'
  const username = `ascenduser${suffix}`

  beforeAll(async () => {
    app = await buildTestApp()
    const { postgresOrm } = (app as any).iocContainer

    const set = await postgresOrm.prisma.cardSet.create({
      data: { name: `AscendSet${suffix}`, isActive: false },
    })
    const card = await postgresOrm.prisma.card.create({
      data: {
        name: `AscendCard${suffix}`,
        rarity: 'RARE',
        dropWeight: 10,
        setId: set.id,
        baseHp: 200,
        baseAtk: 20,
        baseDef: 10,
        baseSpd: 100,
      },
    })
    cardId = card.id

    const reg = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username, email, password },
    })
    expect(reg.statusCode).toBe(201)

    const user = await postgresOrm.prisma.user.update({
      where: { email },
      data: { emailVerifiedAt: new Date() },
    })
    userId = user.id

    const uc = await postgresOrm.prisma.userCard.create({
      data: {
        userId: user.id,
        cardId: card.id,
        variant: 'NORMAL',
        quantity: 3,
        level: 10, // at top of palier 1
        palier: 1,
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

  it('ascends from palier 1 to 2 (consumes 1 doublon)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/cards/${userCardId}/ascend`,
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.newPalier).toBe(2)
    expect(body.doublonsSpent).toBe(1)
    expect(body.remainingQuantity).toBe(2)
  })

  it('refuses ascending from below top of palier', async () => {
    const { postgresOrm } = (app as any).iocContainer

    // Reset our UserCard to the middle of palier 1
    await postgresOrm.prisma.userCard.update({
      where: { id: userCardId },
      data: { level: 5, palier: 1, quantity: 3 },
    })

    const res = await app.inject({
      method: 'POST',
      url: `/cards/${userCardId}/ascend`,
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(400)
  })

  it('refuses ascending when no doublons (quantity == 1)', async () => {
    const { postgresOrm } = (app as any).iocContainer
    await postgresOrm.prisma.userCard.update({
      where: { id: userCardId },
      data: { quantity: 1, level: 20, palier: 2 },
    })

    const res = await app.inject({
      method: 'POST',
      url: `/cards/${userCardId}/ascend`,
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(400)
  })

  it(`refuses ascending when already at max palier (${MAX_PALIER})`, async () => {
    const { postgresOrm } = (app as any).iocContainer
    await postgresOrm.prisma.userCard.update({
      where: { id: userCardId },
      data: {
        quantity: 5,
        level: maxLevelInPalier(MAX_PALIER),
        palier: MAX_PALIER,
      },
    })

    const res = await app.inject({
      method: 'POST',
      url: `/cards/${userCardId}/ascend`,
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(400)
  })

  it("refuses someone else's UserCard", async () => {
    const { postgresOrm } = (app as any).iocContainer
    const other = await postgresOrm.prisma.user.create({
      data: {
        email: `ascend-other${suffix}@test.com`,
        username: `ascend-other${suffix}`,
        emailVerifiedAt: new Date(),
      },
    })
    const otherUc = await postgresOrm.prisma.userCard.create({
      data: {
        userId: other.id,
        cardId,
        variant: 'NORMAL',
        quantity: 3,
        level: 10,
        palier: 1,
      },
    })
    const res = await app.inject({
      method: 'POST',
      url: `/cards/${otherUc.id}/ascend`,
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(404)
  })

  // Tache 7, tour de correction 1 : le verrou des cartes engagees doit
  // couvrir aussi l'ascension, pas seulement le recyclage. Le duel et le
  // tirage sont inseres directement en base (pas de flux
  // propose/accept/pulls complet) : ce test isole le verrou de
  // card-ascension.tx, le cycle de vie du duel est deja couvert par
  // duels.test.ts. La carte est creee au sommet de son palier (level 10,
  // palier 1) avec quantite 2 : ca franchit les gardes de precondition
  // (palier max, sommet de palier, doublon disponible) pour que le 409
  // observe vienne bien du verrou, pas d'un echec de setup.
  it("refuse l'ascension sur une carte engagee dans un duel ACTIF -> 409, quantite et palier inchanges", async () => {
    const { postgresOrm } = (app as any).iocContainer

    const lockSet = await postgresOrm.prisma.cardSet.create({
      data: { name: `AscendLockSet${suffix}`, isActive: false },
    })
    const lockCard = await postgresOrm.prisma.card.create({
      data: {
        name: `AscendLockCard${suffix}`,
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
        quantity: 2,
        level: 10, // sommet du palier 1
        palier: 1,
      },
    })

    const opponent = await postgresOrm.prisma.user.create({
      data: {
        email: `ascendlockopp${suffix}@test.com`,
        username: `ascendlockopp${suffix}`,
        emailVerifiedAt: new Date(),
      },
    })
    const team = await postgresOrm.prisma.team.create({
      data: {
        name: `AscendLockTeam${suffix}`,
        slug: `ascend-lock-team-${suffix}`,
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
      url: `/cards/${lockUc.id}/ascend`,
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(409)

    const after = await postgresOrm.prisma.userCard.findUniqueOrThrow({
      where: { id: lockUc.id },
    })
    expect(after.quantity).toBe(2)
    expect(after.palier).toBe(1)
  })
})
