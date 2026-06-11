import { describe, expect, it } from '@jest/globals'
import { computeStateProgress } from '../../../main/domain/achievements/state-dispatcher'

describe('computeStateProgress', () => {
  it('OWN_RARITY_COUNT EPIC 5 — 3 cartes EPIC possédées → progress 3', () => {
    const result = computeStateProgress(
      { type: 'OWN_RARITY_COUNT', rarity: 'EPIC', threshold: 5 },
      {
        ownedByRarity: { COMMON: 10, UNCOMMON: 5, RARE: 2, EPIC: 3, LEGENDARY: 0 },
        ownedByRarityVariant: {},
        completedCollections: { ALL: false },
        level: 5,
        streakDays: 0,
        machinesOwned: 0,
      },
    )
    expect(result.progress).toBe(3)
    expect(result.unlocked).toBe(false)
  })

  it('OWN_RARITY_COUNT EPIC 5 — 5 possédées → unlocked', () => {
    const result = computeStateProgress(
      { type: 'OWN_RARITY_COUNT', rarity: 'EPIC', threshold: 5 },
      {
        ownedByRarity: { COMMON: 0, UNCOMMON: 0, RARE: 0, EPIC: 5, LEGENDARY: 0 },
        ownedByRarityVariant: {},
        completedCollections: { ALL: false },
        level: 1,
        streakDays: 0,
        machinesOwned: 0,
      },
    )
    expect(result.unlocked).toBe(true)
    expect(result.progress).toBe(5)
  })

  it('OWN_RARITY_COUNT variant seul (BRILLIANT) — somme toutes raretés', () => {
    const result = computeStateProgress(
      { type: 'OWN_RARITY_COUNT', variant: 'BRILLIANT', threshold: 5 },
      {
        ownedByRarity: { COMMON: 0, UNCOMMON: 0, RARE: 0, EPIC: 0, LEGENDARY: 0 },
        ownedByRarityVariant: {
          COMMON_BRILLIANT: 3,
          RARE_BRILLIANT: 2,
          EPIC_NORMAL: 1,
        },
        completedCollections: { ALL: false },
        level: 1,
        streakDays: 0,
        machinesOwned: 0,
      },
    )
    expect(result.progress).toBe(5)
    expect(result.unlocked).toBe(true)
  })

  it('OWN_RARITY_COUNT EPIC HOLOGRAPHIC 1 — 1 EPIC HOLO → unlocked', () => {
    const result = computeStateProgress(
      { type: 'OWN_RARITY_COUNT', rarity: 'EPIC', variant: 'HOLOGRAPHIC', threshold: 1 },
      {
        ownedByRarity: { COMMON: 0, UNCOMMON: 0, RARE: 0, EPIC: 1, LEGENDARY: 0 },
        ownedByRarityVariant: { 'EPIC_HOLOGRAPHIC': 1 },
        completedCollections: { ALL: false },
        level: 1,
        streakDays: 0,
        machinesOwned: 0,
      },
    )
    expect(result.unlocked).toBe(true)
  })

  it('COLLECTION_COMPLETE ALL — false', () => {
    const result = computeStateProgress(
      { type: 'COLLECTION_COMPLETE', scope: 'ALL' },
      {
        ownedByRarity: { COMMON: 0, UNCOMMON: 0, RARE: 0, EPIC: 0, LEGENDARY: 0 },
        ownedByRarityVariant: {},
        completedCollections: { ALL: false },
        level: 1,
        streakDays: 0,
        machinesOwned: 0,
      },
    )
    expect(result.unlocked).toBe(false)
    expect(result.progress).toBe(0)
  })

  it('LEVEL_REACHED 10 — level 10 → unlocked', () => {
    const result = computeStateProgress(
      { type: 'LEVEL_REACHED', threshold: 10 },
      {
        ownedByRarity: { COMMON: 0, UNCOMMON: 0, RARE: 0, EPIC: 0, LEGENDARY: 0 },
        ownedByRarityVariant: {},
        completedCollections: { ALL: false },
        level: 10,
        streakDays: 0,
        machinesOwned: 0,
      },
    )
    expect(result.unlocked).toBe(true)
  })

  it('STREAK_REACHED 30 — 30 jours → unlocked', () => {
    const result = computeStateProgress(
      { type: 'STREAK_REACHED', threshold: 30 },
      {
        ownedByRarity: { COMMON: 0, UNCOMMON: 0, RARE: 0, EPIC: 0, LEGENDARY: 0 },
        ownedByRarityVariant: {},
        completedCollections: { ALL: false },
        level: 1,
        streakDays: 30,
        machinesOwned: 0,
      },
    )
    expect(result.unlocked).toBe(true)
  })

  it('MACHINES_OWNED 2 — 1 possédée → progress 1, not unlocked', () => {
    const result = computeStateProgress(
      { type: 'MACHINES_OWNED', threshold: 2 },
      {
        ownedByRarity: { COMMON: 0, UNCOMMON: 0, RARE: 0, EPIC: 0, LEGENDARY: 0 },
        ownedByRarityVariant: {},
        completedCollections: { ALL: false },
        level: 1,
        streakDays: 0,
        machinesOwned: 1,
      },
    )
    expect(result.progress).toBe(1)
    expect(result.unlocked).toBe(false)
  })
})
