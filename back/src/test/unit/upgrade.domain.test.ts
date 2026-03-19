import { describe, expect, it } from '@jest/globals'
import { getUpgradeEffectsFromRows } from '../../main/domain/economy/upgrade.domain'

describe('getUpgradeEffectsFromRows', () => {
  it('retourne les valeurs neutres si aucune ligne', () => {
    const effects = getUpgradeEffectsFromRows([])
    expect(effects.regenReductionMinutes).toBe(0)
    expect(effects.luckMultiplier).toBe(1.0)
    expect(effects.dustHarvestMultiplier).toBe(1.0)
    expect(effects.tokenVaultBonus).toBe(0)
  })

  it('retourne regenReductionMinutes pour REGEN level 2 (effect=30)', () => {
    const effects = getUpgradeEffectsFromRows([
      { type: 'REGEN', level: 2, effect: 30, dustCost: 5000 },
    ])
    expect(effects.regenReductionMinutes).toBe(30)
  })

  it('retourne luckMultiplier pour LUCK level 1 (effect=1.05)', () => {
    const effects = getUpgradeEffectsFromRows([
      { type: 'LUCK', level: 1, effect: 1.05, dustCost: 2000 },
    ])
    expect(effects.luckMultiplier).toBe(1.05)
  })

  it('retourne dustHarvestMultiplier pour DUST_HARVEST level 3 (effect=2.0)', () => {
    const effects = getUpgradeEffectsFromRows([
      { type: 'DUST_HARVEST', level: 3, effect: 2.0, dustCost: 25000 },
    ])
    expect(effects.dustHarvestMultiplier).toBe(2.0)
  })

  it('retourne tokenVaultBonus pour TOKEN_VAULT level 4 (effect=25)', () => {
    const effects = getUpgradeEffectsFromRows([
      { type: 'TOKEN_VAULT', level: 4, effect: 25, dustCost: 50000 },
    ])
    expect(effects.tokenVaultBonus).toBe(25)
  })

  it('combine plusieurs upgrades', () => {
    const effects = getUpgradeEffectsFromRows([
      { type: 'REGEN', level: 1, effect: 15, dustCost: 1000 },
      { type: 'TOKEN_VAULT', level: 2, effect: 10, dustCost: 4000 },
    ])
    expect(effects.regenReductionMinutes).toBe(15)
    expect(effects.tokenVaultBonus).toBe(10)
    expect(effects.luckMultiplier).toBe(1.0)
  })
})
