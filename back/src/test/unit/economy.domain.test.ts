import { describe, expect, it } from '@jest/globals'
import { calculateTokens } from '../../main/domain/economy/economy.domain'

const INTERVAL = 240  // minutes (= 4h)
const MAX = 5

describe('calculateTokens', () => {
  it('retourne 0 tokens et nextTokenAt = maintenant + 4h si lastTokenAt null et tokens 0', () => {
    const before = Date.now()
    const result = calculateTokens(null, 0, INTERVAL, MAX)
    const after = Date.now()
    expect(result.tokens).toBe(0)
    expect(result.newLastTokenAt).not.toBeNull()
    // newLastTokenAt devrait être ~= maintenant (point de départ)
    expect(result.newLastTokenAt!.getTime()).toBeGreaterThanOrEqual(before)
    expect(result.newLastTokenAt!.getTime()).toBeLessThanOrEqual(after)
    // nextTokenAt = maintenant + 4h
    expect(result.nextTokenAt!.getTime()).toBeCloseTo(before + INTERVAL * 60 * 1000, -3)
  })

  it('accorde 1 token après exactement 4h', () => {
    const lastTokenAt = new Date(Date.now() - 240 * 60 * 1000)
    const result = calculateTokens(lastTokenAt, 2, INTERVAL, MAX)
    expect(result.tokens).toBe(3)
    expect(result.newLastTokenAt!.getTime()).toBeCloseTo(lastTokenAt.getTime() + 240 * 60 * 1000, -3)
  })

  it('accorde 2 tokens après 9h (2×4h)', () => {
    const lastTokenAt = new Date(Date.now() - 9 * 60 * 60 * 1000)
    const result = calculateTokens(lastTokenAt, 1, INTERVAL, MAX)
    expect(result.tokens).toBe(3)
  })

  it('ne dépasse pas maxStock', () => {
    const lastTokenAt = new Date(Date.now() - 20 * 60 * 60 * 1000)
    const result = calculateTokens(lastTokenAt, 0, INTERVAL, MAX)
    expect(result.tokens).toBe(5)
    expect(result.nextTokenAt).toBeNull()
  })

  it('nextTokenAt est null si tokens === maxStock', () => {
    const lastTokenAt = new Date(Date.now() - 1000)
    const result = calculateTokens(lastTokenAt, 5, INTERVAL, MAX)
    expect(result.tokens).toBe(5)
    expect(result.nextTokenAt).toBeNull()
  })

  it('reset lastTokenAt à maintenant quand tokens >= maxStock (évite regen fantôme après pull)', () => {
    const staleLastTokenAt = new Date(Date.now() - 10 * 60 * 60 * 1000) // 10h ago
    const before = Date.now()
    const result = calculateTokens(staleLastTokenAt, 5, INTERVAL, MAX)
    const after = Date.now()
    expect(result.tokens).toBe(5)
    // lastTokenAt doit être reset à ~maintenant, pas rester stale
    expect(result.newLastTokenAt!.getTime()).toBeGreaterThanOrEqual(before)
    expect(result.newLastTokenAt!.getTime()).toBeLessThanOrEqual(after)
  })

  it('ne régénère pas immédiatement un token après un pull depuis maxStock', () => {
    // Simule : user était à 5/5 avec lastTokenAt stale (10h ago)
    // Le pull appelle calculateTokens → sauve newLastTokenAt (= now) et tokens-1
    const staleLastTokenAt = new Date(Date.now() - 10 * 60 * 60 * 1000)
    const pullCalc = calculateTokens(staleLastTokenAt, 5, INTERVAL, MAX)
    // Simule ce que le pull sauvegarde en DB
    const savedTokens = pullCalc.tokens - 1 // 4
    const savedLastTokenAt = pullCalc.newLastTokenAt!

    // Simule le refetch balance (quelques ms plus tard)
    const balanceCalc = calculateTokens(savedLastTokenAt, savedTokens, INTERVAL, MAX)
    // Le token NE doit PAS être régénéré immédiatement
    expect(balanceCalc.tokens).toBe(4)
  })

  it('ne modifie pas lastTokenAt si aucun token gagné', () => {
    const lastTokenAt = new Date(Date.now() - 60 * 60 * 1000) // 1h < 4h
    const result = calculateTokens(lastTokenAt, 2, INTERVAL, MAX)
    expect(result.tokens).toBe(2)
    expect(result.newLastTokenAt!.getTime()).toBeCloseTo(lastTokenAt.getTime(), -3)
  })
})
