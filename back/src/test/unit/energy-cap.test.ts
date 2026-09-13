import { describe, expect, it } from '@jest/globals'
import { effectiveEnergyDailyCap } from '../../main/domain/shop/energy-cap'

describe('effectiveEnergyDailyCap', () => {
  it('sans compétence, le cap est celui de la config', () => {
    expect(effectiveEnergyDailyCap(3, 0)).toBe(3)
  })

  it('la compétence Opulence ajoute ses paliers au cap', () => {
    expect(effectiveEnergyDailyCap(3, 3)).toBe(6)
  })

  it('ne descend jamais sous zéro', () => {
    expect(effectiveEnergyDailyCap(0, -5)).toBe(0)
  })
})
