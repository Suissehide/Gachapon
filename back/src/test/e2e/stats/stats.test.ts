import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'
import { buildTestApp } from '../../helpers/build-test-app'

describe('GET /stats (public)', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>

  beforeAll(async () => {
    app = await buildTestApp()
  })

  afterAll(async () => {
    await app.close()
  })

  it('returns the extended public stats payload', async () => {
    const res = await app.inject({ method: 'GET', url: '/stats' })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    for (const key of [
      'totalUsers',
      'totalPulls',
      'totalCards',
      'activeUsers',
      'legendaryPulls',
      'pullsToday',
      'totalDust',
      'setsCount',
      'legendaryCardsCount',
      'activeToday',
    ]) {
      expect(typeof body[key]).toBe('number')
    }
    expect(Array.isArray(body.recentLegendaries)).toBe(true)
  })
})
