import { describe, expect, it } from '@jest/globals'

import {
  applyTeamXp,
  hueFromName,
  perkEffect,
  roleLabel,
  xpForTeamLevel,
} from '../../main/domain/team-progression/team-progression-rules'

describe('xpForTeamLevel', () => {
  it('reproduit les valeurs de contrôle de la spec', () => {
    expect(xpForTeamLevel(1, 175, 1.6)).toBe(175)
    expect(xpForTeamLevel(5, 175, 1.6)).toBe(2298)
    expect(xpForTeamLevel(10, 175, 1.6)).toBe(6967)
    expect(xpForTeamLevel(14, 175, 1.6)).toBe(11936)
    expect(xpForTeamLevel(20, 175, 1.6)).toBe(21120)
  })
})

describe('applyTeamXp', () => {
  const cfg = { xpBase: 175, xpExp: 1.6, maxLevel: 50 }

  it("accumule sans monter tant que le seuil n'est pas atteint", () => {
    expect(applyTeamXp({ level: 1, xp: 0 }, 100, cfg)).toEqual({
      level: 1,
      xp: 100,
      perkPointsGained: 0,
    })
  })

  it("monte d'un niveau et retranche le seuil", () => {
    expect(applyTeamXp({ level: 1, xp: 100 }, 100, cfg)).toEqual({
      level: 2,
      xp: 25,
      perkPointsGained: 1,
    })
  })

  it('monte de PLUSIEURS niveaux en un seul appel et cree autant de points', () => {
    // 175 (n1) + 531 (n2) + 1015 (n3) = 1721 pour atteindre le niveau 4
    expect(applyTeamXp({ level: 1, xp: 0 }, 1721, cfg)).toEqual({
      level: 4,
      xp: 0,
      perkPointsGained: 3,
    })
  })

  it("plafonne au niveau maximum et fige l'XP a 0", () => {
    expect(applyTeamXp({ level: 50, xp: 0 }, 999999, cfg)).toEqual({
      level: 50,
      xp: 0,
      perkPointsGained: 0,
    })
  })
})

describe('perkEffect', () => {
  it('la cadence de raid donne une attaque tous les deux rangs', () => {
    expect(perkEffect('raid', 0, 0.5)).toBe(0)
    expect(perkEffect('raid', 1, 0.5)).toBe(0)
    expect(perkEffect('raid', 2, 0.5)).toBe(1)
    expect(perkEffect('raid', 5, 0.5)).toBe(2)
  })

  it('les bonus en pourcentage sont lineaires', () => {
    expect(perkEffect('loot', 5, 0.5)).toBeCloseTo(2.5, 6)
    expect(perkEffect('xp', 5, 0.8)).toBeCloseTo(4, 6)
    expect(perkEffect('forge', 5, 1)).toBeCloseTo(5, 6)
  })
})

describe('roleLabel', () => {
  const now = new Date('2026-09-10T12:00:00Z')
  const days = (n: number) => new Date(now.getTime() - n * 86_400_000)

  it("Chef et Officier ne dependent pas de l'anciennete", () => {
    expect(roleLabel('OWNER', days(0), now, 7)).toBe('Chef')
    expect(roleLabel('ADMIN', days(0), now, 7)).toBe('Officier')
  })

  it('bascule Recrue -> Membre exactement au seuil', () => {
    expect(roleLabel('MEMBER', days(6), now, 7)).toBe('Recrue')
    expect(roleLabel('MEMBER', days(7), now, 7)).toBe('Membre')
  })
})
