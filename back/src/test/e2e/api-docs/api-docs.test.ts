import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'
import { buildTestApp } from '../../helpers/build-test-app'

describe('API docs — OpenAPI spec', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>

  beforeAll(async () => {
    app = await buildTestApp()
  })

  afterAll(async () => {
    await app.close()
  })

  it('should serve OpenAPI spec at /openapi.json', async () => {
    const response = await app.inject({ method: 'GET', url: '/openapi.json' })
    expect(response.statusCode).toBe(200)
    const spec = response.json()
    expect(spec.openapi).toMatch(/^3\./)
    expect(spec.info.title).toBe('Gachapon API')
  })

  it('should not expose any admin routes', async () => {
    const response = await app.inject({ method: 'GET', url: '/openapi.json' })
    const spec = response.json()
    const paths = Object.keys(spec.paths ?? {})
    expect(paths.every((p: string) => !p.startsWith('/admin'))).toBe(true)
  })

  it('should annotate protected routes with security schemes', async () => {
    const response = await app.inject({ method: 'GET', url: '/openapi.json' })
    const spec = response.json()
    // POST /pulls requires authentication
    const pullSecurity = spec.paths['/pulls']?.post?.security
    expect(pullSecurity).toEqual(
      expect.arrayContaining([{ cookieAuth: [] }, { apiKeyAuth: [] }]),
    )
  })

  it('should not annotate public routes with security', async () => {
    const response = await app.inject({ method: 'GET', url: '/openapi.json' })
    const spec = response.json()
    // POST /auth/login is public
    const loginSecurity = spec.paths['/auth/login']?.post?.security
    expect(loginSecurity).toBeUndefined()
  })

  it('should define both cookieAuth and apiKeyAuth security schemes', async () => {
    const response = await app.inject({ method: 'GET', url: '/openapi.json' })
    const spec = response.json()
    expect(spec.components.securitySchemes.cookieAuth).toMatchObject({
      type: 'apiKey',
      in: 'cookie',
      name: 'access_token',
    })
    expect(spec.components.securitySchemes.apiKeyAuth).toMatchObject({
      type: 'apiKey',
      in: 'header',
      name: 'X-API-Key',
    })
  })

  it('should not expose /openapi.json in the spec itself', async () => {
    const response = await app.inject({ method: 'GET', url: '/openapi.json' })
    const spec = response.json()
    expect(spec.paths?.['/openapi.json']).toBeUndefined()
  })
})

describe('API docs — rate limit', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>

  beforeAll(async () => {
    app = await buildTestApp()
  })

  afterAll(async () => {
    await app.close()
  })

  it('should include x-ratelimit-limit header on API responses', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' })
    // /health is exempt — header should NOT be present
    expect(response.headers['x-ratelimit-limit']).toBeUndefined()
  })

  it('should include x-ratelimit-limit header on non-exempt routes', async () => {
    const response = await app.inject({ method: 'POST', url: '/auth/login', payload: { email: 'x@x.com', password: 'wrong' } })
    expect(response.headers['x-ratelimit-limit']).toBeDefined()
  })
})
