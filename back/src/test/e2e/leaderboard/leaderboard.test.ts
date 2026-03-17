import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'
import { buildTestApp } from '../../helpers/build-test-app'

describe('Leaderboard route', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let cookies: string

  const suffix = Date.now()

  beforeAll(async () => {
    app = await buildTestApp()
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        username: `lb${suffix}`,
        email: `lb${suffix}@test.com`,
        password: 'Password123!',
      },
    })
    cookies = res.headers['set-cookie'] as string
  })

  afterAll(() => app.close())

  it('GET /leaderboard — retourne les 3 classements', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/leaderboard',
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(Array.isArray(body.collectors)).toBe(true)
    expect(Array.isArray(body.legendaries)).toBe(true)
    expect(Array.isArray(body.bestTeams)).toBe(true)
  })

  it('GET /leaderboard — 401 sans auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/leaderboard' })
    expect(res.statusCode).toBe(401)
  })
})
