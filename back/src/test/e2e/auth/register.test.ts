import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import { buildTestApp } from '../../helpers/build-test-app.js'

describe('POST /auth/register', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  const suffix = Date.now()

  beforeAll(async () => { app = await buildTestApp() })
  afterAll(async () => { await app.close() })

  it('returns 201 with user and sets cookies', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username: `testuser${suffix}`, email: `test${suffix}@example.com`, password: 'Password123!' },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body).toHaveProperty('id')
    expect(body).toHaveProperty('username', `testuser${suffix}`)
    expect(body).not.toHaveProperty('passwordHash')
    expect(res.cookies.find((c: any) => c.name === 'access_token')).toBeDefined()
    expect(res.cookies.find((c: any) => c.name === 'refresh_token')).toBeDefined()
  })

  it('returns 409 if email already taken', async () => {
    const dupEmail = `dup${suffix}@example.com`
    await app.inject({
      method: 'POST', url: '/auth/register',
      payload: { username: `other${suffix}`, email: dupEmail, password: 'Password123!' },
    })
    const res = await app.inject({
      method: 'POST', url: '/auth/register',
      payload: { username: `other2${suffix}`, email: dupEmail, password: 'Password123!' },
    })
    expect(res.statusCode).toBe(409)
  })
})
