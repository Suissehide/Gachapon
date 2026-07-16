import { describe, expect, it } from '@jest/globals'

import {
  checkWithTimeout,
  serviceStatus,
} from '../../main/domain/health/health-status'

describe('serviceStatus', () => {
  it('ok sous le seuil', () => expect(serviceStatus(true, 100)).toBe('ok'))
  it('degraded au-dessus du seuil', () =>
    expect(serviceStatus(true, 800)).toBe('degraded'))
  it('down si échec quel que soit la latence', () =>
    expect(serviceStatus(false, 10)).toBe('down'))
})

describe('checkWithTimeout', () => {
  it('mesure la latence en succès', async () => {
    const r = await checkWithTimeout(async () => true)
    expect(r.ok).toBe(true)
    expect(r.latencyMs).toBeGreaterThanOrEqual(0)
  })
  it('ok=false si le check throw', async () => {
    const r = await checkWithTimeout(async () => {
      throw new Error('boom')
    })
    expect(r.ok).toBe(false)
  })
  it('ok=false si le check retourne false', async () => {
    const r = await checkWithTimeout(async () => false)
    expect(r.ok).toBe(false)
  })
  it('timeout ⇒ ok=false', async () => {
    const r = await checkWithTimeout(
      () => new Promise((resolve) => setTimeout(() => resolve(true), 200)),
      50,
    )
    expect(r.ok).toBe(false)
  })
  it('rejet tardif après timeout ne lance pas unhandledRejection', async () => {
    const r = await checkWithTimeout(
      () =>
        new Promise<boolean>((_, reject) => {
          setTimeout(() => reject(new Error('late')), 150)
        }),
      50,
    )
    expect(r.ok).toBe(false)
    await new Promise((resolve) => setTimeout(resolve, 200))
  })
})
