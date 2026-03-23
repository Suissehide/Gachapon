import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'
import { buildTestApp } from '../../helpers/build-test-app'

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
