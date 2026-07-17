import { describe, expect, it } from '@jest/globals'
import { applyPercentDiscount } from '../../main/domain/shared/discount'

describe('applyPercentDiscount', () => {
  it('applique le pourcentage avec arrondi', () => {
    expect(applyPercentDiscount(1000, 15)).toBe(850)
    expect(applyPercentDiscount(4500, 10)).toBe(4050)
    expect(applyPercentDiscount(333, 5)).toBe(316)
  })
  it('0 % = prix inchangé', () => {
    expect(applyPercentDiscount(810, 0)).toBe(810)
  })
  it('ne descend jamais sous zéro et clampe les % hors bornes', () => {
    expect(applyPercentDiscount(100, 150)).toBe(0)
    expect(applyPercentDiscount(100, -10)).toBe(100)
  })
})
