import { describe, expect, it } from '@jest/globals'
import { calculateTokens } from '../../main/domain/economy/economy.domain'

const INTERVAL = 120  // minutes (= 2h)
const MAX = 6

describe('calculateTokens', () => {
  it('retourne 0 tokens et nextTokenAt = maintenant + 2h si lastTokenAt null et tokens 0', () => {
    const before = Date.now()
    const result = calculateTokens(null, 0, INTERVAL, MAX)
    const after = Date.now()
    expect(result.tokens).toBe(0)
    expect(result.newLastTokenAt).not.toBeNull()
    // newLastTokenAt devrait être ~= maintenant (point de départ)
    expect(result.newLastTokenAt!.getTime()).toBeGreaterThanOrEqual(before)
    expect(result.newLastTokenAt!.getTime()).toBeLessThanOrEqual(after)
    // nextTokenAt = maintenant + 2h
    expect(result.nextTokenAt!.getTime()).toBeCloseTo(before + INTERVAL * 60 * 1000, -3)
  })

  it('accorde 1 token après exactement 2h', () => {
    const lastTokenAt = new Date(Date.now() - 120 * 60 * 1000)
    const result = calculateTokens(lastTokenAt, 2, INTERVAL, MAX)
    expect(result.tokens).toBe(3)
    expect(result.newLastTokenAt!.getTime()).toBeCloseTo(lastTokenAt.getTime() + 120 * 60 * 1000, -3)
  })

  it('accorde 2 tokens après 5h (2×2h)', () => {
    const lastTokenAt = new Date(Date.now() - 5 * 60 * 60 * 1000)
    const result = calculateTokens(lastTokenAt, 1, INTERVAL, MAX)
    expect(result.tokens).toBe(3)
  })

  it('ne dépasse pas maxStock', () => {
    const lastTokenAt = new Date(Date.now() - 20 * 60 * 60 * 1000)
    const result = calculateTokens(lastTokenAt, 0, INTERVAL, MAX)
    expect(result.tokens).toBe(6)
    expect(result.nextTokenAt).toBeNull()
  })

  it('nextTokenAt est null si tokens === maxStock', () => {
    const lastTokenAt = new Date(Date.now() - 1000)
    const result = calculateTokens(lastTokenAt, 6, INTERVAL, MAX)
    expect(result.tokens).toBe(6)
    expect(result.nextTokenAt).toBeNull()
  })

  it('reset lastTokenAt à maintenant quand tokens >= maxStock (évite regen fantôme après pull)', () => {
    const staleLastTokenAt = new Date(Date.now() - 10 * 60 * 60 * 1000) // 10h ago
    const before = Date.now()
    const result = calculateTokens(staleLastTokenAt, 5, INTERVAL, MAX)
    const after = Date.now()
    expect(result.tokens).toBe(6)
    // lastTokenAt doit être reset à ~maintenant, pas rester stale
    expect(result.newLastTokenAt!.getTime()).toBeGreaterThanOrEqual(before)
    expect(result.newLastTokenAt!.getTime()).toBeLessThanOrEqual(after)
  })

  it('ne régénère pas immédiatement un token après un pull depuis maxStock', () => {
    // Simule : user était à 6/6 avec lastTokenAt stale (10h ago)
    // Le pull appelle calculateTokens → sauve newLastTokenAt (= now) et tokens-1
    const staleLastTokenAt = new Date(Date.now() - 10 * 60 * 60 * 1000)
    const pullCalc = calculateTokens(staleLastTokenAt, 6, INTERVAL, MAX)
    // Simule ce que le pull sauvegarde en DB
    const savedTokens = pullCalc.tokens - 1 // 5
    const savedLastTokenAt = pullCalc.newLastTokenAt!

    // Simule le refetch balance (quelques ms plus tard)
    const balanceCalc = calculateTokens(savedLastTokenAt, savedTokens, INTERVAL, MAX)
    // Le token NE doit PAS être régénéré immédiatement
    expect(balanceCalc.tokens).toBe(5)
  })

  it('ne régénère pas un token après un pull quand la regen a amené au max', () => {
    // DB: tokens=4, lastTokenAt=10h ago (d'un pull précédent avec ancien code)
    const staleLastTokenAt = new Date(Date.now() - 10 * 60 * 60 * 1000)
    // Le pull recalcule : gained=5, tokens=min(4+5,6)=6 → au max → lastTokenAt reset
    const pullCalc = calculateTokens(staleLastTokenAt, 4, INTERVAL, MAX)
    expect(pullCalc.tokens).toBe(6)

    // Simule ce que le pull sauvegarde en DB
    const savedTokens = pullCalc.tokens - 1 // 5
    const savedLastTokenAt = pullCalc.newLastTokenAt!

    // lastTokenAt doit être ~maintenant, pas dans le passé
    expect(savedLastTokenAt.getTime()).toBeGreaterThanOrEqual(Date.now() - 50)

    // Balance refetch : ne doit PAS régénérer
    const balanceCalc = calculateTokens(savedLastTokenAt, savedTokens, INTERVAL, MAX)
    expect(balanceCalc.tokens).toBe(5)
  })

  it('ne modifie pas lastTokenAt si aucun token gagné', () => {
    const lastTokenAt = new Date(Date.now() - 60 * 60 * 1000) // 1h < 2h
    const result = calculateTokens(lastTokenAt, 2, INTERVAL, MAX)
    expect(result.tokens).toBe(2)
    expect(result.newLastTokenAt!.getTime()).toBeCloseTo(lastTokenAt.getTime(), -3)
  })

  describe('multiTokenChance', () => {
    it('chance 100 double chaque jeton régénéré (plafonné au cap)', () => {
      const past = new Date(Date.now() - 2 * INTERVAL * 60 * 1000)
      const r = calculateTokens(past, 0, INTERVAL, MAX, 100, () => 0)
      expect(r.tokens).toBe(Math.min(4, MAX)) // 2 gagnés + 2 bonus
    })
    it('chance 0 = comportement inchangé', () => {
      const past = new Date(Date.now() - 2 * INTERVAL * 60 * 1000)
      const r = calculateTokens(past, 0, INTERVAL, MAX, 0, () => 0)
      expect(r.tokens).toBe(2)
    })
    it('défauts rétrocompatibles (appel à 4 arguments)', () => {
      const past = new Date(Date.now() - INTERVAL * 60 * 1000)
      expect(calculateTokens(past, 0, INTERVAL, MAX).tokens).toBe(1)
    })
  })
})
