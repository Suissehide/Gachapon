import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'

import { buildTestApp } from '../../helpers/build-test-app'

const SUBSTAT_RANGES: Record<string, { min: number; max: number }> = {
  hpFlat: { min: 20, max: 60 },
  hpPct: { min: 3, max: 8 },
  atkFlat: { min: 5, max: 15 },
  atkPct: { min: 3, max: 8 },
  defFlat: { min: 5, max: 15 },
  defPct: { min: 3, max: 8 },
  spdFlat: { min: 3, max: 9 },
  spdPct: { min: 3, max: 8 },
}

describe('Equipment upgrade route', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let cookies: string
  let userId: string
  let rareWeaponId: string
  let otherUserWeaponId: string

  const suffix = Date.now()
  const email = `equipup${suffix}@test.com`
  const password = 'Password123!'
  const username = `equipup${suffix}`

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
      data: { emailVerifiedAt: new Date(), gold: 100000 },
    })
    userId = user.id

    const weapon = await postgresOrm.prisma.equipment.create({
      data: {
        name: `UpgradeW-${suffix}`,
        slot: 'WEAPON',
        rarity: 'RARE',
        bonuses: { atkFlat: 10 },
        dropWeight: 10,
      },
    })
    const ue = await postgresOrm.prisma.userEquipment.create({
      data: { userId: user.id, equipmentId: weapon.id },
    })
    rareWeaponId = ue.id

    const other = await postgresOrm.prisma.user.create({
      data: {
        username: `otherup${suffix}`,
        email: `otherup${suffix}@test.com`,
        emailVerifiedAt: new Date(),
      },
    })
    const otherUe = await postgresOrm.prisma.userEquipment.create({
      data: { userId: other.id, equipmentId: weapon.id },
    })
    otherUserWeaponId = otherUe.id

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

  it('niveau 1 → 2 : déduit le coût en or, pas de palier', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/equipment/${rareWeaponId}/upgrade`,
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.level).toBe(2)
    // 25 × 1.35^0 × 1.7 (RARE) = 42.5 → 43
    expect(body.goldSpent).toBe(43)
    expect(body.newGold).toBe(100000 - 43)
    expect(body.substats).toEqual([])
    expect(body.milestone).toBeNull()
  })

  it('niveau 2 → 3 : palier, ajoute une sous-stat dans sa range', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/equipment/${rareWeaponId}/upgrade`,
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.level).toBe(3)
    expect(body.substats).toHaveLength(1)
    expect(body.milestone.type).toBe('added')
    const { key, rolledValue } = body.milestone
    const range = SUBSTAT_RANGES[key]
    expect(range).toBeDefined()
    expect(rolledValue).toBeGreaterThanOrEqual(range!.min)
    expect(rolledValue).toBeLessThanOrEqual(range!.max)
    expect(body.substats[0]).toEqual({ key, value: rolledValue })
  })

  it("refuse si l'or est insuffisant", async () => {
    const { postgresOrm } = (app as any).iocContainer
    await postgresOrm.prisma.user.update({
      where: { id: userId },
      data: { gold: 0 },
    })
    const res = await app.inject({
      method: 'POST',
      url: `/equipment/${rareWeaponId}/upgrade`,
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(400)
    await postgresOrm.prisma.user.update({
      where: { id: userId },
      data: { gold: 100000 },
    })
  })

  it('refuse au niveau maximum', async () => {
    const { postgresOrm } = (app as any).iocContainer
    await postgresOrm.prisma.userEquipment.update({
      where: { id: rareWeaponId },
      data: { level: 12 },
    })
    const res = await app.inject({
      method: 'POST',
      url: `/equipment/${rareWeaponId}/upgrade`,
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(400)
  })

  it("refuse l'objet d'un autre utilisateur", async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/equipment/${otherUserWeaponId}/upgrade`,
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(404)
  })
})
