import { describe, expect, it } from '@jest/globals'

import {
  CAMPAIGN_TEAM_KEY,
  COMBAT_TEAM_KEYS,
  RAID_TEAM_KEY,
  towerTeamKey,
} from '../../main/domain/combat/combat-team-keys'
import { TOWER_ELEMENTS } from '../../main/domain/tower/tower-slots'

describe('combat team keys', () => {
  it('expose exactement six clés, toutes distinctes', () => {
    expect(COMBAT_TEAM_KEYS).toHaveLength(6)
    expect(new Set(COMBAT_TEAM_KEYS).size).toBe(6)
  })

  it('contient la campagne et le raid', () => {
    expect(COMBAT_TEAM_KEYS).toContain(CAMPAIGN_TEAM_KEY)
    expect(COMBAT_TEAM_KEYS).toContain(RAID_TEAM_KEY)
  })

  // Garde-fou : le jour où une cinquième tour arrive, ce test tombe au lieu
  // de laisser cette tour sans mémoire d'équipe.
  it('donne une clé à chaque élément de tour', () => {
    for (const element of TOWER_ELEMENTS) {
      expect(COMBAT_TEAM_KEYS).toContain(towerTeamKey(element))
    }
  })

  it('préfixe les clés de tour pour les distinguer des autres modes', () => {
    expect(towerTeamKey('FIRE')).toBe('tower:FIRE')
  })
})
