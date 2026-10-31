import { describe, expect, it } from '@jest/globals'

import { isAstralElement } from '../../main/domain/gacha/card-pools'

describe('isAstralElement', () => {
  it('LIGHT est astral', () => {
    expect(isAstralElement('LIGHT')).toBe(true)
  })

  it('DARK est astral', () => {
    expect(isAstralElement('DARK')).toBe(true)
  })

  it('FIRE n’est pas astral', () => {
    expect(isAstralElement('FIRE')).toBe(false)
  })

  it('null n’est pas astral', () => {
    expect(isAstralElement(null)).toBe(false)
  })

  it('undefined n’est pas astral', () => {
    expect(isAstralElement(undefined)).toBe(false)
  })
})
