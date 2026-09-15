import { applyCombatBonuses } from '../../main/domain/campaign/campaign.domain'

describe('applyCombatBonuses', () => {
  it('applique les trois bonus', () => {
    const out = applyCombatBonuses(
      { gold: 100, xp: 10, equipmentDropChance: 0.2, cardChance: 0.01 },
      { goldBonus: 30, combatXpBonus: 10, dropBonus: 100 },
    )
    expect(out).toEqual({ gold: 130, xp: 11, equipmentDropChance: 0.4, cardChance: 0.01 })
  })
  it('cap des chances à 1', () => {
    const out = applyCombatBonuses(
      { gold: 0, xp: 0, equipmentDropChance: 0.8, cardChance: 0 },
      { goldBonus: 0, combatXpBonus: 0, dropBonus: 100 },
    )
    expect(out.equipmentDropChance).toBe(1)
  })
  // `dropBonus` ne porte QUE sur l'équipement : une carte gagnée en combat
  // concurrence directement le gacha (0,20 % de légendaire au tirage), un
  // nœud d'arbre ne doit pas en doubler le débit.
  it('la chance de carte est insensible au bonus de drop', () => {
    for (const dropBonus of [0, 40, 100, 1000]) {
      const out = applyCombatBonuses(
        { gold: 0, xp: 0, equipmentDropChance: 0.2, cardChance: 0.005 },
        { goldBonus: 0, combatXpBonus: 0, dropBonus },
      )
      expect(out.cardChance).toBe(0.005)
    }
  })
  it('neutre = identité', () => {
    const loot = { gold: 100, xp: 10, equipmentDropChance: 0.2, cardChance: 0.01 }
    expect(applyCombatBonuses(loot, { goldBonus: 0, combatXpBonus: 0, dropBonus: 0 })).toEqual(loot)
  })
})
