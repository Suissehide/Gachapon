import { describe, expect, it } from '@jest/globals'

import { CAMPAIGN_TEAM_KEY } from '../../main/domain/combat/combat-team-keys'
import { pickTeam } from '../../main/domain/combat/resolve-combat-team'

const TOWER_FIRE = 'tower:FIRE'

describe('pickTeam', () => {
  it('rend la ligne du mode quand elle existe et porte des cartes', () => {
    expect(
      pickTeam(TOWER_FIRE, { userCardIds: ['a', 'b'] }, { userCardIds: ['c'] }),
    ).toEqual({ userCardIds: ['a', 'b'], inherited: false })
  })

  it('retombe sur la campagne quand le mode n\'a pas de ligne', () => {
    expect(pickTeam(TOWER_FIRE, null, { userCardIds: ['c'] })).toEqual({
      userCardIds: ['c'],
      inherited: true,
    })
  })

  it('retombe sur la campagne quand la ligne du mode est vide', () => {
    expect(
      pickTeam(TOWER_FIRE, { userCardIds: [] }, { userCardIds: ['c'] }),
    ).toEqual({ userCardIds: ['c'], inherited: true })
  })

  it('rend une équipe vide, non héritée, quand rien n\'existe', () => {
    expect(pickTeam(TOWER_FIRE, null, null)).toEqual({
      userCardIds: [],
      inherited: true,
    })
  })

  // La campagne est la racine : elle n'hérite de personne, même vide.
  it('ne marque jamais la campagne comme héritée', () => {
    expect(pickTeam(CAMPAIGN_TEAM_KEY, null, null)).toEqual({
      userCardIds: [],
      inherited: false,
    })
    expect(
      pickTeam(CAMPAIGN_TEAM_KEY, { userCardIds: ['c'] }, { userCardIds: ['c'] }),
    ).toEqual({ userCardIds: ['c'], inherited: false })
  })
})
