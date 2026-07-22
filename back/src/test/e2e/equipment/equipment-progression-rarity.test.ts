import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'

import { buildTestApp } from '../../helpers/build-test-app'

describe('Equipment milestone cascade by rarity', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let cookies: string
  let commonWeaponId: string
  let fullEpicId: string

  const suffix = Date.now()
  const email = `equiprar${suffix}@test.com`
  const password = 'Password123!'
  const username = `equiprar${suffix}`

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

    const commonWeapon = await postgresOrm.prisma.equipment.create({
      data: {
        name: `RarC-${suffix}`,
        slot: 'WEAPON',
        rarity: 'COMMON',
        bonuses: { atkFlat: 5 },
        dropWeight: 10,
      },
    })
    commonWeaponId = (
      await postgresOrm.prisma.userEquipment.create({
        data: { userId: user.id, equipmentId: commonWeapon.id },
      })
    ).id

    const epicWeapon = await postgresOrm.prisma.equipment.create({
      data: {
        name: `RarE-${suffix}`,
        slot: 'WEAPON',
        rarity: 'EPIC',
        bonuses: { atkFlat: 25 },
        dropWeight: 10,
      },
    })
    // Épique déjà au cap universel (4 sous-stats), au niveau 2 : le prochain
    // palier (niveau 3) doit améliorer une existante.
    fullEpicId = (
      await postgresOrm.prisma.userEquipment.create({
        data: {
          userId: user.id,
          equipmentId: epicWeapon.id,
          level: 2,
          substats: [
            { key: 'hpFlat', value: 30 },
            { key: 'atkPct', value: 5 },
            { key: 'defFlat', value: 8 },
            { key: 'spdFlat', value: 4 },
          ],
        },
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

  it('GET /equipment expose baseBoost', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/equipment',
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json() as { items: { id: string; baseBoost: number }[] }
    const common = body.items.find((i) => i.id === commonWeaponId)
    expect(common?.baseBoost).toBe(0)
  })

  it('commune née sans sous-stat : le palier 3 en ajoute une', async () => {
    let last: any = null
    for (let i = 0; i < 3; i++) {
      const res = await app.inject({
        method: 'POST',
        url: `/equipment/${commonWeaponId}/upgrade`,
        headers: { cookie: cookies },
      })
      expect(res.statusCode).toBe(200)
      last = res.json()
    }
    expect(last.level).toBe(4)
    // Palier atteint au niveau 3 (2e upgrade) — le 3e upgrade (niveau 4)
    // n'est pas un palier, donc on vérifie l'état persistant.
    expect(last.substats).toHaveLength(1)
    expect(last.baseBoost).toBe(0)
  })

  it("commune : la réponse du palier lui-même est de type 'added'", async () => {
    // Niveaux 4 → 5 → 6 : le passage à 6 est un palier.
    await app.inject({
      method: 'POST',
      url: `/equipment/${commonWeaponId}/upgrade`,
      headers: { cookie: cookies },
    })
    const res = await app.inject({
      method: 'POST',
      url: `/equipment/${commonWeaponId}/upgrade`,
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.level).toBe(6)
    expect(body.milestone?.type).toBe('added')
    expect(body.substats).toHaveLength(2)
    expect(
      new Set(body.substats.map((s: { key: string }) => s.key)).size,
    ).toBe(2)
    expect(body.baseBoost).toBe(0)
  })

  it('épique à 4 sous-stats : le palier améliore une existante', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/equipment/${fullEpicId}/upgrade`,
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.level).toBe(3)
    expect(body.milestone?.type).toBe('improved')
    expect(body.substats).toHaveLength(4)
    expect(body.baseBoost).toBe(0)
  })
})
