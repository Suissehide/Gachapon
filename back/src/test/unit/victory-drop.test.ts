import { describe, expect, it } from '@jest/globals'

import {
  boostRarityWeights,
  rarityShares,
  rollVictoryDrop,
  victoryDropPreview,
} from '../../main/domain/combat/equipment-drop.domain'

const CFG = {
  'loot.equipmentPct': 60,
  'loot.dustPct': 30,
  'loot.dustMult': 3,
  'loot.energyAmount': 10,
}

describe('lot unique d’une victoire de farm', () => {
  it('donne exactement un lot, selon les parts 60 / 30 / 10', () => {
    expect(rollVictoryDrop(40, CFG, () => 0.59)).toEqual({
      equipment: true,
      dust: 0,
      energy: 0,
    })
    expect(rollVictoryDrop(40, CFG, () => 0.6)).toEqual({
      equipment: false,
      dust: 120,
      energy: 0,
    })
    expect(rollVictoryDrop(40, CFG, () => 0.9)).toEqual({
      equipment: false,
      dust: 0,
      energy: 10,
    })
  })

  it('le bonus de drop relève la rareté, pas la part de pièces', () => {
    // Étage 20 d'une tour, bonus max de l'arbre (+40 %) : la plus haute
    // rareté pèse ×1,4, la plus basse ne bouge pas, celle du milieu ×1,2.
    const boosted = boostRarityWeights(
      { RARE: 27, EPIC: 70.5, LEGENDARY: 2.5 },
      40,
    )
    expect(boosted.RARE).toBe(27)
    expect(boosted.EPIC).toBeCloseTo(84.6)
    expect(boosted.LEGENDARY).toBeCloseTo(3.5)
    // En parts : la légendaire reste rare (2,5 % → 3 %).
    expect(rarityShares(boosted)).toEqual({ RARE: 23.5, EPIC: 73.5, LEGENDARY: 3 })
    // Une rareté absente de l'étage le reste.
    expect(boostRarityWeights({ COMMON: 70, UNCOMMON: 30 }, 40)).toEqual({
      COMMON: 70,
      UNCOMMON: 42,
    })
    // Sans bonus, ou avec une seule rareté : identité.
    expect(boostRarityWeights({ RARE: 27, EPIC: 73 }, 0)).toEqual({ RARE: 27, EPIC: 73 })
    expect(boostRarityWeights({ EPIC: 100 }, 40)).toEqual({ EPIC: 100 })
  })

  it('l’aperçu annonce les parts et les montants que le tirage applique', () => {
    expect(victoryDropPreview(40, CFG)).toEqual({
      equipmentPct: 60,
      dustPct: 30,
      dustAmount: 120,
      energyPct: 10,
      energyAmount: 10,
    })
  })
})
