import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'
import { buildTestApp } from '../../helpers/build-test-app'

describe('POST /collection/recycle-all', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let cookies: string
  let userId: string
  let commonId: string
  let rareId: string
  let epicId: string

  const suffix = Date.now()

  beforeAll(async () => {
    app = await buildTestApp()
    const { postgresOrm } = (app as any).iocContainer

    const set = await postgresOrm.prisma.cardSet.create({
      data: { nameFr: `BulkSet${suffix}`, nameEn: `BulkSet${suffix}`, isActive: true },
    })
    const common = await postgresOrm.prisma.card.create({
      data: { nameFr: `BulkCommon${suffix}`, nameEn: `BulkCommon${suffix}`, rarity: 'COMMON', dropWeight: 10, setId: set.id },
    })
    const rare = await postgresOrm.prisma.card.create({
      data: { nameFr: `BulkRare${suffix}`, nameEn: `BulkRare${suffix}`, rarity: 'RARE', dropWeight: 5, setId: set.id },
    })
    const epic = await postgresOrm.prisma.card.create({
      data: { nameFr: `BulkEpic${suffix}`, nameEn: `BulkEpic${suffix}`, rarity: 'EPIC', dropWeight: 2, setId: set.id },
    })
    commonId = common.id
    rareId = rare.id
    epicId = epic.id

    await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        username: `bulk${suffix}`,
        email: `bulk${suffix}@test.com`,
        password: 'Password123!',
      },
    })
    const user = await postgresOrm.prisma.user.update({
      where: { email: `bulk${suffix}@test.com` },
      data: { emailVerifiedAt: new Date() },
    })
    userId = user.id

    // Doublons : COMMON ×4, RARE ×5 (vernis Brillant débloqué), EPIC ×5
    await postgresOrm.prisma.userCard.createMany({
      data: [
        { userId, cardId: commonId, quantity: 4 },
        { userId, cardId: rareId, quantity: 5, finishes: ['BRILLIANT'] },
        { userId, cardId: epicId, quantity: 5 },
      ],
    })

    const loginRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: `bulk${suffix}@test.com`, password: 'Password123!' },
    })
    cookies = loginRes.headers['set-cookie'] as string
  })

  afterAll(() => app.close())

  it('401 sans authentification', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/collection/recycle-all',
      payload: { maxRarity: 'RARE' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('recycle les doublons <= seuil, vernis compris, garde 1 copie et ses vernis, épargne EPIC', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/collection/recycle-all',
      headers: { cookie: cookies },
      payload: { maxRarity: 'RARE' },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    // COMMON : 3 copies × 10 = 30 ; RARE : 4 copies × 80 = 320
    expect(body.cardsRecycled).toBe(7)
    expect(body.dustEarned).toBe(350)
    expect(typeof body.newDustTotal).toBe('number')

    const { postgresOrm } = (app as any).iocContainer
    const cards = await postgresOrm.prisma.userCard.findMany({
      where: { userId },
    })
    const byCard = new Map(cards.map((c: any) => [c.cardId, c]))
    expect(byCard.get(commonId).quantity).toBe(1)
    expect(byCard.get(rareId).quantity).toBe(1)
    expect(byCard.get(rareId).finishes).toEqual(['BRILLIANT'])
    expect(byCard.get(epicId).quantity).toBe(5) // au-dessus du seuil
  })

  it('second appel : plus rien à recycler → dustEarned 0 sans erreur', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/collection/recycle-all',
      headers: { cookie: cookies },
      payload: { maxRarity: 'RARE' },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.dustEarned).toBe(0)
    expect(body.cardsRecycled).toBe(0)
  })

  it('400 si maxRarity invalide', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/collection/recycle-all',
      headers: { cookie: cookies },
      payload: { maxRarity: 'MYTHIC' },
    })
    expect(res.statusCode).toBe(400)
  })
})
