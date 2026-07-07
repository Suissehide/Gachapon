import { extractRewardPreview } from '../../main/domain/campaign/campaign.domain'

const normalLoot = {
  firstClear: {
    gold: 230,
    dust: 55,
    xp: 33,
    guaranteedEquipment: { minRarity: 'COMMON' },
  },
  farm: {
    gold: 50,
    dust: 4,
    xp: 6,
    equipmentDropChance: 0.15,
    equipmentWeights: { COMMON: 80, UNCOMMON: 20 },
    cardChance: 0.005,
  },
}

const bossLoot = {
  firstClear: {
    gold: 5000,
    dust: 1000,
    xp: 200,
    guaranteedEquipment: { minRarity: 'RARE' },
    guaranteedCard: { minRarity: 'EPIC' },
  },
  farm: {
    gold: 150,
    dust: 15,
    xp: 20,
    equipmentDropChance: 0.3,
    equipmentWeights: { UNCOMMON: 40, RARE: 40, EPIC: 18, LEGENDARY: 2 },
    cardChance: 0.02,
  },
}

describe('extractRewardPreview', () => {
  describe('lootTable normal (stage 1-1)', () => {
    it('retourne les montants firstClear corrects', () => {
      const preview = extractRewardPreview(normalLoot)
      expect(preview.firstClear).toEqual({ gold: 230, dust: 55, xp: 33 })
    })

    it('retourne les montants farm corrects', () => {
      const preview = extractRewardPreview(normalLoot)
      expect(preview.farm).toEqual({ gold: 50, dust: 4, xp: 6 })
    })

    it('retourne les chances de drop farm', () => {
      const preview = extractRewardPreview(normalLoot)
      expect(preview.farmEquipmentChance).toBe(0.15)
      expect(preview.farmCardChance).toBe(0.005)
    })

    it('guaranteedEquipment vrai, guaranteedCard faux', () => {
      const preview = extractRewardPreview(normalLoot)
      expect(preview.guaranteedEquipment).toBe(true)
      expect(preview.guaranteedCard).toBe(false)
    })
  })

  describe('lootTable boss (chapter boss avec guaranteedCard)', () => {
    it('retourne les montants firstClear corrects', () => {
      const preview = extractRewardPreview(bossLoot)
      expect(preview.firstClear).toEqual({ gold: 5000, dust: 1000, xp: 200 })
    })

    it('retourne les montants farm corrects', () => {
      const preview = extractRewardPreview(bossLoot)
      expect(preview.farm).toEqual({ gold: 150, dust: 15, xp: 20 })
    })

    it('retourne les chances de drop farm du boss', () => {
      const preview = extractRewardPreview(bossLoot)
      expect(preview.farmEquipmentChance).toBe(0.3)
      expect(preview.farmCardChance).toBe(0.02)
    })

    it('guaranteedEquipment et guaranteedCard tous les deux vrais', () => {
      const preview = extractRewardPreview(bossLoot)
      expect(preview.guaranteedEquipment).toBe(true)
      expect(preview.guaranteedCard).toBe(true)
    })
  })

  describe('cas défensifs', () => {
    it('guaranteedCard null → false', () => {
      const loot = { ...normalLoot, firstClear: { ...normalLoot.firstClear, guaranteedCard: null } }
      const preview = extractRewardPreview(loot)
      expect(preview.guaranteedCard).toBe(false)
    })

    it('guaranteedEquipment absent → false', () => {
      const loot = { ...normalLoot, firstClear: { gold: 100, dust: 10, xp: 10 } }
      const preview = extractRewardPreview(loot)
      expect(preview.guaranteedEquipment).toBe(false)
    })
  })
})
