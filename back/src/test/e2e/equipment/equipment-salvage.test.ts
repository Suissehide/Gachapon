import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'

import { buildTestApp } from '../../helpers/build-test-app'

describe('Equipment salvage route', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let cookies: string
  let userId: string
  let commonId: string
  let rareId: string
  let equippedId: string
  let otherUserPieceId: string

  const suffix = Date.now()
  const email = `equipsal${suffix}@test.com`
  const password = 'Password123!'
  const username = `equipsal${suffix}`

  beforeAll(async () => {
    app = await buildTestApp()
    const { postgresOrm } = (app as any).iocContainer

    const reg = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username, email, password },
    })
    expect(reg.statusCode).toBe(201)
    const user = await postgresOrm.prisma.user.update({
      where: { email },
      data: { emailVerifiedAt: new Date(), gold: 0 },
    })
    userId = user.id

    const set = await postgresOrm.prisma.cardSet.create({
      data: { name: `SalvSet${suffix}`, isActive: false },
    })
    const card = await postgresOrm.prisma.card.create({
      data: {
        name: `SalvCard${suffix}`,
        rarity: 'RARE',
        dropWeight: 10,
        setId: set.id,
        baseHp: 200,
        baseAtk: 20,
        baseDef: 10,
        baseSpd: 100,
      },
    })
    const uc = await postgresOrm.prisma.userCard.create({
      data: { userId: user.id, cardId: card.id, variant: 'NORMAL' },
    })

    const mkPiece = (name: string, rarity: string) =>
      postgresOrm.prisma.equipment.create({
        data: {
          name: `${name}-${suffix}`,
          slot: 'WEAPON',
          rarity,
          bonuses: { atkFlat: 5 },
          dropWeight: 10,
        },
      })
    const common = await mkPiece('SalvC', 'COMMON')
    const rare = await mkPiece('SalvR', 'RARE')
    const epic = await mkPiece('SalvE', 'EPIC')

    commonId = (
      await postgresOrm.prisma.userEquipment.create({
        data: { userId: user.id, equipmentId: common.id },
      })
    ).id
    rareId = (
      await postgresOrm.prisma.userEquipment.create({
        data: { userId: user.id, equipmentId: rare.id },
      })
    ).id
    equippedId = (
      await postgresOrm.prisma.userEquipment.create({
        data: { userId: user.id, equipmentId: epic.id, equippedOnId: uc.id },
      })
    ).id

    const other = await postgresOrm.prisma.user.create({
      data: {
        username: `othersal${suffix}`,
        email: `othersal${suffix}@test.com`,
        emailVerifiedAt: new Date(),
      },
    })
    otherUserPieceId = (
      await postgresOrm.prisma.userEquipment.create({
        data: { userId: other.id, equipmentId: common.id },
      })
    ).id

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

  it('refuse un objet équipé (rien détruit)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/equipment/salvage',
      headers: { cookie: cookies, 'content-type': 'application/json' },
      payload: { userEquipmentIds: [commonId, equippedId] },
    })
    expect(res.statusCode).toBe(400)
    const { postgresOrm } = (app as any).iocContainer
    const still = await postgresOrm.prisma.userEquipment.findUnique({
      where: { id: commonId },
    })
    expect(still).not.toBeNull()
  })

  it("refuse l'objet d'un autre utilisateur", async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/equipment/salvage',
      headers: { cookie: cookies, 'content-type': 'application/json' },
      payload: { userEquipmentIds: [otherUserPieceId] },
    })
    expect(res.statusCode).toBe(404)
  })

  it("détruit plusieurs objets et crédite l'or selon la rareté", async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/equipment/salvage',
      headers: { cookie: cookies, 'content-type': 'application/json' },
      payload: { userEquipmentIds: [commonId, rareId] },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    // COMMON 10 + RARE 80
    expect(body.goldEarned).toBe(90)
    expect(body.newGold).toBe(90)
    expect(body.destroyedCount).toBe(2)

    const { postgresOrm } = (app as any).iocContainer
    const remaining = await postgresOrm.prisma.userEquipment.findMany({
      where: { userId },
    })
    expect(remaining.map((r: { id: string }) => r.id)).toEqual([equippedId])
    const user = await postgresOrm.prisma.user.findUnique({
      where: { id: userId },
    })
    expect(user?.gold).toBe(90)
  })
})
