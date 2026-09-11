import { describe, expect, it } from '@jest/globals'

import {
  applyTeamXp,
  grantablePerkPoints,
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
    expect(perkEffect('raid', 0, 0.5, 2)).toBe(0)
    expect(perkEffect('raid', 1, 0.5, 2)).toBe(0)
    expect(perkEffect('raid', 2, 0.5, 2)).toBe(1)
  })

  it('les bonus en pourcentage sont lineaires', () => {
    expect(perkEffect('loot', 5, 0.5, 5)).toBeCloseTo(2.5, 6)
    expect(perkEffect('xp', 5, 0.8, 5)).toBeCloseTo(4, 6)
    expect(perkEffect('forge', 5, 1, 5)).toBeCloseTo(5, 6)
  })

  // Le plafond de `raid` est passe de 5 a 2. Une equipe qui avait deja
  // investi 5 rangs garde la ligne en base : sans ce bornage elle
  // encaisserait encore +2 attaques, un rang que plus personne ne peut
  // acheter. Le plafond doit mordre a la LECTURE de l'effet, pas seulement
  // au moment de la depense.
  it('borne un rang herite au-dessus du plafond courant', () => {
    expect(perkEffect('raid', 5, 0.5, 2)).toBe(1)
    expect(perkEffect('loot', 9, 0.5, 5)).toBeCloseTo(2.5, 6)
  })

  it('ne rend jamais un effet negatif sur un rang aberrant', () => {
    expect(perkEffect('raid', -3, 0.5, 2)).toBe(0)
    expect(perkEffect('forge', -1, 1, 5)).toBe(0)
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

describe('hueFromName', () => {
  // La tache 7 s'en sert comme repli garanti pour toute equipe sans `hue`
  // explicite en base : la teinte doit donc etre TOUJOURS valide et TOUJOURS
  // la meme pour un nom donne, sinon l'embleme changerait de couleur d'un
  // rendu a l'autre.
  it('reste dans la plage exploitable par hsl(), bornes comprises', () => {
    const noms = ['', 'A', 'DeepLabCut', 'Nuit Blanche', 'Équipe 🐙', 'z'.repeat(200)]
    for (const nom of noms) {
      const hue = hueFromName(nom)
      expect(Number.isInteger(hue)).toBe(true)
      expect(hue).toBeGreaterThanOrEqual(0)
      expect(hue).toBeLessThan(360)
    }
  })

  it('est deterministe : deux appels sur le meme nom donnent la meme teinte', () => {
    expect(hueFromName('DeepLabCut')).toBe(hueFromName('DeepLabCut'))
  })

  it('distingue deux noms proches', () => {
    expect(hueFromName('DeepLabCut')).not.toBe(hueFromName('DeepLabCue'))
  })

  it('accepte une chaine vide sans exploser', () => {
    expect(hueFromName('')).toBe(0)
  })
})

describe('grantablePerkPoints', () => {
  // loot 5 + raid 2 + xp 5 + forge 5 = 17 rangs a remplir, pour 49 points
  // distribues par la courbe de niveau (1 -> 50). Le surplus ne doit jamais
  // etre credite. La capacite arrive en TOTAL : depuis que `raid` plafonne
  // plus bas que les trois autres, il n'y a plus de plafond commun.
  const CAPACITY = 17

  it('credite tout tant que la capacite le permet', () => {
    expect(grantablePerkPoints(1, 0, 0, CAPACITY)).toBe(1)
    expect(grantablePerkPoints(3, 2, 5, CAPACITY)).toBe(3)
  })

  it('ne credite plus rien quand tous les rangs sont investis', () => {
    expect(grantablePerkPoints(1, 0, 17, CAPACITY)).toBe(0)
    expect(grantablePerkPoints(7, 0, 17, CAPACITY)).toBe(0)
  })

  it('compte les points DEJA EN MAIN dans la capacite restante', () => {
    // 17 rangs, 9 investis, 8 points en attente : plus rien a promettre.
    expect(grantablePerkPoints(1, 8, 9, CAPACITY)).toBe(0)
    // Un rang de moins investi : exactement un point de place.
    expect(grantablePerkPoints(3, 8, 8, CAPACITY)).toBe(1)
  })

  it('tronque une montee multi-niveaux a la place disponible', () => {
    // Quatre niveaux d'un coup, deux rangs libres : deux points.
    expect(grantablePerkPoints(4, 0, 15, CAPACITY)).toBe(2)
  })

  it("ne rend jamais un nombre negatif, meme sur un etat incoherent", () => {
    // Etat impossible en fonctionnement normal (points herites d'avant le
    // plafonnement) : on n'en retire pas non plus.
    expect(grantablePerkPoints(2, 25, 17, CAPACITY)).toBe(0)
  })

  it('suit la capacite passee, pas une constante ecrite ici', () => {
    expect(grantablePerkPoints(1, 0, 12, 12)).toBe(0)
    expect(grantablePerkPoints(1, 0, 11, 12)).toBe(1)
  })
})
