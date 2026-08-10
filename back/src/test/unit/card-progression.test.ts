import {
  MAX_PALIER,
  maxLevelInPalier,
} from '../../main/domain/card-leveling/card-leveling.domain'

describe('plafond de progression des cartes', () => {
  it('le palier maximum est 7', () => {
    expect(MAX_PALIER).toBe(7)
  })

  it('le niveau maximum atteignable est 70', () => {
    expect(maxLevelInPalier(MAX_PALIER)).toBe(70)
  })
})
