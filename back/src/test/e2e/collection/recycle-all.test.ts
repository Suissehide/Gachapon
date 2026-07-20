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
      data: { name: `BulkSet${suffix}`, isActive: true },
    })
    const common = await postgresOrm.prisma.card.create({
      data: { name: `BulkCommon${suffix}`, rarity: 'COMMON', dropWeight: 10, setId: set.id },
    })
    const rare = await postgresOrm.prisma.card.create({
      data: { name: `BulkRare${suffix}`, rarity: 'RARE', dropWeight: 5, setId: set.id },
    })
    const epic = await postgresOrm.prisma.card.create({
      data: { name: `BulkEpic${suffix}`, rarity: 'EPIC', dropWeight: 2, setId: set.id },
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

    // Doublons : COMMON ×4, RARE ×3 (NORMAL), RARE ×2 (BRILLIANT), EPIC ×5
    await postgresOrm.prisma.userCard.createMany({
      data: [
        { userId, cardId: commonId, variant: 'NORMAL', quantity: 4 },
        { userId, cardId: rareId, variant: 'NORMAL', quantity: 3 },
        { userId, cardId: rareId, variant: 'BRILLIANT', quantity: 2 },
        { userId, cardId: epicId, variant: 'NORMAL', quantity: 5 },
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

  it('recycle les doublons NORMAL <= seuil, garde 1 copie, épargne BRILLIANT et EPIC', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/collection/recycle-all',
      headers: { cookie: cookies },
      payload: { maxRarity: 'RARE' },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    // COMMON : 3 copies × 10 = 30 ; RARE NORMAL : 2 copies × 80 = 160
    expect(body.cardsRecycled).toBe(5)
    expect(body.dustEarned).toBe(190)
    expect(typeof body.newDustTotal).toBe('number')

    const { postgresOrm } = (app as any).iocContainer
    const cards = await postgresOrm.prisma.userCard.findMany({
      where: { userId },
    })
    const byKey = new Map(
      cards.map((c: any) => [`${c.cardId}-${c.variant}`, c.quantity]),
    )
    expect(byKey.get(`${commonId}-NORMAL`)).toBe(1)
    expect(byKey.get(`${rareId}-NORMAL`)).toBe(1)
    expect(byKey.get(`${rareId}-BRILLIANT`)).toBe(2) // variante épargnée
    expect(byKey.get(`${epicId}-NORMAL`)).toBe(5) // au-dessus du seuil
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
