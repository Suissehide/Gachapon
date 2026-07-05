import { applyCombatBonuses } from '../../main/domain/campaign/campaign.domain'

describe('applyCombatBonuses', () => {
  it('applique les trois bonus', () => {
    const out = applyCombatBonuses(
      { gold: 100, xp: 10, equipmentDropChance: 0.2, cardChance: 0.01 },
      { goldBonus: 30, combatXpBonus: 10, dropBonus: 100 },
    )
    expect(out).toEqual({ gold: 130, xp: 11, equipmentDropChance: 0.4, cardChance: 0.02 })
  })
  it('cap des chances à 1', () => {
    const out = applyCombatBonuses(
      { gold: 0, xp: 0, equipmentDropChance: 0.8, cardChance: 0 },
      { goldBonus: 0, combatXpBonus: 0, dropBonus: 100 },
    )
    expect(out.equipmentDropChance).toBe(1)
  })
  it('neutre = identité', () => {
    const loot = { gold: 100, xp: 10, equipmentDropChance: 0.2, cardChance: 0.01 }
    expect(applyCombatBonuses(loot, { goldBonus: 0, combatXpBonus: 0, dropBonus: 0 })).toEqual(loot)
  })
})
