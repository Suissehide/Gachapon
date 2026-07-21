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

describe('Equipment initial substats on grant', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let cookies: string
  let userId: string
  let legendaryId: string
  let commonId: string

  const suffix = Date.now()
  const email = `equipinit${suffix}@test.com`
  const password = 'Password123!'
  const username = `equipinit${suffix}`

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
      data: { emailVerifiedAt: new Date() },
    })
    userId = user.id

    legendaryId = (
      await postgresOrm.prisma.equipment.create({
        data: {
          name: `InitL-${suffix}`,
          slot: 'WEAPON',
          rarity: 'LEGENDARY',
          bonuses: { atkFlat: 40 },
          dropWeight: 1,
        },
      })
    ).id
    commonId = (
      await postgresOrm.prisma.equipment.create({
        data: {
          name: `InitC-${suffix}`,
          slot: 'WEAPON',
          rarity: 'COMMON',
          bonuses: { atkFlat: 5 },
          dropWeight: 50,
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

  it('un légendaire naît avec 4 sous-stats distinctes dans leurs ranges', async () => {
    const { equipmentDomain } = (app as any).iocContainer
    const { userEquipmentId } = await equipmentDomain.grantToUser(
      userId,
      legendaryId,
    )

    const res = await app.inject({
      method: 'GET',
      url: '/equipment',
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json() as {
      items: {
        id: string
        level: number
        baseBoost: number
        substats: { key: string; value: number }[]
      }[]
    }
    const item = body.items.find((i) => i.id === userEquipmentId)
    expect(item).toBeDefined()
    expect(item?.level).toBe(1)
    expect(item?.baseBoost).toBe(0)
    expect(item?.substats).toHaveLength(4)
    const keys = item?.substats.map((s) => s.key) ?? []
    expect(new Set(keys).size).toBe(4)
    for (const s of item?.substats ?? []) {
      const range = SUBSTAT_RANGES[s.key]
      expect(range).toBeDefined()
      expect(s.value).toBeGreaterThanOrEqual(range!.min)
      expect(s.value).toBeLessThanOrEqual(range!.max)
    }
  })

  it('une commune naît sans sous-stat', async () => {
    const { equipmentDomain } = (app as any).iocContainer
    const { userEquipmentId } = await equipmentDomain.grantToUser(
      userId,
      commonId,
    )

    const res = await app.inject({
      method: 'GET',
      url: '/equipment',
      headers: { cookie: cookies },
    })
    const body = res.json() as {
      items: { id: string; substats: unknown[] }[]
    }
    const item = body.items.find((i) => i.id === userEquipmentId)
    expect(item?.substats).toEqual([])
  })
})
