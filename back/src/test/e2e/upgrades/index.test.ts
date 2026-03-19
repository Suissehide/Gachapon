import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'
import { buildTestApp } from '../../helpers/build-test-app'

describe('Upgrades routes', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let cookies: string
  let userId: string

  const suffix = Date.now()
  const email = `upgrades${suffix}@test.com`
  const password = 'Password123!'
  const username = `upgradesuser${suffix}`

  beforeAll(async () => {
    app = await buildTestApp()

    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username, email, password },
    })
    expect(res.statusCode).toBe(201)
    cookies = res.headers['set-cookie'] as string

    const { postgresOrm } = (app as any).iocContainer
    const user = await postgresOrm.prisma.user.update({
      where: { email },
      data: { dust: 500000 },
    })
    userId = user.id
  })

  afterAll(async () => {
    await app.close()
  })

  it('GET /upgrades — retourne les 4 types à level 0', async () => {
    const res = await app.inject({ method: 'GET', url: '/upgrades', headers: { cookie: cookies } })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(Array.isArray(body)).toBe(true)
    expect(body).toHaveLength(4)
    for (const upgrade of body) {
      expect(upgrade.currentLevel).toBe(0)
      expect(upgrade.isMaxed).toBe(false)
      expect(upgrade.canAfford).toBe(true)
    }
  })

  it('POST /upgrades/REGEN/buy — achète le niveau 1', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/upgrades/REGEN/buy',
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.newLevel).toBe(1)
    expect(body.type).toBe('REGEN')
  })

  it('GET /upgrades — REGEN est maintenant à level 1', async () => {
    const res = await app.inject({ method: 'GET', url: '/upgrades', headers: { cookie: cookies } })
    const body = res.json()
    const regen = body.find((u: any) => u.type === 'REGEN')
    expect(regen.currentLevel).toBe(1)
  })

  it('POST /upgrades/INVALID/buy — 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/upgrades/INVALID/buy',
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(400)
  })

  it('POST /upgrades/REGEN/buy × 3 puis max atteint → 409', async () => {
    for (let i = 0; i < 3; i++) {
      const res = await app.inject({
        method: 'POST', url: '/upgrades/REGEN/buy', headers: { cookie: cookies },
      })
      expect(res.statusCode).toBe(200)
    }
    const res = await app.inject({
      method: 'POST', url: '/upgrades/REGEN/buy', headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(409)
  })
})
