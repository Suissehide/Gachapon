import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'

import { buildTestApp } from '../../helpers/build-test-app'

describe('admin raid routes', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let prisma: any
  let cookies: string
  const suffix = Date.now()
  const email = `raidadmin${suffix}@test.com`

  beforeAll(async () => {
    app = await buildTestApp()
    prisma = (app as any).iocContainer.postgresOrm.prisma
    await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username: `raidadmin${suffix}`, email, password: 'Password123!' },
    })
    await prisma.user.update({
      where: { email },
      data: { role: 'SUPER_ADMIN', emailVerifiedAt: new Date() },
    })
    const login = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email, password: 'Password123!' },
    })
    cookies = login.headers['set-cookie'] as string

    await prisma.raidBoss.upsert({
      where: { element: 'WATER' },
      create: {
        element: 'WATER',
        name: 'Nérée',
        spec: {
          baseHp: 100, baseAtk: 10, baseDef: 5, baseSpd: 100, level: 1, palier: 1,
          attackPattern: 'BASIC', passiveKey: null, element: 'WATER',
          appearance: 'monsters/bosses/BOSS-011', mitigationScale: 1,
        },
      },
      update: {},
    })
    const existing = await prisma.raidTier.findUnique({ where: { pct: 50 } })
    if (!existing) {
      const reward = await prisma.reward.create({ data: { tokens: 10, gold: 400, dust: 100 } })
      await prisma.raidTier.create({ data: { pct: 50, rewardId: reward.id } })
    }
  })

  afterAll(() => app.close())

  it('GET /admin/raid/bosses liste les boss avec leur spec', async () => {
    const res = await app.inject({ method: 'GET', url: '/admin/raid/bosses', headers: { cookie: cookies } })
    expect(res.statusCode).toBe(200)
    const water = res.json().bosses.find((b: any) => b.element === 'WATER')
    expect(water.name).toBe('Nérée')
    expect(water.spec.appearance).toBe('monsters/bosses/BOSS-011')
  })

  it('PATCH /admin/raid/bosses/:element met à jour nom et spec', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/admin/raid/bosses/WATER',
      headers: { cookie: cookies },
      payload: {
        name: 'Nérée, la Marée',
        spec: {
          baseHp: 100, baseAtk: 20, baseDef: 5, baseSpd: 100, level: 1, palier: 1,
          attackPattern: 'AOE_3', passiveKey: null, element: 'WATER',
          appearance: 'monsters/bosses/BOSS-015', mitigationScale: 2,
        },
      },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().name).toBe('Nérée, la Marée')
    expect(res.json().spec.baseAtk).toBe(20)
    expect(res.json().spec.appearance).toBe('monsters/bosses/BOSS-015')
  })

  it('PATCH /admin/raid/bosses/LIGHT est refusé (pas de boss hors cycle)', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/admin/raid/bosses/LIGHT',
      headers: { cookie: cookies },
      payload: { name: 'x' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('GET + PATCH /admin/raid/tiers', async () => {
    const list = await app.inject({ method: 'GET', url: '/admin/raid/tiers', headers: { cookie: cookies } })
    expect(list.statusCode).toBe(200)
    expect(list.json().tiers.some((t: any) => t.pct === 50)).toBe(true)

    const patch = await app.inject({
      method: 'PATCH',
      url: '/admin/raid/tiers/50',
      headers: { cookie: cookies },
      payload: { gold: 450, cardRarity: 'RARE' },
    })
    expect(patch.statusCode).toBe(200)
    expect(patch.json()).toMatchObject({ pct: 50, gold: 450, cardRarity: 'RARE', tokens: 10 })
  })

  it('PATCH /admin/raid/tiers/33 → 404', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/admin/raid/tiers/33',
      headers: { cookie: cookies },
      payload: { gold: 1 },
    })
    expect(res.statusCode).toBe(404)
  })

  it('refuse un non-admin', async () => {
    const res = await app.inject({ method: 'GET', url: '/admin/raid/bosses' })
    expect(res.statusCode).toBe(401)
  })
})
