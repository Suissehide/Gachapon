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

  it('LUCK : luckMultiplier = 1 + somme des points de % / 100', () => {
    const effects = getSkillEffects([
      { effectType: 'LUCK', effect: 10 },
      { effectType: 'LUCK', effect: 25 },
    ])
    expect(effects.luckMultiplier).toBeCloseTo(1.35)
  })

  it('DUST_HARVEST : dustHarvestMultiplier = 1 + somme des points de % / 100', () => {
    const effects = getSkillEffects([{ effectType: 'DUST_HARVEST', effect: 50 }])
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
      { effectType: 'LUCK', effect: 10 },
      { effectType: 'FREE_PULL_CHANCE', effect: 0.04 },
    ])
    expect(effects.regenReductionMinutes).toBe(2)
    expect(effects.luckMultiplier).toBeCloseTo(1.1)
    expect(effects.freePullChance).toBeCloseTo(0.04)
    expect(effects.dustHarvestMultiplier).toBe(1.0)
  })
})

describe('skill-effects aggregation v2', () => {
  it('neutral has all new fields at neutral values', () => {
    const fx = getSkillEffects([])
    expect(fx.pullXpBonus).toBe(0)
    expect(fx.pityReduction).toBe(0)
    expect(fx.variantLuckMultiplier).toBe(1.0)
    expect(fx.dailyShopSlots).toBe(0)
    expect(fx.wishlistCooldownReductionDays).toBe(0)
    expect(fx.pcVaultBonus).toBe(0)
    expect(fx.pcRegenReductionSeconds).toBe(0)
    expect(fx.sweepCostReduction).toBe(0)
    expect(fx.goldBonus).toBe(0)
    expect(fx.combatXpBonus).toBe(0)
    expect(fx.dropBonus).toBe(0)
  })
  it('aggregates new effect types additively', () => {
    const fx = getSkillEffects([
      { effectType: 'PULL_XP_BONUS', effect: 10 },
      { effectType: 'PULL_XP_BONUS', effect: 20 },
      { effectType: 'PITY_BOOST', effect: 5 },
      { effectType: 'VARIANT_LUCK', effect: 25 },
      { effectType: 'VARIANT_LUCK', effect: 50 },
      { effectType: 'DAILY_SHOP_SLOT', effect: 1 },
      { effectType: 'PC_VAULT', effect: 10 },
      { effectType: 'PC_REGEN', effect: 120 },
      { effectType: 'SWEEP_COST', effect: 1 },
      { effectType: 'GOLD_BONUS', effect: 30 },
      { effectType: 'COMBAT_XP_BONUS', effect: 10 },
      { effectType: 'DROP_BONUS', effect: 40 },
      { effectType: 'WISHLIST_COOLDOWN', effect: 2 },
    ])
    expect(fx.pullXpBonus).toBe(30)
    expect(fx.pityReduction).toBe(5)
    expect(fx.variantLuckMultiplier).toBe(1.75)
    expect(fx.dailyShopSlots).toBe(1)
    expect(fx.pcVaultBonus).toBe(10)
    expect(fx.pcRegenReductionSeconds).toBe(120)
    expect(fx.sweepCostReduction).toBe(1)
    expect(fx.goldBonus).toBe(30)
    expect(fx.combatXpBonus).toBe(10)
    expect(fx.dropBonus).toBe(40)
    expect(fx.wishlistCooldownReductionDays).toBe(2)
  })
})

describe('skill-effects nouveaux effets Collection', () => {
  it('neutre : nouveaux champs à zéro / 1.0', () => {
    const fx = getSkillEffects([])
    expect(fx.upgradeDustDiscount).toBe(0)
    expect(fx.goldShopDiscount).toBe(0)
    expect(fx.dailyShopLuckMultiplier).toBe(1.0)
  })
  it('UPGRADE_DUST_DISCOUNT / GOLD_SHOP_DISCOUNT : additionne les %', () => {
    const fx = getSkillEffects([
      { effectType: 'UPGRADE_DUST_DISCOUNT', effect: 5 },
      { effectType: 'UPGRADE_DUST_DISCOUNT', effect: 10 },
      { effectType: 'GOLD_SHOP_DISCOUNT', effect: 15 },
    ])
    expect(fx.upgradeDustDiscount).toBe(15)
    expect(fx.goldShopDiscount).toBe(15)
  })
  it('DAILY_SHOP_LUCK : multiplicateur = 1 + points de % / 100', () => {
    const fx = getSkillEffects([{ effectType: 'DAILY_SHOP_LUCK', effect: 35 }])
    expect(fx.dailyShopLuckMultiplier).toBeCloseTo(1.35)
  })
})
