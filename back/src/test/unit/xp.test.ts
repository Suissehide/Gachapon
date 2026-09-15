import { describe, expect, it } from '@jest/globals'

import {
  calculateLevel,
  levelAfterXpGain,
  xpForLevel,
} from '../../main/domain/shared/xp'

describe('xp arithmetic curve', () => {
  // XP(n→n+1) = base + slope·(n−1) ; cumulée C(n) = base·(n−1) + slope·(n−1)(n−2)/2
  describe('xpForLevel', () => {
    it('level 1 costs 0', () => {
      expect(xpForLevel(1)).toBe(0)
    })
    it('level 2 costs base (100)', () => {
      expect(xpForLevel(2)).toBe(100)
    })
    it('level 3 costs 100 + 130 = 230', () => {
      expect(xpForLevel(3)).toBe(230)
    })
    it('level 10 costs 900 + 30·36 = 1980', () => {
      expect(xpForLevel(10)).toBe(1980)
    })
    it('honors custom base/slope', () => {
      expect(xpForLevel(3, 50, 10)).toBe(110) // 50 + 60
    })
  })

  describe('calculateLevel', () => {
    it('0 xp → level 1', () => {
      expect(calculateLevel(0)).toBe(1)
    })
    it('just below a threshold stays below', () => {
      expect(calculateLevel(99)).toBe(1)
      expect(calculateLevel(229)).toBe(2)
    })
    it('exact threshold levels up', () => {
      expect(calculateLevel(100)).toBe(2)
      expect(calculateLevel(230)).toBe(3)
      expect(calculateLevel(1980)).toBe(10)
    })
    it('caps at levelCap', () => {
      expect(calculateLevel(10_000_000)).toBe(100)
      expect(calculateLevel(10_000_000, 100, 30, 50)).toBe(50)
    })
    it('is consistent with xpForLevel for every level up to cap', () => {
      for (let n = 1; n <= 100; n++) {
        expect(calculateLevel(xpForLevel(n))).toBe(n)
        if (n > 1) expect(calculateLevel(xpForLevel(n) - 1)).toBe(n - 1)
      }
    })
  })

  describe('levelAfterXpGain', () => {
    it('suit la courbe quand le niveau monte', () => {
      expect(levelAfterXpGain(2, 230, 100, 30, 100)).toBe(3)
    })

    it('rend le niveau stocké quand rien ne change', () => {
      expect(levelAfterXpGain(3, 230, 100, 30, 100)).toBe(3)
    })

    // Un durcissement de `xp.base`/`xp.slope` recalcule un niveau PLUS BAS
    // pour la même XP. Comme `skillPointsGained` compare au niveau STOCKÉ, un
    // niveau qui redescend fait regagner au joueur les points déjà dépensés en
    // remontant — d'où le plancher.
    it('ne redescend jamais sous le niveau déjà atteint', () => {
      const xp = xpForLevel(30, 100, 44)
      expect(calculateLevel(xp, 500, 220, 100)).toBeLessThan(30)
      expect(levelAfterXpGain(30, xp, 500, 220, 100)).toBe(30)
    })

    it('respecte le plafond de niveau', () => {
      expect(levelAfterXpGain(1, 10_000_000, 100, 30, 50)).toBe(50)
    })
  })
})
