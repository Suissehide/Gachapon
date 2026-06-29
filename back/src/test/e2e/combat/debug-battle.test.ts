import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'

import { buildTestApp } from '../../helpers/build-test-app'

describe('POST /combat/debug/battle', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let userCookies: string
  let adminCookies: string

  const suffix = Date.now()

  beforeAll(async () => {
    app = await buildTestApp()
    const { postgresOrm } = (app as any).iocContainer

    // Regular user
    const regUser = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        username: `dbguser${suffix}`,
        email: `dbguser${suffix}@test.com`,
        password: 'Password123!',
      },
    })
    expect(regUser.statusCode).toBe(201)
    await postgresOrm.prisma.user.update({
      where: { email: `dbguser${suffix}@test.com` },
      data: { emailVerifiedAt: new Date() },
    })
    const userLogin = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: `dbguser${suffix}@test.com`,
        password: 'Password123!',
      },
    })
    userCookies = userLogin.headers['set-cookie'] as string

    // Admin user
    const regAdmin = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        username: `dbgadmin${suffix}`,
        email: `dbgadmin${suffix}@test.com`,
        password: 'Password123!',
      },
    })
    expect(regAdmin.statusCode).toBe(201)
    await postgresOrm.prisma.user.update({
      where: { email: `dbgadmin${suffix}@test.com` },
      data: { emailVerifiedAt: new Date(), role: 'SUPER_ADMIN' },
    })
    const adminLogin = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: `dbgadmin${suffix}@test.com`,
        password: 'Password123!',
      },
    })
    adminCookies = adminLogin.headers['set-cookie'] as string
  })

  afterAll(async () => {
    await app.close()
  })

  const sampleTeam = (idPrefix: string) => [
    {
      id: `${idPrefix}0`,
      hp: 100,
      atk: 20,
      def: 10,
      spd: 100,
      attackPattern: 'BASIC' as const,
      passiveKey: null,
      palier: 1,
    },
    {
      id: `${idPrefix}1`,
      hp: 100,
      atk: 20,
      def: 10,
      spd: 95,
      attackPattern: 'BASIC' as const,
      passiveKey: null,
      palier: 1,
    },
    {
      id: `${idPrefix}2`,
      hp: 100,
      atk: 20,
      def: 10,
      spd: 90,
      attackPattern: 'BASIC' as const,
      passiveKey: null,
      palier: 1,
    },
  ]

  it('refuses non-SUPER_ADMIN with 403', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/combat/debug/battle',
      headers: { cookie: userCookies, 'content-type': 'application/json' },
      payload: {
        teamA: sampleTeam('A'),
        teamB: sampleTeam('B'),
        seed: 'test-seed',
      },
    })
    expect(res.statusCode).toBe(403)
  })

  it('returns deterministic result for SUPER_ADMIN', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/combat/debug/battle',
      headers: { cookie: adminCookies, 'content-type': 'application/json' },
      payload: {
        teamA: sampleTeam('A'),
        teamB: sampleTeam('B'),
        seed: 'test-seed-deterministic',
      },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json() as {
      won: 'A' | 'B' | null
      log: unknown[]
      turns: number
    }
    expect(['A', 'B', null]).toContain(body.won)
    expect(Array.isArray(body.log)).toBe(true)
    expect(body.log.length).toBeGreaterThan(0)
  })

  it('same seed + same teams → identical log', async () => {
    const payload = {
      teamA: sampleTeam('A'),
      teamB: sampleTeam('B'),
      seed: 'identical-seed-12345',
    }
    const res1 = await app.inject({
      method: 'POST',
      url: '/combat/debug/battle',
      headers: { cookie: adminCookies, 'content-type': 'application/json' },
      payload,
    })
    const res2 = await app.inject({
      method: 'POST',
      url: '/combat/debug/battle',
      headers: { cookie: adminCookies, 'content-type': 'application/json' },
      payload,
    })
    expect(res1.statusCode).toBe(200)
    expect(res2.statusCode).toBe(200)
    expect(res1.json()).toEqual(res2.json())
  })
})
