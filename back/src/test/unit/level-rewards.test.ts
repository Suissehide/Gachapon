import { describe, expect, it } from '@jest/globals'

import {
  milestonesCrossed,
  skillPointsGained,
} from '../../main/domain/shared/level-rewards'

describe('level-rewards', () => {
  describe('skillPointsGained', () => {
    it('1 point par niveau gagné', () => {
      expect(skillPointsGained(1, 2)).toBe(1)
      expect(skillPointsGained(3, 7)).toBe(4)
    })
    it('+2 par palier franchi (10/25/50/75/100)', () => {
      expect(skillPointsGained(9, 10)).toBe(1 + 2)
      expect(skillPointsGained(9, 26)).toBe(17 + 4) // paliers 10 et 25
      expect(skillPointsGained(99, 100)).toBe(1 + 2)
    })
    it('0 si pas de level-up', () => {
      expect(skillPointsGained(5, 5)).toBe(0)
    })
  })

  describe('milestonesCrossed', () => {
    it('retourne les packs des paliers franchis, bornes (old, new]', () => {
      expect(milestonesCrossed(9, 10)).toEqual([
        { level: 10, bonusPoints: 2, tokens: 5, dust: 100 },
      ])
      expect(milestonesCrossed(10, 11)).toEqual([])
      expect(milestonesCrossed(24, 51).map((m) => m.level)).toEqual([25, 50])
    })
    it('pack du niveau 100', () => {
      expect(milestonesCrossed(99, 100)).toEqual([
        { level: 100, bonusPoints: 2, tokens: 30, dust: 3000 },
      ])
    })
  })
})
