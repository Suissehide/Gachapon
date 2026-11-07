import { describe, expect, it } from '@jest/globals'

import {
  campaignProfile,
  endgameProfileAt,
  endgameSteps,
  referenceTeam,
  towerFloorProfile,
} from '../../../prisma/seed/balance-calibration'

const team = (p: Parameters<typeof referenceTeam>[0]) =>
  referenceTeam(p, { element: 'WATER', seed: 7 })

describe('profil de référence carte par carte', () => {
  it('trois cartes explicites EPIC n70 = le profil en bloc équivalent', () => {
    const bloc = { ...towerFloorProfile(10), level: 70, cardRarity: 'EPIC' as const }
    const cartes = {
      ...bloc,
      cards: [0, 1, 2].map(() => ({ rarity: 'EPIC' as const, level: 70 })),
    }
    expect(team(cartes)).toEqual(team(bloc))
  })

  it('le palier de chaque carte suit son propre niveau', () => {
    const p = {
      ...towerFloorProfile(10),
      cards: [
        { rarity: 'LEGENDARY' as const, level: 30 },
        { rarity: 'EPIC' as const, level: 70 },
        { rarity: 'EPIC' as const, level: 70 },
      ],
    }
    const [a, b] = team(p)
    expect(a?.palier).toBe(3)
    expect(b?.palier).toBe(7)
  })
})

describe('chemin de fin de jeu', () => {
  const departs = {
    campagne: campaignProfile(15, 10),
    tour: towerFloorProfile(10),
  }

  it('6 étapes de cartes + 7 pièces, en campagne comme en tour', () => {
    expect(endgameSteps(departs.campagne)).toHaveLength(13)
    expect(endgameSteps(departs.tour)).toHaveLength(13)
  })

  it('les étapes de cartes passent par la légendaire n60 puis n70', () => {
    const cartes = endgameSteps(departs.tour).filter((s) => s.kind === 'card')
    expect(cartes.map((s) => [s.slot, s.level])).toEqual([
      [0, 60],
      [1, 60],
      [2, 60],
      [0, 70],
      [1, 70],
      [2, 70],
    ])
  })

  it('la première étape est une pièce', () => {
    expect(endgameSteps(departs.campagne)[0]?.kind).toBe('piece')
  })

  it.each(Object.entries(departs))(
    '%s : toutes les étapes mènent à 3 légendaires n70 et 7 pièces légendaires n12',
    (_, depart) => {
      const fin = endgameProfileAt(depart, endgameSteps(depart).length, 0.7)
      expect(fin.cards).toEqual(
        [0, 1, 2].map(() => ({ rarity: 'LEGENDARY', level: 70 })),
      )
      expect(fin.pieces).toEqual(
        Array.from({ length: 7 }, () => ({ rarity: 'LEGENDARY', level: 12 })),
      )
      expect(fin.target).toBe(0.7)
    },
  )

  it.each(Object.entries(departs))(
    '%s : zéro étape = le joueur de départ',
    (_, depart) => {
      expect(team(endgameProfileAt(depart, 0, depart.target))).toEqual(
        team(depart),
      )
    },
  )
})
