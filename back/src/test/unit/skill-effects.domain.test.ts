import { describe, expect, it } from '@jest/globals'
import { getSkillEffects } from '../../main/domain/skills/skill-effects.domain'

describe('getSkillEffects', () => {
  it('retourne les valeurs neutres si aucun nœud', () => {
    const effects = getSkillEffects([])
    expect(effects.regenReductionMinutes).toBe(0)
    expect(effects.luckMultiplier).toBe(1.0)
    expect(effects.dustHarvestMultiplier).toBe(1.0)
    expect(effects.tokenVaultBonus).toBe(0)
    expect(effects.freePullChance).toBe(0)
    expect(effects.multiTokenChance).toBe(0)
    expect(effects.goldenBallChance).toBe(0)
    expect(effects.shopDiscount).toBe(0)
  })

  it('REGEN : additionne les effets en minutes', () => {
    const effects = getSkillEffects([
      { effectType: 'REGEN', effect: 2 },
      { effectType: 'REGEN', effect: 4 },
    ])
    expect(effects.regenReductionMinutes).toBe(6)
  })

  it('TOKEN_VAULT : additionne les bonus', () => {
    const effects = getSkillEffects([{ effectType: 'TOKEN_VAULT', effect: 10 }])
    expect(effects.tokenVaultBonus).toBe(10)
  })

  it('LUCK : luckMultiplier = 1 + somme des effets', () => {
    const effects = getSkillEffects([
      { effectType: 'LUCK', effect: 0.1 },
      { effectType: 'LUCK', effect: 0.25 },
    ])
    expect(effects.luckMultiplier).toBeCloseTo(1.35)
  })

  it('DUST_HARVEST : dustHarvestMultiplier = 1 + somme des effets', () => {
    const effects = getSkillEffects([{ effectType: 'DUST_HARVEST', effect: 0.5 }])
    expect(effects.dustHarvestMultiplier).toBeCloseTo(1.5)
  })

  it('FREE_PULL_CHANCE : additionne les probabilités', () => {
    const effects = getSkillEffects([
      { effectType: 'FREE_PULL_CHANCE', effect: 0.02 },
      { effectType: 'FREE_PULL_CHANCE', effect: 0.06 },
    ])
    expect(effects.freePullChance).toBeCloseTo(0.08)
  })

  it('MULTI_TOKEN_CHANCE : additionne les probabilités', () => {
    const effects = getSkillEffects([{ effectType: 'MULTI_TOKEN_CHANCE', effect: 0.2 }])
    expect(effects.multiTokenChance).toBeCloseTo(0.2)
  })

  it('GOLDEN_BALL_CHANCE : additionne les probabilités', () => {
    const effects = getSkillEffects([{ effectType: 'GOLDEN_BALL_CHANCE', effect: 0.15 }])
    expect(effects.goldenBallChance).toBeCloseTo(0.15)
  })

  it('SHOP_DISCOUNT : additionne les réductions', () => {
    const effects = getSkillEffects([{ effectType: 'SHOP_DISCOUNT', effect: 0.1 }])
    expect(effects.shopDiscount).toBeCloseTo(0.1)
  })

  it('combine plusieurs types différents', () => {
    const effects = getSkillEffects([
      { effectType: 'REGEN', effect: 2 },
      { effectType: 'LUCK', effect: 0.1 },
      { effectType: 'FREE_PULL_CHANCE', effect: 0.04 },
    ])
    expect(effects.regenReductionMinutes).toBe(2)
    expect(effects.luckMultiplier).toBeCloseTo(1.1)
    expect(effects.freePullChance).toBeCloseTo(0.04)
    expect(effects.dustHarvestMultiplier).toBe(1.0)
  })
})
