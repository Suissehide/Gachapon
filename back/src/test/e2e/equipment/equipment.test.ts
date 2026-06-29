import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'

import { buildTestApp } from '../../helpers/build-test-app'

describe('Equipment routes', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let cookies: string
  let userId: string
  let userCardId: string
  let weaponInstanceA: string
  let weaponInstanceB: string
  let armorInstance: string

  const suffix = Date.now()
  const email = `equip${suffix}@test.com`
  const password = 'Password123!'
  const username = `equipuser${suffix}`

  beforeAll(async () => {
    app = await buildTestApp()
    const { postgresOrm } = (app as any).iocContainer

    const set = await postgresOrm.prisma.cardSet.create({
      data: { name: `EquipSet${suffix}`, isActive: false },
    })
    const card = await postgresOrm.prisma.card.create({
      data: {
        name: `EquipCard${suffix}`,
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
      data: { emailVerifiedAt: new Date() },
    })
    userId = user.id

    const uc = await postgresOrm.prisma.userCard.create({
      data: {
        userId: user.id,
        cardId: card.id,
        variant: 'NORMAL',
        quantity: 1,
        level: 1,
        palier: 1,
      },
    })
    userCardId = uc.id

    const w1 = await postgresOrm.prisma.equipment.create({
      data: {
        name: `EquipW1-${suffix}`,
        slot: 'WEAPON',
        rarity: 'COMMON',
        bonuses: { atkFlat: 5 },
        dropWeight: 50,
      },
    })
    const w2 = await postgresOrm.prisma.equipment.create({
      data: {
        name: `EquipW2-${suffix}`,
        slot: 'WEAPON',
        rarity: 'UNCOMMON',
        bonuses: { atkFlat: 8 },
        dropWeight: 25,
      },
    })
    const a1 = await postgresOrm.prisma.equipment.create({
      data: {
        name: `EquipA1-${suffix}`,
        slot: 'ARMOR',
        rarity: 'COMMON',
        bonuses: { defFlat: 3, hpPct: 2 },
        dropWeight: 50,
      },
    })

    const ueW1 = await postgresOrm.prisma.userEquipment.create({
      data: { userId: user.id, equipmentId: w1.id },
    })
    const ueW2 = await postgresOrm.prisma.userEquipment.create({
      data: { userId: user.id, equipmentId: w2.id },
    })
    const ueA1 = await postgresOrm.prisma.userEquipment.create({
      data: { userId: user.id, equipmentId: a1.id },
    })
    weaponInstanceA = ueW1.id
    weaponInstanceB = ueW2.id
    armorInstance = ueA1.id

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

  it('GET /equipment — lists 3 items, none equipped initially', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/equipment',
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json() as {
      items: {
        id: string
        equippedOnId: string | null
        bonuses: Record<string, number>
      }[]
    }
    expect(body.items).toHaveLength(3)
    expect(body.items.every((i) => i.equippedOnId === null)).toBe(true)
    const weaponA = body.items.find((i) => i.id === weaponInstanceA)
    expect(weaponA?.bonuses).toEqual({ atkFlat: 5 })
  })

  it('POST /equip — equips weapon A on the card', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/equipment/${weaponInstanceA}/equip`,
      headers: { cookie: cookies, 'content-type': 'application/json' },
      payload: { targetUserCardId: userCardId },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.equippedOnId).toBe(userCardId)
    expect(body.previouslyEquippedId).toBeNull()
  })

  it('POST /equip — re-equipping weapon A on same card is a no-op (still equipped)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/equipment/${weaponInstanceA}/equip`,
      headers: { cookie: cookies, 'content-type': 'application/json' },
      payload: { targetUserCardId: userCardId },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.equippedOnId).toBe(userCardId)
    expect(body.previouslyEquippedId).toBeNull()
  })

  it('POST /equip — equipping weapon B on same card unequips weapon A (same slot)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/equipment/${weaponInstanceB}/equip`,
      headers: { cookie: cookies, 'content-type': 'application/json' },
      payload: { targetUserCardId: userCardId },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.equippedOnId).toBe(userCardId)
    expect(body.previouslyEquippedId).toBe(weaponInstanceA)
  })

  it('GET /equipment — reflects weapon B equipped, weapon A & armor not', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/equipment',
      headers: { cookie: cookies },
    })
    const body = res.json() as { items: { id: string; equippedOnId: string | null }[] }
    const wA = body.items.find((i) => i.id === weaponInstanceA)
    const wB = body.items.find((i) => i.id === weaponInstanceB)
    const aA = body.items.find((i) => i.id === armorInstance)
    expect(wA?.equippedOnId).toBeNull()
    expect(wB?.equippedOnId).toBe(userCardId)
    expect(aA?.equippedOnId).toBeNull()
  })

  it('POST /equip — armor on same card uses a different slot, both stay equipped', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/equipment/${armorInstance}/equip`,
      headers: { cookie: cookies, 'content-type': 'application/json' },
      payload: { targetUserCardId: userCardId },
    })
    expect(res.statusCode).toBe(200)
    const list = await app.inject({
      method: 'GET',
      url: '/equipment',
      headers: { cookie: cookies },
    })
    const items = (list.json() as { items: { id: string; equippedOnId: string | null }[] }).items
    expect(items.find((i) => i.id === weaponInstanceB)?.equippedOnId).toBe(userCardId)
    expect(items.find((i) => i.id === armorInstance)?.equippedOnId).toBe(userCardId)
  })

  it("POST /equip — refuses someone else's UserEquipment", async () => {
    const { postgresOrm } = (app as any).iocContainer
    const other = await postgresOrm.prisma.user.create({
      data: {
        email: `equip-other${suffix}@test.com`,
        username: `equip-other${suffix}`,
        emailVerifiedAt: new Date(),
      },
    })
    const fakeEquip = await postgresOrm.prisma.equipment.create({
      data: {
        name: `OtherEquip-${suffix}`,
        slot: 'WEAPON',
        rarity: 'COMMON',
        bonuses: { atkFlat: 1 },
        dropWeight: 1,
      },
    })
    const otherUe = await postgresOrm.prisma.userEquipment.create({
      data: { userId: other.id, equipmentId: fakeEquip.id },
    })

    const res = await app.inject({
      method: 'POST',
      url: `/equipment/${otherUe.id}/equip`,
      headers: { cookie: cookies, 'content-type': 'application/json' },
      payload: { targetUserCardId: userCardId },
    })
    expect(res.statusCode).toBe(404)
  })

  it('POST /equip — refuses target card belonging to another user', async () => {
    const { postgresOrm } = (app as any).iocContainer
    const other = await postgresOrm.prisma.user.create({
      data: {
        email: `equip-other2${suffix}@test.com`,
        username: `equip-other2${suffix}`,
        emailVerifiedAt: new Date(),
      },
    })
    const set = await postgresOrm.prisma.cardSet.findFirst({
      where: { name: `EquipSet${suffix}` },
    })
    const card = await postgresOrm.prisma.card.findFirst({
      where: { setId: set!.id },
    })
    const otherUc = await postgresOrm.prisma.userCard.create({
      data: {
        userId: other.id,
        cardId: card!.id,
        variant: 'NORMAL',
        quantity: 1,
        level: 1,
        palier: 1,
      },
    })

    // Need a non-equipped item to test the cross-user target check; weapon A is currently free.
    const res = await app.inject({
      method: 'POST',
      url: `/equipment/${weaponInstanceA}/equip`,
      headers: { cookie: cookies, 'content-type': 'application/json' },
      payload: { targetUserCardId: otherUc.id },
    })
    expect(res.statusCode).toBe(404)
    void userId
  })

  it('POST /unequip — unequips weapon B (was equipped)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/equipment/${weaponInstanceB}/unequip`,
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ unequipped: true })
  })

  it('POST /unequip again — returns unequipped: false (idempotent)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/equipment/${weaponInstanceB}/unequip`,
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ unequipped: false })
  })
})
