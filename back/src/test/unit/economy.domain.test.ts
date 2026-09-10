import { describe, expect, it } from '@jest/globals'
import {
  calculateTokens,
  effectiveRegenInterval,
} from '../../main/domain/economy/economy.domain'

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

// Task 5 (refonte équipe) : cinq appelants dupliquaient cette arithmétique
// avant l'extraction — l'ORDRE (soustraire, diviser, plancher) est
// l'invariant que ce helper garde. Ce bloc le fixe une fois pour toutes.
//
// Objet nommé plutôt que trois nombres positionnels (revue coordinateur) :
// `intervalMinutes` et `reductionMinutes` sont tous deux des minutes, rien
// ne les distinguait au type-checking si un site d'appel les inversait —
// nommer chaque champ rend une transposition visible à la lecture.
describe('effectiveRegenInterval', () => {
  it('sans réduction ni bonus : identité', () => {
    expect(
      effectiveRegenInterval({
        intervalMinutes: 60,
        reductionMinutes: 0,
        lootBonusPct: 0,
      }),
    ).toBe(60)
  })

  it('réduction du skill tree seule : soustraction simple', () => {
    expect(
      effectiveRegenInterval({
        intervalMinutes: 60,
        reductionMinutes: 15,
        lootBonusPct: 0,
      }),
    ).toBe(45)
  })

  it('bonus d\'équipe seul : diviseur multiplicatif', () => {
    // 60 / 1.10 = 54.545...
    expect(
      effectiveRegenInterval({
        intervalMinutes: 60,
        reductionMinutes: 0,
        lootBonusPct: 10,
      }),
    ).toBeCloseTo(54.545, 3)
  })

  it('les deux ensemble : la soustraction vient AVANT la division', () => {
    // (60 - 15) / 1.10 = 40.909..., PAS (60 / 1.10) - 15 = 39.545...
    const result = effectiveRegenInterval({
      intervalMinutes: 60,
      reductionMinutes: 15,
      lootBonusPct: 10,
    })
    expect(result).toBeCloseTo(40.909, 3)
    expect(result).not.toBeCloseTo(39.545, 3)
  })

  it("intervalMinutes et reductionMinutes transposés change le résultat (la forme nommée rend l'erreur visible au site d'appel, pas au runtime)", () => {
    // Transposer les deux minutes divise par une valeur bien plus grande —
    // le nom du champ, pas le type, est ce qui empêche cette inversion.
    const correct = effectiveRegenInterval({
      intervalMinutes: 60,
      reductionMinutes: 15,
      lootBonusPct: 0,
    })
    const transposed = effectiveRegenInterval({
      intervalMinutes: 15,
      reductionMinutes: 60,
      lootBonusPct: 0,
    })
    expect(transposed).not.toBe(correct)
    // 15 - 60 < 0 → plancher à 1, jamais 45.
    expect(transposed).toBe(1)
  })

  it('rang 5 du bonus loot (2,5 % au barème par défaut) : baisse de 2,5 %', () => {
    const base = effectiveRegenInterval({
      intervalMinutes: 60,
      reductionMinutes: 0,
      lootBonusPct: 0,
    })
    const bonused = effectiveRegenInterval({
      intervalMinutes: 60,
      reductionMinutes: 0,
      lootBonusPct: 2.5,
    })
    expect(bonused).toBeCloseTo(base / 1.025, 6)
  })

  it('le plancher à 1 minute reste le DERNIER mot, même avec un très gros bonus', () => {
    expect(
      effectiveRegenInterval({
        intervalMinutes: 1,
        reductionMinutes: 0,
        lootBonusPct: 100000,
      }),
    ).toBe(1)
  })

  it('une réduction qui dépasserait l\'intervalle ne passe jamais sous le plancher', () => {
    expect(
      effectiveRegenInterval({
        intervalMinutes: 10,
        reductionMinutes: 50,
        lootBonusPct: 0,
      }),
    ).toBe(1)
  })
})
