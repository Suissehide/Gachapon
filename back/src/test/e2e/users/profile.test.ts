import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'
import { buildTestApp } from '../../helpers/build-test-app'

describe('User profile route', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let cookies: string
  let username: string

  const suffix = Date.now()

  beforeAll(async () => {
    app = await buildTestApp()
    username = `prof${suffix}`
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        username,
        email: `prof${suffix}@test.com`,
        password: 'Password123!',
      },
    })
    cookies = res.headers['set-cookie'] as string
  })

  afterAll(() => app.close())

  it('GET /users/:username/profile — retourne le profil public', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/users/${username}/profile`,
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.username).toBe(username)
    expect(typeof body.level).toBe('number')
    expect(typeof body.stats.totalPulls).toBe('number')
    expect(typeof body.stats.ownedCards).toBe('number')
    expect(typeof body.stats.legendaryCount).toBe('number')
    expect(typeof body.stats.dustGenerated).toBe('number')
  })

  it('GET /users/inexistant/profile — 404', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/users/inexistant_user_xyz/profile',
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(404)
  })

  it('GET /users/:username/profile — 401 sans auth', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/users/${username}/profile`,
    })
    expect(res.statusCode).toBe(401)
  })
})
