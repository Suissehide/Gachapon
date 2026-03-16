import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import { buildTestApp } from '../../helpers/build-test-app.js'

describe('API Keys', () => {
  let app: any
  let accessCookie: string

  beforeAll(async () => {
    app = await buildTestApp()
    const res = await app.inject({
      method: 'POST', url: '/auth/register',
      payload: { username: `apikeyuser_${Date.now()}`, email: `apikey_${Date.now()}@example.com`, password: 'Password123!' },
    })
    accessCookie = res.cookies.find((c: any) => c.name === 'access_token')?.value ?? ''
  })
  afterAll(async () => { await app.close() })

  it('creates an API key with gp_ prefix', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api-keys',
      cookies: { access_token: accessCookie },
      payload: { name: 'My bot' },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json().key).toMatch(/^gp_/)
  })

  it('authenticates via X-API-Key header', async () => {
    const createRes = await app.inject({
      method: 'POST', url: '/api-keys',
      cookies: { access_token: accessCookie },
      payload: { name: 'Test key' },
    })
    const { key } = createRes.json()
    const meRes = await app.inject({
      method: 'GET', url: '/auth/me',
      headers: { 'x-api-key': key },
    })
    expect(meRes.statusCode).toBe(200)
    expect(meRes.json()).toHaveProperty('username')
  })
})
